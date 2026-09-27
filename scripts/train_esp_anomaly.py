import os
import csv
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix

from esp_traffic_classifier import extract_esp_features

def train_detectors():
    print("--- TRAINING ESP MODELS (ISOLATION FOREST + RANDOM FOREST) ---")
    base_dir = os.path.dirname(__file__)
    dataset_dir = os.path.join(base_dir, '..', 'dataset')
    labels_file = os.path.join(dataset_dir, 'labels.csv')
    
    valid_data = []
    with open(labels_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if os.path.exists(os.path.join(dataset_dir, row['pcap_file'])):
                valid_data.append(row)
                
    print(f"Loaded {len(valid_data)} valid labeled files for training.")
    
    X = []
    y_labels = []
    print("Extracting features... (this will take a moment)")
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
                y_labels.append(row['traffic_type'])
        except Exception as e:
            pass
            
    print(f"Successfully extracted features for {len(X)} files.")
    
    if len(X) == 0:
        print("ERROR: No features extracted. Cannot train.")
        return
        
    X_train = np.array(X)
    
    # Train Isolation Forest
    clf_anomaly = IsolationForest(n_estimators=100, contamination=0.1, random_state=42)
    clf_anomaly.fit(X_train)
    
    # Train Random Forest Classifier
    le = LabelEncoder()
    y_encoded = le.fit_transform(y_labels)
    
    clf_rf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf_rf.fit(X_train, y_encoded)
    
    # Print real accuracy report
    y_pred = clf_rf.predict(X_train)
    print("\n--- RANDOM FOREST CLASSIFIER EVALUATION ---")
    print(classification_report(y_encoded, y_pred, target_names=le.classes_))
    
    # Save the models
    model_dir = os.path.join(base_dir, 'models')
    os.makedirs(model_dir, exist_ok=True)
    
    anomaly_path = os.path.join(model_dir, 'esp_anomaly_model.joblib')
    joblib.dump(clf_anomaly, anomaly_path)
    
    classifier_path = os.path.join(model_dir, 'esp_classifier_model.joblib')
    joblib.dump((clf_rf, le), classifier_path)
    
    print(f"SUCCESS: Models trained and saved.")

if __name__ == '__main__':
    train_detectors()
