from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_pqc_endpoint():
    # Classical, totally vulnerable
    payload_bad = {
        "encryption_algorithm": "3DES",
        "key_length_bits": 56,
        "hash_algorithm": "MD5",
        "dh_group": 1
    }
    
    # "Quantum Safe" (at least theoretically scoring 100 on our MVP rubric)
    payload_good = {
        "encryption_algorithm": "AES-256-GCM",
        "key_length_bits": 256,
        "hash_algorithm": "SHA384",
        "dh_group": 1024 # ML-KEM-512
    }
    
    response_bad = client.post("/pqc_score", json=payload_bad)
    print("Vulnerable Test Score:", response_bad.json())
    
    response_good = client.post("/pqc_score", json=payload_good)
    print("Safe Test Score:", response_good.json())

    assert response_bad.status_code == 200
    assert response_bad.json()["pqc_score"] == 0
    assert response_bad.json()["is_quantum_safe"] is False
    assert response_good.json()["pqc_score"] == 100
    assert response_good.json()["is_quantum_safe"] is True

if __name__ == "__main__":
    test_pqc_endpoint()


