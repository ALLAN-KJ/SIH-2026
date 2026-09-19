from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_remediate_endpoint():
    payload = {
        "risk_label": "Critical",
        "flagged_issues": ["Weak encryption algorithm: 3DES", "Key length is dangerously short"],
        "top_contributing_factors": {"key_length_bits": 2.16, "encryption_algorithm": 1.95}
    }
    
    response = client.post("/remediate", json=payload)
    print("Status Code:", response.status_code)
    print("Response JSON:")
    print(response.json())
    
    assert response.status_code == 200
    data = response.json()
    assert "explanation" in data
    assert "config_diff" in data
    assert data["config_diff"] != "! No configuration available", "Received the fallback response instead of valid configuration"
    assert "crypto" in data["config_diff"].lower(), "Configuration missing expected IPsec keywords"

if __name__ == "__main__":
    test_remediate_endpoint()


