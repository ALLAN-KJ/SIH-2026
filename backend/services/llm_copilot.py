import os
import json
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict

try:
    from groq import Groq
except ImportError:
    Groq = None

router = APIRouter()

class RemediationRequest(BaseModel):
    risk_label: str
    flagged_issues: List[str]
    top_contributing_factors: Dict[str, float]

class RemediationResponse(BaseModel):
    explanation: str
    nist_citation: str
    config_diff: str

import re

def validate_config(config: str) -> bool:
    if not config or not isinstance(config, str):
        return False
        
    config_lower = config.lower()
    
    # Strict allowlist of permitted FIRST TOKENS in any valid Cisco IOS IPsec line
    allowed_keywords = {
        "crypto", "encryption", "hash", "group", "authentication", 
        "lifetime", "proposal", "policy", "set", "match", "exit", 
        "end", "integrity", "prf", "mode", "peer", "version", "address",
        "access-list", "isakmp", "ipsec", "transform-set", "description",
        "permit", "deny"
    }
    
    lines = config.strip().split('\n')
    valid_line_count = 0
    for line in lines:
        line_clean = line.strip().lower()
        if not line_clean or line_clean.startswith('!'):
            continue
            
        tokens = line_clean.split()
        if not tokens:
            continue
            
        if tokens[0] not in allowed_keywords:
            # First token MUST exactly match allowlist
            return False
            
        valid_line_count += 1
        
    if valid_line_count == 0:
        return False
        
    # Explicit denylist of dangerous/destructive commands (acts as a secondary safety net)
    denylist_patterns = [
        r'\berase\b',
        r'\breload\b',
        r'\bformat\b',
        r'\bwrite erase\b',
        r'\bno crypto\b',
        r'\bshutdown\b',
        r'\bdelete\b'
    ]
    
    for pattern in denylist_patterns:
        if re.search(pattern, config_lower):
            return False
            
    return True

def build_prompt(request: RemediationRequest) -> str:
    """Constructs the exact prompt to be sent to the LLM."""
    prompt = f"""
You are a Senior Network Security Engineer. Provide a concise, direct analysis of the following IPsec negotiation. Do not use conversational filler, pleasantries, or hedging. Be direct and authoritative.

Risk Level: {request.risk_label}

Top Contributing Factors (SHAP Values):
{request.top_contributing_factors}

Flagged Issues:
{', '.join(request.flagged_issues)}

Requirements:
1. Provide a brief, authoritative explanation of the vulnerabilities found based on the SHAP values and flagged issues.
2. Provide a direct citation to the relevant NIST SP 800-77 Rev. 1 guidelines.
3. Provide the FINAL remediated Cisco IOS configuration snippet that fixes these specific issues. DO NOT use diff formatting, DO NOT use '+' or '-' prefixes on lines. Provide only plain, valid Cisco IOS IPsec configuration commands.
CRITICAL: You MUST STOP generating configuration after the 'crypto map' section. Do NOT generate any 'interface' assignments, 'ip address', or access-lists. If you generate an 'interface' block, the system will crash.

Only output valid IPsec sections such as:
crypto isakmp policy <number>
...
crypto ipsec transform-set <name> ...
...
crypto map <name> <number> ipsec-isakmp
...

Return ONLY a valid JSON object matching this schema exactly (no markdown formatting around it, just the JSON):
{{
  "explanation": "...",
  "nist_citation": "...",
  "config_diff": "..."
}}
"""
    return prompt

import time
from fastapi import Request

RATE_LIMIT_DB = {}

def check_rate_limit(request: Request, limit: int = 5, window: int = 60):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    if client_ip not in RATE_LIMIT_DB:
        RATE_LIMIT_DB[client_ip] = []
        
    RATE_LIMIT_DB[client_ip] = [t for t in RATE_LIMIT_DB[client_ip] if now - t < window]
    
    if len(RATE_LIMIT_DB[client_ip]) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
        
    RATE_LIMIT_DB[client_ip].append(now)

from starlette.concurrency import run_in_threadpool

import logging

logger = logging.getLogger(__name__)

@router.post("/remediate", response_model=RemediationResponse)
async def remediate_ipsec(request_data: RemediationRequest, request: Request):
    check_rate_limit(request, limit=5, window=60)
    
    if not request_data.flagged_issues:
        return RemediationResponse(
            explanation="No security issues detected. This configuration meets current best practices for strong cryptography.",
            nist_citation="N/A",
            config_diff="! No remediation necessary. Configuration is secure."
        )
        
    prompt = build_prompt(request_data)
    api_key = os.environ.get("GROQ_API_KEY")
    
    fallback_response = RemediationResponse(
        explanation="Remediation unavailable: API call failed, timed out, or key is missing.",
        nist_citation="N/A",
        config_diff="! No configuration available"
    )

    if not api_key or not Groq:
        logger.warning("LLM FALLBACK TRIGGERED: API key missing or Groq not imported.")
        return fallback_response

    client = Groq(api_key=api_key)
    
    max_retries = 2
    for attempt in range(max_retries):
        try:
            chat_completion = await run_in_threadpool(
                client.chat.completions.create,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert cybersecurity engineer. Return ONLY raw valid JSON.",
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model="qwen/qwen3.8-27b",
                temperature=0.1,
                max_tokens=1024,
            )
            
            response_text = chat_completion.choices[0].message.content.strip()
            
            # Robust JSON extraction via regex
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                response_text = json_match.group(0)
                
            parsed = json.loads(response_text)
            config_diff = parsed.get("config_diff", "")
            
            if not validate_config(config_diff):
                print(f"Config validation failed on attempt {attempt + 1}. Diff was:\n{config_diff}")
                if attempt == max_retries - 1:
                    logger.warning("LLM FALLBACK TRIGGERED: Config validation failed on all retries.")
                    return fallback_response
                continue

            return RemediationResponse(
                explanation=parsed.get("explanation", ""),
                nist_citation=parsed.get("nist_citation", ""),
                config_diff=config_diff
            )
        except json.JSONDecodeError as e:
            safe_text = response_text.encode('ascii', 'ignore').decode('ascii')
            print(f"JSON Parsing Error on attempt {attempt + 1}: {e}\nResponse: {safe_text}")
            if attempt == max_retries - 1:
                logger.warning(f"LLM FALLBACK TRIGGERED: JSON parse error on all retries. Last error: {e}")
                return fallback_response
        except Exception as e:
            print(f"Groq API Error on attempt {attempt + 1}: {e}")
            if attempt == max_retries - 1:
                logger.warning(f"LLM FALLBACK TRIGGERED: Groq API Error on all retries. Last error: {e}")
                return fallback_response
            time.sleep(2 ** attempt) # Exponential backoff
            
    logger.warning("LLM FALLBACK TRIGGERED: Exhausted all retries.")
    return fallback_response

