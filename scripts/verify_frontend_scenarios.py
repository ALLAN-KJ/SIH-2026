import json
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_scenario(filename):
    print(f"\n--- Testing Scenario: {filename} ---")
    with open(filename, "rb") as f:
        res_upload = client.post("/upload_pcap", files={"file": (filename, f, "application/vnd.tcpdump.pcap")})
    
    if res_upload.status_code != 200:
        print("Upload failed:", res_upload.text)
        return
        
    ipsec_req = res_upload.json()
    
    res_assess = client.post("/assess", json=ipsec_req)
    if res_assess.status_code != 200:
        print("Assess failed:", res_assess.text)
        return
        
    risk = res_assess.json()
    print(f"Risk Label: {risk['risk_label']}")
    print(f"Risk Score: {risk['risk_score']}")
    print(f"Top Factors: {risk['top_contributing_factors']}")

test_scenario("samples/scenario_critical_legacy.pcap")
test_scenario("samples/scenario_moderate_transition.pcap")
test_scenario("samples/scenario_strong_modern.pcap")
