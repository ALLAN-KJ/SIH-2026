from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_audit_endpoints():
    report_data = {
        "risk_score": 100,
        "risk_label": "Critical",
        "timestamp": "2026-09-11T22:50:00Z"
    }
    
    # 1. Log the report
    response_log = client.post("/log", json={"report_data": report_data})
    print("Log Response:", response_log.json())
    assert response_log.status_code == 200
    
    data_log = response_log.json()
    assert "report_hash" in data_log
    assert "merkle_root" in data_log
    
    import re
    assert re.match(r'^[a-f0-9]{64}$', data_log["report_hash"]), "report_hash must be a valid 64-character hex string"
    assert re.match(r'^[a-f0-9]{64}$', data_log["merkle_root"]), "merkle_root must be a valid 64-character hex string"
    
    report_hash = data_log["report_hash"]
    
    # 2. Verify the report exists
    response_verify = client.post("/verify", json={"report_hash": report_hash})
    print("Verify Response (Valid):", response_verify.json())
    assert response_verify.status_code == 200
    assert response_verify.json()["is_verified"] is True
    
    # 3. Verify a fake report fails
    response_fake = client.post("/verify", json={"report_hash": "deadbeef1234567890"})
    print("Verify Response (Invalid):", response_fake.json())
    assert response_fake.status_code == 200
    assert response_fake.json()["is_verified"] is False

if __name__ == "__main__":
    test_audit_endpoints()


