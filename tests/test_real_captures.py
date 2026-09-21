import os
import sys
import pandas as pd
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from backend.ike_parser import parse_ike_negotiation
from backend.esp_traffic_classifier import predict_traffic_type

REAL_DIR = os.path.join(os.path.dirname(__file__), '..', 'dataset', 'real_captures')
LABELS_FILE = os.path.join(os.path.dirname(__file__), '..', 'dataset', 'labels.csv')

def test_real():
    if not os.path.exists(REAL_DIR):
        print("No real captures found. Please run generate_real.ps1 first.")
        return

    # Check if labels.csv has real captures
    df = pd.read_csv(LABELS_FILE)
    real_df = df[df['pcap_file'].str.startswith('real_')]
    if real_df.empty:
        print("No real captures found in labels.csv")
        return

    correct = 0
    total = len(real_df)
    
    print("Testing Real Captures against ESP Classifier:")
    for _, row in real_df.iterrows():
        pcap_path = os.path.join(REAL_DIR, row['pcap_file'])
        if not os.path.exists(pcap_path):
            continue
            
        try:
            res = parse_ike_negotiation(pcap_path)
            esp_features = res.get("esp_features")
            if esp_features:
                predicted = predict_traffic_type(esp_features)
                predicted_label = predicted.get('predicted_traffic_type') if isinstance(predicted, dict) else predicted
                actual = row['traffic_type']
                print(f"{row['pcap_file']} -> Predicted: {predicted_label} (Dict: {predicted}) | Actual: {actual}")
                if predicted_label == actual:
                    correct += 1
            else:
                print(f"{row['pcap_file']} -> No ESP features extracted.")
        except Exception as e:
            print(f"{row['pcap_file']} -> Error: {e}")
            
    if total > 0:
        accuracy = (correct / total) * 100
        print(f"\nReal Data Accuracy: {accuracy:.2f}% ({correct}/{total})")

if __name__ == "__main__":
    test_real()
