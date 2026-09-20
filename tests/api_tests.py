import requests
import json
import os

BASE_URL = "http://localhost:8000"

def upload_pcap(filepath):
    url = f"{BASE_URL}/upload_pcap"
    try:
        with open(filepath, 'rb') as f:
            files = {'file': (os.path.basename(filepath), f, 'application/vnd.tcpdump.pcap')}
            r = requests.post(url, files=files)
            return r.status_code, r.json()
    except Exception as e:
        return 500, str(e)

def assess(data):
    url = f"{BASE_URL}/assess"
    r = requests.post(url, json=data)
    return r.status_code, r.json()

def test_files():
    samples_dir = r"d:\Antigravity\SIH\samples"
    for file in os.listdir(samples_dir):
        if file.endswith(".pcap"):
            print(f"Testing {file}...")
            status, data = upload_pcap(os.path.join(samples_dir, file))
            print(f"Upload Status: {status}")
            if status == 200:
                astatus, adata = assess(data)
                print(f"Assess Status: {astatus}, Label: {adata.get('risk_label')}, Score: {adata.get('risk_score')}")
            else:
                print(f"Upload Data: {data}")
            print("-" * 40)

    # Test dummy file
    print("Testing dummy file...")
    dummy_path = os.path.join(samples_dir, "dummy.pcap")
    with open(dummy_path, "w") as f:
        f.write("This is not a real pcap")
    status, data = upload_pcap(dummy_path)
    print(f"Dummy file upload status: {status}, response: {data}")
    os.remove(dummy_path)
    
    # Test oversized file
    print("Testing oversized file...")
    oversized_path = os.path.join(samples_dir, "oversized.pcap")
    with open(oversized_path, "wb") as f:
        f.seek(6 * 1024 * 1024)
        f.write(b"\0")
    status, data = upload_pcap(oversized_path)
    print(f"Oversized file upload status: {status}, response: {data}")
    os.remove(oversized_path)

if __name__ == "__main__":
    test_files()
