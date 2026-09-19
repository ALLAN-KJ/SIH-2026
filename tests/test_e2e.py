import time
from fastapi.testclient import TestClient
from backend.main import app
import json

client = TestClient(app)

def run_pipeline(pcap_filename, expected_risk_label):
    print(f"\n--- Testing Scenario: {pcap_filename} ---")
    start_time = time.time()
    
    # 1. Upload PCAP
    with open(pcap_filename, "rb") as f:
        res_upload = client.post("/upload_pcap", files={"file": (pcap_filename, f, "application/vnd.tcpdump.pcap")})
    assert res_upload.status_code == 200, f"Upload failed: {res_upload.text}"
    ipsec_req = res_upload.json()
    print("[OK] Upload & Parse Successful")
    
    # 2. Assess
    res_assess = client.post("/assess", json=ipsec_req)
    assert res_assess.status_code == 200, f"Assess failed: {res_assess.text}"
    risk = res_assess.json()
    assert risk["risk_label"] == expected_risk_label, f"Expected {expected_risk_label}, got {risk['risk_label']}"
    print(f"[OK] Assess Successful (Label: {risk['risk_label']}, Score: {risk['risk_score']})")
    
    # 3. PQC Score
    res_pqc = client.post("/pqc_score", json={
        "encryption_algorithm": ipsec_req["encryption_algorithm"],
        "key_length_bits": ipsec_req["key_length_bits"],
        "hash_algorithm": ipsec_req["hash_algorithm"],
        "dh_group": ipsec_req["dh_group"]
    })
    assert res_pqc.status_code == 200, "PQC failed"
    pqc = res_pqc.json()
    assert "pqc_score" in pqc, "pqc_score missing from response"
    print(f"[OK] PQC Successful (Score: {pqc['pqc_score']})")
    
    # 4. Remediate
    res_rem = client.post("/remediate", json={
        "risk_label": risk["risk_label"],
        "flagged_issues": risk["flagged_issues"],
        "top_contributing_factors": risk["top_contributing_factors"]
    })
    assert res_rem.status_code == 200, "Remediate failed"
    rem_data = res_rem.json()
    config_diff = rem_data.get("config_diff", "")
    assert "! No configuration available" not in config_diff, "LLM returned the fallback string silently!"
    assert len(config_diff) > 20, "Remediation config is suspiciously short."
    assert any(k in config_diff.lower() for k in ["crypto", "isakmp", "ipsec", "transform-set", "ikev2", "proposal", "policy"]), "Remediation config lacks valid IPsec keywords."
    print("[OK] LLM Remediation Successful (Dynamic content verified)")
    print(f"\n--- GENERATED CONFIG DIFF ---\n{config_diff}\n-----------------------------\n")
    
    # 5. Log
    res_log = client.post("/log", json={"report_data": ipsec_req})
    assert res_log.status_code == 200, "Log failed"
    audit = res_log.json()
    assert "report_hash" in audit, "report_hash missing from response"
    print(f"[OK] Audit Trail Successful (Hash: {audit['report_hash']})")
    
    end_time = time.time()
    elapsed = end_time - start_time
    print(f"Pipeline completed in {elapsed:.2f} seconds.")
    assert elapsed < 45.0, "Performance threshold exceeded (>45s)"
    return True

def test_dummy_pcap():
    print("\n--- Testing Scenario: dummy.pcap ---")
    # Create a dummy pcap file
    with open("samples/dummy.pcap", "wb") as f:
        f.write(b"this is not a valid pcap file")
    
    with open("samples/dummy.pcap", "rb") as f:
        res = client.post("/upload_pcap", files={"file": ("samples/dummy.pcap", f, "application/vnd.tcpdump.pcap")})
    
    assert res.status_code == 400, "Dummy PCAP should be rejected"
    print(f"[OK] Dummy PCAP gracefully rejected with: {res.json()['detail']}")
    import os
    os.remove("samples/dummy.pcap")

if __name__ == "__main__":
    run_pipeline("samples/scenario_critical_legacy.pcap", "Critical")
    run_pipeline("samples/scenario_moderate_transition.pcap", "Weak")
    run_pipeline("samples/scenario_strong_modern.pcap", "Strong")
    test_dummy_pcap()
    print("\nALL SCENARIOS PASSED E2E SMOKE TEST.")



