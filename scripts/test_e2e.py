import requests
import os

BASE_URL = "http://localhost:8000"

def test_pcap(filepath):
    print(f"--- Testing {filepath} ---")
    if not os.path.exists(filepath):
        print("File not found.")
        return
        
    with open(filepath, 'rb') as f:
        files = {'file': (os.path.basename(filepath), f, 'application/vnd.tcpdump.pcap')}
        try:
            resp1 = requests.post(f"{BASE_URL}/upload_pcap", files=files)
            if resp1.status_code == 200:
                ipsec_req = resp1.json()
                print(f"Uploaded and parsed successfully. Assessing...")
                resp2 = requests.post(f"{BASE_URL}/assess", json=ipsec_req)
                
                if resp2.status_code == 200:
                    data = resp2.json()
                    print(f"Status: SUCCESS")
                    print(f"Risk Score: {data.get('risk_score')} ({data.get('risk_label')})")
                    print(f"ESP Anomaly: {data.get('esp_anomaly_status')} (Score: {data.get('esp_anomaly_score')})")
                    print(f"SHAP Values: {data.get('top_contributing_factors')}")
                else:
                    print(f"ASSESS FAILED: {resp2.status_code}")
            else:
                print(f"UPLOAD FAILED: {resp1.status_code}")
                print(resp1.text)
        except Exception as e:
            print(f"Error: {e}")
            
if __name__ == "__main__":
    test_pcap("dataset/esp_only.pcap")
