import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import sys

# Add backend to path to use extractor
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from backend.esp_traffic_classifier import extract_esp_features

DATASET_DIR = os.path.join(os.path.dirname(__file__), "..", "dataset")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "esp_model.joblib")

def main():
    print("Training ESP Traffic Classifier...")
    labels_path = os.path.join(DATASET_DIR, "labels.csv")
    if not os.path.exists(labels_path):
        print(f"Error: {labels_path} not found. Run generate_testbed.py first.")
        return
        
    df = pd.read_csv(labels_path)
    
    features_list = []
    labels = []
    
    for idx, row in df.iterrows():
        pcap_path = os.path.join(DATASET_DIR, row["pcap_file"])
        if not os.path.exists(pcap_path):
            continue
            
        feats = extract_esp_features(pcap_path)
        if feats:
            features_list.append([
                feats["esp_packet_count"],
                feats["esp_mean_size"],
                feats["esp_var_size"],
                feats["esp_mean_iat"],
                feats["esp_var_iat"],
                feats["esp_duration"]
            ])
            labels.append(row["traffic_type"])
            
    if not features_list:
        print("No valid ESP features extracted from the dataset.")
        return
        
    X = np.array(features_list)
    le = LabelEncoder()
    y = le.fit_transform(labels)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    
    acc = clf.score(X_test, y_test)
    print(f"Model trained! Overall Accuracy on held-out test set: {acc * 100:.1f}%\n")
    
    y_pred = clf.predict(X_test)
    print("--- Classification Report ---")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    
    print("--- Confusion Matrix ---")
    print(confusion_matrix(y_test, y_pred))
    
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump((clf, le), MODEL_PATH)
    print(f"\nModel saved to {MODEL_PATH}")

if __name__ == "__main__":
    main()
