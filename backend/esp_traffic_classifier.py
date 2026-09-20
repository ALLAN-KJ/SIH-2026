import os
import numpy as np
from scapy.all import rdpcap
from scapy.layers.ipsec import ESP
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "esp_model.joblib")

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

def predict_traffic_type(features: dict) -> dict:
    if not features:
        return {"predicted_traffic_type": "Unknown", "traffic_confidence": 0.0}
        
    if not os.path.exists(MODEL_PATH):
        # Fallback if model not trained yet
        return {"predicted_traffic_type": "Unknown (Model Missing)", "traffic_confidence": 0.0}
        
    try:
        model, label_encoder = joblib.load(MODEL_PATH)
        X = np.array([[
            features["esp_packet_count"],
            features["esp_mean_size"],
            features["esp_var_size"],
            features["esp_mean_iat"],
            features["esp_var_iat"],
            features["esp_duration"]
        ]])
        
        # Some models support predict_proba
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X)[0]
            max_idx = np.argmax(probs)
            confidence = probs[max_idx]
            pred_label = label_encoder.inverse_transform([max_idx])[0]
        else:
            pred = model.predict(X)[0]
            pred_label = label_encoder.inverse_transform([pred])[0]
            confidence = 1.0
            
        return {
            "predicted_traffic_type": pred_label,
            "traffic_confidence": round(float(confidence * 100), 1)
        }
    except Exception as e:
        return {"predicted_traffic_type": f"Error: {str(e)}", "traffic_confidence": 0.0}
