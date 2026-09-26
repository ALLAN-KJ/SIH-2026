import sqlite3
import requests

BASE_URL = 'http://localhost:8000'

def test_tamper():
    print("\n--- Testing Audit Tamper ---")
    
    # 1. Check initial state
    try:
        # Generate a dummy log
        requests.post(f"{BASE_URL}/log", json={"report_data": {"test": "dummy"}})
        
        # Verify it via dummy verify call (requires any hash just to trigger integrity check)
        v1 = requests.post(f"{BASE_URL}/verify", json={"report_hash": "dummy"})
        print("Before tamper tampered flag:", v1.json()['tampered'])
        print("Before tamper message:", v1.json()['tamper_message'])
        
        # Tamper: modify the last hash
        db_path = 'backend/data/audit.db'
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        c.execute("UPDATE audit_logs SET hash = 'tampered' WHERE id = (SELECT id FROM audit_logs ORDER BY id DESC LIMIT 1)")
        conn.commit()
        conn.close()
        
        # Verify again
        v2 = requests.post(f"{BASE_URL}/verify", json={"report_hash": "dummy"})
        print("After tamper tampered flag:", v2.json()['tampered'])
        print("After tamper message:", v2.json()['tamper_message'])
        
    except Exception as e:
        print(f"Tamper test failed: {e}")

if __name__ == '__main__':
    test_tamper()
