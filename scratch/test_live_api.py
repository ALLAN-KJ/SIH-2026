import json
import requests

API_URL = "https://sih-2026-jg10.onrender.com"

def test_scenario(filename):
    print(f"\n--- Testing Scenario: {filename} ---")
    try:
        with open(filename, "rb") as f:
            res_upload = requests.post(f"{API_URL}/upload_pcap", files={"file": (filename, f, "application/vnd.tcpdump.pcap")})
        
        if res_upload.status_code != 200:
            print("Upload failed:", res_upload.text)
            return
            
        ipsec_req = res_upload.json()
        
        res_assess = requests.post(f"{API_URL}/assess", json=ipsec_req)
        if res_assess.status_code != 200:
            print("Assess failed:", res_assess.text)
            return
            
        risk = res_assess.json()
        print(f"Risk Label: {risk.get('risk_label')}")
        print(f"Risk Score: {risk.get('risk_score')}")
    except Exception as e:
        print(f"Exception during test: {e}")

test_scenario("samples/scenario_critical_legacy.pcap")
test_scenario("samples/scenario_moderate_transition.pcap")
test_scenario("samples/scenario_strong_modern.pcap")
test_scenario("samples/malformed.pcap")
