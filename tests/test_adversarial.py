import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_pipeline():
    print("--- Testing Adversarial/Malformed PCAP (Empty File) ---")
    
    # 1. Upload Empty File
    files = {'file': ('empty.pcap', b'', 'application/vnd.tcpdump.pcap')}
    resp = requests.post(f"{BASE_URL}/upload_pcap", files=files)
    print(f"Upload Empty PCAP Status: {resp.status_code}")
    print(f"Upload Empty PCAP Content: {resp.text}")

    print("\n--- Testing Adversarial/Malformed PCAP (Corrupted Header) ---")
    # 2. Upload Corrupted File
    corrupted_data = b'NOT A REAL PCAP \x00\x01\x02\x03\x04\x05'
    files = {'file': ('corrupt.pcap', corrupted_data, 'application/vnd.tcpdump.pcap')}
    resp = requests.post(f"{BASE_URL}/upload_pcap", files=files)
    print(f"Upload Corrupted PCAP Status: {resp.status_code}")
    print(f"Upload Corrupted PCAP Content: {resp.text}")
    
    print("\n--- Testing Validation Rejection (Malicious Config) ---")
    payload = {
        "pcap_hash": "dummy_hash",
        "file_name": "samples/dummy.pcap",
        "extracted_features": {},
        "risk_label": "High",
        "pqc_score": 50,
        "anomalies": ["test anomaly"]
    }
    
    # Actually, we can test validate_config locally in python.
    print("Will test validate_config via Python import...")

if __name__ == "__main__":
    test_pipeline()


