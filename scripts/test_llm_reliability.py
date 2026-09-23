import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.llm_copilot import remediate_ipsec, RemediationRequest
from fastapi import Request

async def main():
    req_data = RemediationRequest(
        risk_label="Critical",
        flagged_issues=[
            "Diffie-Hellman Group 2 is weak. NIST SP 800-77 requires Group 14 or higher.",
            "Key length (56 bits) is dangerously short. NIST SP 800-77 requires >= 128 bits."
        ],
        top_contributing_factors={
            "dh_group": 10.5,
            "key_length": 8.2
        }
    )
    
    # Mock request for rate limiter
    class MockClient:
        host = "127.0.0.1"
    class MockRequest:
        client = MockClient()
        
    mock_req = MockRequest()
    
    success_count = 0
    total = 10
    
    print(f"Testing LLM Remediation robust parsing for {total} iterations...")
    for i in range(total):
        # We also need to hack the rate limit just in case
        import backend.llm_copilot
        backend.llm_copilot.RATE_LIMIT_DB = {}
        
        print(f"Run {i+1}/{total}...", end=" ")
        resp = await remediate_ipsec(req_data, mock_req)
        
        if "Remediation unavailable" in resp.explanation:
            print("FAILED (Fallback Triggered)")
        else:
            print("SUCCESS")
            success_count += 1
            
    print(f"\nFinal Success Rate: {success_count}/{total} ({(success_count/total)*100}%)")

if __name__ == "__main__":
    asyncio.run(main())
