import requests
import json
import time
import os

from backend.llm_copilot import validate_config
from backend.pqc_scorer import evaluate_pqc_readiness, PQCRequest

def live_verification():
    print("--- PART 3: LIVE ENDPOINT VERIFICATION ---")
    BASE_URL = "http://localhost:8000"
    
    # 1. Test 3 Official Demo PCAPs
    dataset_dir = os.path.join(os.path.dirname(__file__), '..', 'dataset')
    pcap1 = os.path.join(dataset_dir, 'real_captures', 'real_strong.pcap')
    pcap2 = os.path.join(dataset_dir, 'real_captures', 'real_weak.pcap')
    
    # Just test these 2 for brevity and then an arbitrary testbed pcap
    pcap3 = os.path.join(dataset_dir, 'tunnel_100_3DES_20_Video_IPv6_Tunnel.pcap')
    
    test_pcaps = [pcap1, pcap2, pcap3]
    
    print("\n--- 3.1 DEMO PCAP UPLOADS ---")
    for p in test_pcaps:
        if os.path.exists(p):
            with open(p, 'rb') as f:
                print(f"Uploading {os.path.basename(p)}...")
                try:
                    resp = requests.post(f"{BASE_URL}/upload_pcap", files={"file": (os.path.basename(p), f, "application/vnd.tcpdump.pcap")})
                    if resp.status_code == 200:
                        req_data = resp.json()
                        risk_resp = requests.post(f"{BASE_URL}/assess", json=req_data)
                        pqc_resp = requests.post(f"{BASE_URL}/pqc_score", json=req_data)
                        
                        risk = risk_resp.json() if risk_resp.status_code == 200 else {}
                        pqc = pqc_resp.json() if pqc_resp.status_code == 200 else {}
                        
                        print(f"  SUCCESS! Risk: {risk.get('risk_label')} ({risk.get('risk_score')}) | PQC: {pqc.get('pqc_status')} | Label: {risk.get('predicted_traffic_type')}")
                    else:
                        print(f"  FAILED: {resp.status_code} - {resp.text}")
                except Exception as e:
                    print(f"  CONNECTION ERROR: {e}")
        else:
            print(f"Missing file: {p}")
            
    # 2. Malformed PCAP
    print("\n--- 3.2 MALFORMED PCAP UPLOAD ---")
    malformed_path = os.path.join(dataset_dir, 'malformed.pcap')
    with open(malformed_path, 'wb') as f:
        f.write(b"this is totally not a valid pcap file, it's just garbage bytes.")
        
    with open(malformed_path, 'rb') as f:
        try:
            resp = requests.post(f"{BASE_URL}/upload_pcap", files={"file": ("malformed.pcap", f, "application/vnd.tcpdump.pcap")})
            print(f"Expected failure. Actual result: {resp.status_code} - {resp.text}")
        except Exception as e:
            print(f"CONNECTION ERROR: {e}")
            
    os.remove(malformed_path)
    
    # 3. Active Probe tests
    print("\n--- 3.4 AUTH GATE TESTS (Active Probe) ---")
    probe_url = f"{BASE_URL}/probe/active"
    
    # 3.4.1 Wrong auth phrase
    payload = {"target_ip": "192.168.1.1", "auth_confirmation": "YES I AM"}
    resp = requests.post(probe_url, json=payload)
    print(f"Wrong auth phrase -> Status {resp.status_code}, Msg: {resp.text}")
    
    # 3.4.2 Non-RFC1918 IP
    payload = {"target_ip": "8.8.8.8", "auth_confirmation": "I AM AUTHORIZED"}
    resp = requests.post(probe_url, json=payload)
    print(f"Public IP without override -> Status {resp.status_code}, Msg: {resp.text}")
    
    # 3.4.3 Rate Limiting
    payload = {"target_ip": "192.168.1.1", "auth_confirmation": "I AM AUTHORIZED"}
    print("Sending probe 1...")
    requests.post(probe_url, json=payload)
    print("Sending probe 2 immediately...")
    resp = requests.post(probe_url, json=payload)
    print(f"Rate limit test -> Status {resp.status_code}, Msg: {resp.text}")
    
    # 4. validate_config() direct checks
    print("\n--- 3.7 CONFIG VALIDATOR EDGE CASES ---")
    print(f"Legit config ('crypto isakmp policy 10'): {validate_config('crypto isakmp policy 10')}")
    print(f"Destructive ('erase startup-config'): {validate_config('erase startup-config')}")
    print(f"Typo/Malicious ('cryptomap test'): {validate_config('cryptomap test')}")
    
    # 5. PQC Scorer checks
    print("\n--- 3.8 PQC SCORER EDGE CASES ---")
    def test_pqc(dh):
        req = PQCRequest(encryption_algorithm="AES", key_length_bits=256, hash_algorithm="SHA256", dh_group=dh)
        return evaluate_pqc_readiness(req).pqc_status
    print(f"Classical DH Group (14): {test_pqc(14)}")
    print(f"PQC Placeholder Group (31): {test_pqc(31)}")
    print(f"Unrecognized Group (99): {test_pqc(99)}")
    
    # 6. Vercel Live URL
    print("\n--- 3.9 LIVE VERCEL URL CHECK ---")
    vercel_url = "https://sih-2026-frontend-i4ivhcaxw-allan-kjs-projects.vercel.app"
    try:
        resp = requests.get(vercel_url)
        print(f"Vercel URL {vercel_url} returned Status: {resp.status_code}")
    except Exception as e:
        print(f"Vercel URL failed: {e}")
        
if __name__ == "__main__":
    live_verification()
