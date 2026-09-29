import pandas as pd
import joblib
from sklearn.metrics import accuracy_score, classification_report

# 3 Strong captures, 3 Weak captures
data = [
    # Strong
    {"session_id": "1", "ike_version": "IKEv2", "ike_mode": "Main", "encryption_algorithm": "AES-256-GCM", "key_length_bits": 256, "hash_algorithm": "SHA384", "dh_group": 20, "auth_method": "PSK", "operation_mode": "Tunnel", "pfs_enabled": True, "sa_lifetime_seconds": 3600, "risk_label": "Strong"},
    {"session_id": "2", "ike_version": "IKEv2", "ike_mode": "Main", "encryption_algorithm": "AES-256-GCM", "key_length_bits": 256, "hash_algorithm": "SHA384", "dh_group": 20, "auth_method": "PSK", "operation_mode": "Tunnel", "pfs_enabled": True, "sa_lifetime_seconds": 3600, "risk_label": "Strong"},
    {"session_id": "3", "ike_version": "IKEv2", "ike_mode": "Main", "encryption_algorithm": "AES-256-GCM", "key_length_bits": 256, "hash_algorithm": "SHA384", "dh_group": 20, "auth_method": "PSK", "operation_mode": "Tunnel", "pfs_enabled": True, "sa_lifetime_seconds": 3600, "risk_label": "Strong"},
    # Weak
    {"session_id": "4", "ike_version": "IKEv2", "ike_mode": "Main", "encryption_algorithm": "3DES", "key_length_bits": 112, "hash_algorithm": "SHA256", "dh_group": 2, "auth_method": "PSK", "operation_mode": "Tunnel", "pfs_enabled": False, "sa_lifetime_seconds": 3600, "risk_label": "Critical"},
    {"session_id": "5", "ike_version": "IKEv2", "ike_mode": "Main", "encryption_algorithm": "3DES", "key_length_bits": 112, "hash_algorithm": "SHA256", "dh_group": 2, "auth_method": "PSK", "operation_mode": "Tunnel", "pfs_enabled": False, "sa_lifetime_seconds": 3600, "risk_label": "Critical"},
    {"session_id": "6", "ike_version": "IKEv2", "ike_mode": "Main", "encryption_algorithm": "3DES", "key_length_bits": 112, "hash_algorithm": "SHA256", "dh_group": 2, "auth_method": "PSK", "operation_mode": "Tunnel", "pfs_enabled": False, "sa_lifetime_seconds": 3600, "risk_label": "Critical"}
]

df = pd.DataFrame(data)
X = df.drop(['session_id', 'risk_label'], axis=1)
y = df['risk_label']

preprocessor = joblib.load('backend/models/preprocessor.joblib')
label_encoder = joblib.load('backend/models/label_encoder.joblib')
model = joblib.load('backend/models/xgb_model.joblib')

y_encoded = label_encoder.transform(y)
X_processed = preprocessor.transform(X)

preds = model.predict(X_processed)

print("Real Captures Accuracy:", accuracy_score(y_encoded, preds))
print("\nClassification Report (Real Captures):")
print(classification_report(y_encoded, preds, target_names=label_encoder.classes_, labels=range(len(label_encoder.classes_))))
