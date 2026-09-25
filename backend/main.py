# Load .env before anything else reads os.environ
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed; env vars must be set externally

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, UploadFile, File
import tempfile
import os
import sys

# Render deployment failsafe: dynamically ensure the repo root is in sys.path
# so absolute imports like `from backend.schemas import ...` resolve correctly
# even if Render's "Root Directory" is incorrectly set to `backend/`.
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from typing import List, Optional

from backend.schemas import IPsecRequest, AssessResponse
from backend.services.risk_engine import evaluate_risk
from backend.llm_copilot import router as llm_router
from backend.pqc_scorer import router as pqc_router
from backend.audit_trail import router as audit_router
from backend.ike_parser import parse_ike_negotiation
from backend.active_probe import router as active_probe_router

app = FastAPI(title="IPsec VPN Protocol Analyzer API", description="AI-Powered IPsec VPN Protocol Analyzer and Security Assessment Framework")

CORS_ORIGIN = os.environ.get("CORS_ORIGIN")
if not CORS_ORIGIN or CORS_ORIGIN == "*":
    print("WARNING: CORS_ORIGIN is unset or set to wildcard. Restricting to http://localhost:5173 for security.")
    CORS_ORIGIN = "http://localhost:5173"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Basic in-memory rate limiting
import time
from fastapi import Request
RATE_LIMIT_DB = {}

def check_rate_limit(request: Request, limit: int = 10, window: int = 60):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    if client_ip not in RATE_LIMIT_DB:
        RATE_LIMIT_DB[client_ip] = []
        
    # Clean up old requests
    RATE_LIMIT_DB[client_ip] = [t for t in RATE_LIMIT_DB[client_ip] if now - t < window]
    
    if len(RATE_LIMIT_DB[client_ip]) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
        
    RATE_LIMIT_DB[client_ip].append(now)

app.include_router(llm_router)
app.include_router(pqc_router)
app.include_router(audit_router)
app.include_router(active_probe_router)

@app.on_event("startup")
def check_groq_health():
    import logging
    try:
        from groq import Groq
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            logging.warning("GROQ_API_KEY is not set. Remediation will fail.")
            return
            
        client = Groq(api_key=api_key)
        # Using the same model name as in llm_copilot.py
        model_name = "qwen/qwen3.8-27b"
        
        models = client.models.list()
        found = any(m.id == model_name for m in models.data)
        if not found:
            logging.error(f"❌ CRITICAL WARNING: Groq model '{model_name}' not found in available models list! Remediation WILL silently fall back!")
        else:
            logging.info(f"Groq health check passed for model {model_name}.")
    except Exception as e:
        logging.error(f"❌ CRITICAL WARNING: Groq API health check failed: {e}. Remediation WILL silently fall back!")

@app.get("/health")
def health_check():
    """Lightweight endpoint for uptime pingers to keep the backend warm."""
    return {"status": "ok", "service": "ipsec-vpn-protocol-analyzer-api"}

@app.post("/assess", response_model=AssessResponse)
def assess_ipsec(request: IPsecRequest):
    try:
        return evaluate_risk(request)
    except ValueError as e:
        raise HTTPException(status_code=500 if "Model not loaded" in str(e) else 400, detail=str(e))

@app.post("/upload_pcap", response_model=IPsecRequest)
async def upload_pcap(request: Request, file: UploadFile = File(...)):
    """Accepts a PCAP file, parses IKE negotiations, and returns IPsecRequest schema."""
    check_rate_limit(request, limit=10, window=60)
    
    if not file.filename.endswith('.pcap'):
        raise HTTPException(status_code=400, detail="Must be a .pcap file")
        
    # Read file and enforce size limit (5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 5MB.")
        
    # Basic magic number check for PCAP/PCAPNG (D4C3B2A1, A1B2C3D4, 0A0D0D0A)
    if not content.startswith(b'\xd4\xc3\xb2\xa1') and not content.startswith(b'\xa1\xb2\xc3\xd4') and not content.startswith(b'\x0a\x0d\x0d\x0a'):
        raise HTTPException(status_code=400, detail="Invalid file signature. Not a recognized PCAP format.")
        
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pcap") as tmp:
        tmp.write(content)
        tmp_path = tmp.name
        
    try:
        from starlette.concurrency import run_in_threadpool
        parsed_data = await run_in_threadpool(parse_ike_negotiation, tmp_path)
    except ValueError as ve:
        os.unlink(tmp_path)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=f"Failed to parse PCAP: {str(e)}")
        
    os.unlink(tmp_path)
    return IPsecRequest(**parsed_data)

if __name__ == "__main__":
    import uvicorn
    PORT = int(os.environ.get("PORT", 8000))
    HOST = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run(app, host=HOST, port=PORT)


