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

def evaluate_risk(request) -> AssessResponse:
    if not model:
        raise ValueError("Model not loaded")
        
    req_dict = request.model_dump()
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
