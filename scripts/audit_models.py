import os
import csv
import glob
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
import joblib

from backend.esp_traffic_classifier import extract_esp_features
from backend.services.risk_engine import load_models

def audit_esp_model():
    print("--- PART 2.1: ESP CLASSIFIER AUDIT ---")
    dataset_dir = os.path.join(os.path.dirname(__file__), '..', 'dataset')
    labels_file = os.path.join(dataset_dir, 'labels.csv')
    
    # 1. Load valid labels (where file exists)
    valid_data = []
    with open(labels_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if os.path.exists(os.path.join(dataset_dir, row['pcap_file'])):
                if row['traffic_type'].strip() in ["Video", "Email", "Web", "VoIP", "ICMP"]:
                    valid_data.append(row)
                    
    print(f"Loaded {len(valid_data)} valid labeled files for ESP Audit.")
    
    # 2. Extract features
    print("Extracting features from physical files (this may take a moment)...")
    X = []
    y = []
    for row in valid_data:
        pcap_path = os.path.join(dataset_dir, row['pcap_file'])
        try:
            feats = extract_esp_features(pcap_path)
            if feats:
                feat_list = [
                    feats["esp_packet_count"],
                    feats["esp_mean_size"],
                    feats["esp_var_size"],
                    feats["esp_mean_iat"],
                    feats["esp_var_iat"],
                    feats["esp_duration"]
                ]
                X.append(feat_list)
                y.append(row['traffic_type'].strip())
        except Exception as e:
            pass
            
    print(f"Successfully extracted features for {len(X)} files.")
    
    # 3. Train/Test Split (Fixed Seed 42 to ensure independent test set)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    print(f"Split: {len(X_train)} train, {len(X_test)} test.")
    
    # 4. Load Model
    model_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'models', 'esp_model.joblib')
    if not os.path.exists(model_path):
        print("ERROR: ESP model not found!")
        return
        
    clf, le = joblib.load(model_path)
    
    # 5. Evaluate on Held-Out Test Set
    y_pred_idx = clf.predict(X_test)
    y_pred = le.inverse_transform(y_pred_idx)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nREAL ESP CLASSIFIER ACCURACY: {acc*100:.2f}%")
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    
def audit_risk_model():
    print("\n--- PART 2.2: XGBOOST RISK MODEL AUDIT ---")
    base_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend")
    model = joblib.load(os.path.join(base_dir, "models", "xgb_model.joblib"))
    preprocessor = joblib.load(os.path.join(base_dir, "models", "preprocessor.joblib"))
    label_encoder = joblib.load(os.path.join(base_dir, "models", "label_encoder.joblib"))
    
    # Let's generate a quick synthetic but realistic dataset to test it
    import random
    
    def generate_sample():
        mode = random.choice(["Tunnel", "Transport"])
        ip_version = random.choice(["IPv4", "IPv6"])
        encryption = random.choice(["AES-256-GCM", "AES-128-CBC", "3DES", "DES", "Null"])
        hash_algo = random.choice(["SHA-256", "SHA1", "MD5"])
        dh_group = random.choice([14, 19, 20, 2, 5])
        pfs = random.choice([True, False])
        lifetime = random.choice([3600, 28800, 86400, 100000])
        
        # Ground truth rule-based logic
        risk = "Low"
        if encryption in ["3DES", "DES", "Null"] or hash_algo == "MD5" or dh_group < 14:
            risk = "Critical"
        elif encryption == "AES-128-CBC" or hash_algo == "SHA1" or not pfs or lifetime > 86400:
            risk = "Moderate"
            
        return {
            "operation_mode": mode,
            "ip_version": ip_version,
            "encryption_algorithm": encryption,
            "key_length_bits": 256 if "256" in encryption else (128 if "128" in encryption else 0),
            "hash_algorithm": hash_algo,
            "dh_group": dh_group,
            "pfs_enabled": pfs,
            "sa_lifetime_seconds": lifetime,
            "auth_method": "PSK",
            "ike_version": "v2",
            "ike_mode": "Main"
        }, risk
        
    X_eval = []
    y_true = []
    for _ in range(500):
        req, risk = generate_sample()
        X_eval.append(req)
        y_true.append(risk)
        
    df = pd.DataFrame(X_eval)
    X_processed = preprocessor.transform(df)
    
    y_pred_idx = model.predict(X_processed)
    y_pred = label_encoder.inverse_transform(y_pred_idx)
    
    acc = accuracy_score(y_true, y_pred)
    print(f"REAL XGBOOST RISK MODEL ACCURACY (Synthetic Held-Out): {acc*100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_true, y_pred))


if __name__ == "__main__":
    audit_esp_model()
    audit_risk_model()
