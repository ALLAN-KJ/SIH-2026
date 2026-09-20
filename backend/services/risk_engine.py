import os
import joblib
import pandas as pd
import shap
from backend.schemas import AssessResponse

# Load models and preprocessors globally
model, preprocessor, label_encoder, feature_names, explainer = None, None, None, None, None

def load_models():
    global model, preprocessor, label_encoder, feature_names, explainer
    try:
        base_dir = os.path.dirname(os.path.dirname(__file__))
        model = joblib.load(os.path.join(base_dir, "models", "xgb_model.joblib"))
        preprocessor = joblib.load(os.path.join(base_dir, "models", "preprocessor.joblib"))
        label_encoder = joblib.load(os.path.join(base_dir, "models", "label_encoder.joblib"))
        feature_names = joblib.load(os.path.join(base_dir, "models", "feature_names.joblib"))
        explainer = shap.TreeExplainer(model)
    except Exception as e:
        print(f"Warning: Could not load ML models. Ensure they are trained. Error: {e}")

# Call load_models at import time
load_models()

from backend.esp_traffic_classifier import predict_traffic_type

def evaluate_risk(request) -> AssessResponse:
    if not model:
        raise ValueError("Model not loaded")
        
    req_dict = request.model_dump()
    # Remove esp_features before feeding to the XGBoost risk model (it wasn't trained on it)
    if "esp_features" in req_dict:
        del req_dict["esp_features"]
        
    df = pd.DataFrame([req_dict])
    
    try:
        X_processed = preprocessor.transform(df)
    except Exception as e:
        raise ValueError(f"Preprocessing error: {e}")
        
    probs = model.predict_proba(X_processed)[0]
    pred_idx = model.predict(X_processed)[0]
    risk_label = label_encoder.inverse_transform([pred_idx])[0]
    
    class_weights = {"Strong": 0, "Moderate": 50, "Weak": 75, "Critical": 100}
    classes = label_encoder.classes_
    risk_score = sum(probs[i] * class_weights.get(classes[i], 50) for i in range(len(classes)))
    
    shap_values = explainer.shap_values(X_processed)
    
    if isinstance(shap_values, list):
        class_shap = shap_values[pred_idx][0]
    elif len(shap_values.shape) == 3:
        class_shap = shap_values[0, :, pred_idx]
    else:
        class_shap = shap_values[0]
        
    feature_impacts = {feature_names[i]: float(class_shap[i]) for i in range(len(feature_names))}
    sorted_features = sorted(feature_impacts.items(), key=lambda x: abs(x[1]), reverse=True)
    top_factors = dict(sorted_features[:3])
    
    flagged_issues = []
    if request.encryption_algorithm in ["DES", "3DES", "RC4", "Unknown"]:
        flagged_issues.append(f"Weak or unknown encryption algorithm: {request.encryption_algorithm}")
    if request.key_length_bits > 0 and request.key_length_bits < 128:
        flagged_issues.append(f"Key length ({request.key_length_bits} bits) is dangerously short. NIST SP 800-77 requires >= 128 bits.")
    if request.hash_algorithm in ["MD5", "SHA1", "Unknown"]:
        flagged_issues.append(f"Weak or unknown hashing algorithm: {request.hash_algorithm}. NIST SP 800-77 requires SHA-256 or better.")
    if not request.pfs_enabled:
        flagged_issues.append("Perfect Forward Secrecy (PFS) is disabled. Key compromise may allow retroactive decryption.")
    if request.dh_group > 0 and request.dh_group < 14:
        flagged_issues.append(f"Diffie-Hellman Group {request.dh_group} is weak. NIST SP 800-77 requires Group 14 or higher.")
    if request.sa_lifetime_seconds > 86400:
        flagged_issues.append(f"Security Association lifetime ({request.sa_lifetime_seconds}s) exceeds NIST recommended maximum of 24 hours.")
        
    # Replay protection is inherent in ESP with sequence numbers, but we flag if using IKEv1 without proper IPsec SA encapsulation
    if request.ike_version == "IKEv1" and request.operation_mode == "Unknown":
        flagged_issues.append("Potential lack of Replay Protection due to missing IPsec ESP encapsulation.")
        
    if risk_label == "Critical" and not flagged_issues:
        flagged_issues.append("Model detected high risk combinations in DH group and lifetime")
        
    # ESP Traffic Classification
    traffic_pred = predict_traffic_type(request.esp_features)
        
    return AssessResponse(
        risk_score=round(risk_score, 2),
        risk_label=risk_label,
        top_contributing_factors=top_factors,
        flagged_issues=flagged_issues,
        predicted_traffic_type=traffic_pred.get("predicted_traffic_type"),
        traffic_confidence=traffic_pred.get("traffic_confidence")
    )
