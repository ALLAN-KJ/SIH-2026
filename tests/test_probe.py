import requests

target = "127.0.0.1"
payload = {
    "target_ip": target,
    "auth_confirmation": "I AM AUTHORIZED",
    "override_rfc1918": False
}

try:
    res = requests.post("http://localhost:8000/probe/active", json=payload)
    print(res.status_code)
    print(res.json())
except Exception as e:
    print(f"Error: {e}")
