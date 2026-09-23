import os
import numpy as np
from scapy.all import rdpcap
from scapy.layers.ipsec import ESP
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "esp_anomaly_model.joblib")
CLASSIFIER_PATH = os.path.join(os.path.dirname(__file__), "models", "esp_classifier_model.joblib")

def extract_esp_features(pcap_path: str) -> dict:
    if not os.path.exists(pcap_path):
        raise FileNotFoundError(f"PCAP file not found: {pcap_path}")
        
    packets = rdpcap(pcap_path)
    
    esp_sizes = []
    esp_times = []
    
    for pkt in packets:
        if pkt.haslayer(ESP):
            esp_sizes.append(len(pkt[ESP]))
            esp_times.append(float(pkt.time))
            
    if not esp_sizes:
        return None
        
    # Inter-arrival times
    esp_times = sorted(esp_times)
    iats = [esp_times[i] - esp_times[i-1] for i in range(1, len(esp_times))]
    
    features = {
        "esp_packet_count": len(esp_sizes),
        "esp_mean_size": np.mean(esp_sizes) if esp_sizes else 0,
        "esp_var_size": np.var(esp_sizes) if esp_sizes else 0,
        "esp_mean_iat": np.mean(iats) if iats else 0,
        "esp_var_iat": np.var(iats) if iats else 0,
        "esp_duration": (esp_times[-1] - esp_times[0]) if esp_times else 0
    }
    return features

def detect_esp_anomaly(features: dict) -> dict:
    """Returns anomaly scoring and traffic type classification for ESP traffic."""
    if not features:
        return {"is_anomaly": False, "anomaly_score": 0.0, "status": "No ESP data", "traffic_type": "Unknown", "traffic_confidence": 0.0}
        
    if not os.path.exists(MODEL_PATH) or not os.path.exists(CLASSIFIER_PATH):
        return {"is_anomaly": False, "anomaly_score": 0.0, "status": "Model missing", "traffic_type": "Unknown", "traffic_confidence": 0.0}
        
    try:
        model = joblib.load(MODEL_PATH)
        clf_rf, le = joblib.load(CLASSIFIER_PATH)
        
        X = np.array([[
            features["esp_packet_count"],
            features["esp_mean_size"],
            features["esp_var_size"],
            features["esp_mean_iat"],
            features["esp_var_iat"],
            features["esp_duration"]
        ]])
        
        # IsolationForest predict
        pred = model.predict(X)[0]
        score = float(model.decision_function(X)[0])
        is_anomaly = (pred == -1)
        
        # RandomForest predict
        probs = clf_rf.predict_proba(X)[0]
        max_idx = np.argmax(probs)
        traffic_confidence = probs[max_idx]
        traffic_type = le.inverse_transform([max_idx])[0]
        
        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(score, 3),
            "status": "Anomalous ESP Profile" if is_anomaly else "Normal ESP Profile",
            "traffic_type": traffic_type,
            "traffic_confidence": round(float(traffic_confidence * 100), 1)
        }
    except Exception as e:
        return {"is_anomaly": False, "anomaly_score": 0.0, "status": f"Error: {str(e)}", "traffic_type": "Error", "traffic_confidence": 0.0}
