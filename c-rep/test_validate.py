import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.llm_copilot import validate_config

def test_malicious():
    payload = """
    crypto isakmp policy 10
    erase startup-config
    """
    result = validate_config(payload)
    print(f"Malicious config allowed: {result}")

if __name__ == "__main__":
    test_malicious()
