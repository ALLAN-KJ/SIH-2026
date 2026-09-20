from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_assess_endpoint():
    # Simulate a critical risk payload
    payload = {
        "ike_version": "IKEv1",
        "ike_mode": "Aggressive",
        "encryption_algorithm": "3DES",
        "key_length_bits": 56,
        "hash_algorithm": "MD5",
        "dh_group": 1,
        "auth_method": "Pre-Shared Key",
        "operation_mode": "Tunnel",
        "ip_version": "IPv4",
        "pfs_enabled": False,
        "sa_lifetime_seconds": 86400
    }
    
    response = client.post("/assess", json=payload)
    print("Status Code:", response.status_code)
    print("Response JSON:")
    print(response.json())
    
    assert response.status_code == 200
    assert "risk_score" in response.json()
    assert "top_contributing_factors" in response.json()

if __name__ == "__main__":
    test_assess_endpoint()


