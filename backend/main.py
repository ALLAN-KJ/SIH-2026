# Load .env before anything else reads os.environ
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed; env vars must be set externally

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
import joblib
import pandas as pd
import shap
import numpy as np
import tempfile
import os
from typing import List, Optional
from backend.llm_copilot import router as llm_router
from backend.pqc_scorer import router as pqc_router
from backend.audit_trail import router as audit_router
from backend.ike_parser import parse_ike_negotiation
from backend.active_probe import router as active_probe_router

app = FastAPI(title="IPsec Sentinel API", description="AI-Powered IPsec VPN Protocol Analyzer")

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


# Load models and preprocessors globally
try:
    # MODEL METADATA LIMITATION: Trained on synthetic data constructed from real 
    # IETF/NIST-documented IKE parameter combinations; not yet validated against 
    # a labeled real-world traffic corpus.
    model = joblib.load(os.path.join(os.path.dirname(__file__), "models", "xgb_model.joblib"))
    preprocessor = joblib.load(os.path.join(os.path.dirname(__file__), "models", "preprocessor.joblib"))
    label_encoder = joblib.load(os.path.join(os.path.dirname(__file__), "models", "label_encoder.joblib"))
    feature_names = joblib.load(os.path.join(os.path.dirname(__file__), "models", "feature_names.joblib"))
    
    # Initialize SHAP explainer
    # TreeExplainer is used for XGBoost
    explainer = shap.TreeExplainer(model)
except Exception as e:
    print(f"Warning: Could not load ML models. Ensure they are trained. Error: {e}")
    model, preprocessor, label_encoder, feature_names, explainer = None, None, None, None, None

class IPsecRequest(BaseModel):
    ike_version: str
    ike_mode: str
    encryption_algorithm: str
    key_length_bits: int
    hash_algorithm: str
    dh_group: int
    auth_method: str
    operation_mode: str
    pfs_enabled: bool
    sa_lifetime_seconds: int
    
class AssessResponse(BaseModel):
    risk_score: float
    risk_label: str
    top_contributing_factors: dict
    flagged_issues: List[str]

@app.post("/assess", response_model=AssessResponse)
def assess_ipsec(request: IPsecRequest):
    if not model:
        raise HTTPException(status_code=500, detail="Model not loaded")
        
    req_dict = request.model_dump()
    df = pd.DataFrame([req_dict])
    
    try:
        X_processed = preprocessor.transform(df)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Preprocessing error: {e}")
        
    # Predict probabilities and label
    # In XGBoost, if objective is multi-class, predict_proba gives per-class probs
    probs = model.predict_proba(X_processed)[0]
    pred_idx = model.predict(X_processed)[0]
    risk_label = label_encoder.inverse_transform([pred_idx])[0]
    
    # To compute a continuous risk score (0-100) from the ML model's class probabilities, 
    # we apply a weighted sum based on standard CVSS v3.1 qualitative severity ratings mapped to a 0-100 scale:
    # - 'Strong'   -> 0   (CVSS None/Low risk equivalent, fully secure)
    # - 'Moderate' -> 50  (CVSS Medium severity midpoint)
    # - 'Weak'     -> 75  (CVSS High severity midpoint)
    # - 'Critical' -> 100 (CVSS Critical severity maximum)
    # This translates the model's probabilistic distribution across these classes into a single severity metric.
    class_weights = {"Strong": 0, "Moderate": 50, "Weak": 75, "Critical": 100}
    classes = label_encoder.classes_
    risk_score = sum(probs[i] * class_weights.get(classes[i], 50) for i in range(len(classes)))
    
    # SHAP Explainability
    shap_values = explainer.shap_values(X_processed)
    
    # Handle multi-class SHAP values
    if isinstance(shap_values, list):
        class_shap = shap_values[pred_idx][0]
    elif len(shap_values.shape) == 3:
        # shape: (n_samples, n_features, n_classes)
        class_shap = shap_values[0, :, pred_idx]
    else:
        class_shap = shap_values[0]
        
    feature_impacts = {feature_names[i]: float(class_shap[i]) for i in range(len(feature_names))}
    
    sorted_features = sorted(feature_impacts.items(), key=lambda x: abs(x[1]), reverse=True)
    top_factors = dict(sorted_features[:3])
    
    flagged_issues = []
    if request.encryption_algorithm in ["DES", "3DES", "RC4"]:
        flagged_issues.append(f"Weak encryption algorithm: {request.encryption_algorithm}")
    if request.key_length_bits < 128:
        flagged_issues.append("Key length is dangerously short")
    if request.hash_algorithm in ["MD5", "SHA1"]:
        flagged_issues.append(f"Weak hashing algorithm: {request.hash_algorithm}")
    if not request.pfs_enabled:
        flagged_issues.append("Perfect Forward Secrecy (PFS) is disabled")
        
    if risk_label == "Critical" and not flagged_issues:
        flagged_issues.append("Model detected high risk combinations in DH group and lifetime")
        
    return AssessResponse(
        risk_score=round(risk_score, 2),
        risk_label=risk_label,
        top_contributing_factors=top_factors,
        flagged_issues=flagged_issues
    )

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


