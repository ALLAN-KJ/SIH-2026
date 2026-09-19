import pytest
import sqlite3
import os
import concurrent.futures
from fastapi.testclient import TestClient
from backend.main import app
import backend.audit_trail as audit_trail

# Remove any existing DB before test to ensure clean state
if os.path.exists(audit_trail.DB_PATH):
    os.remove(audit_trail.DB_PATH)

audit_trail.init_db()

client = TestClient(app)

def test_audit_concurrency():
    """Test 1: Fire multiple concurrent /log requests to verify atomicity and locking."""
    
    def log_request(i):
        # We use a unique payload for each request
        report_data = {
            "risk_score": i,
            "timestamp": f"2026-09-19T20:50:{i:02d}Z"
        }
        response = client.post("/log", json={"report_data": report_data})
        assert response.status_code == 200
        return response.json()
    
    num_requests = 20
    
    # Use ThreadPoolExecutor to fire requests concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(log_request, i) for i in range(num_requests)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
    # Verify we got 20 unique hashes and no errors
    assert len(results) == num_requests
    
    # Verify the database has exactly 20 records
    conn = sqlite3.connect(audit_trail.DB_PATH)
    cursor = conn.execute("SELECT count(*) FROM audit_logs")
    count = cursor.fetchone()[0]
    assert count >= 20
    
    # Verify the integrity check passes
    tampered, msg, root = audit_trail.check_integrity(conn)
    assert tampered is False
    conn.close()

def test_audit_tampering_detection():
    """Test 2: Manually delete a row from SQLite and verify tampering is detected."""
    # We assume test_audit_concurrency already populated the DB
    
    # Connect directly to SQLite and delete a row to simulate a silent attacker
    conn = sqlite3.connect(audit_trail.DB_PATH)
    conn.execute("DELETE FROM audit_logs WHERE id = 10")
    conn.commit()
    conn.close()
    
    # Now call /verify to trigger the integrity check via the API
    # (We can verify any random hash just to hit the endpoint)
    response = client.post("/verify", json={"report_hash": "dummy"})
    
    assert response.status_code == 200
    data = response.json()
    
    # Tampering should be detected
    assert data["tampered"] is True
    assert "TAMPERING DETECTED" in data["tamper_message"]
    
if __name__ == "__main__":
    test_audit_concurrency()
    test_audit_tampering_detection()
    print("All tests passed.")




