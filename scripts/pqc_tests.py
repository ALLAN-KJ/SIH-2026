import requests

BASE_URL = 'http://localhost:8000'

def test_pqc_compliance(filepath):
    print(f"\n--- Testing {filepath} ---")
    with open(filepath, 'rb') as f:
        response = requests.post(f"{BASE_URL}/upload_pcap", files={'file': f})
        
    parsed_data = response.json()
    assess_resp = requests.post(f"{BASE_URL}/assess", json=parsed_data)
    data = assess_resp.json()
    
    pqc_res = requests.post(f"{BASE_URL}/pqc_score", json={
        'encryption_algorithm': parsed_data.get('encryption_algorithm'),
        'key_length_bits': parsed_data.get('key_length_bits'),
        'hash_algorithm': parsed_data.get('hash_algorithm'),
        'dh_group': parsed_data.get('dh_group')
    })
    print("PQC RAW:", pqc_res.json())
        
    rem_res = requests.post(f"{BASE_URL}/remediate", json={
        'risk_label': data.get('risk_label'),
        'flagged_issues': data.get('flagged_issues'),
        'top_contributing_factors': data.get('top_contributing_factors')
    })
    print("REMEDIATE RAW:", rem_res.json())

if __name__ == '__main__':
    test_pqc_compliance('frontend/public/scenario_critical_legacy.pcap')
    test_pqc_compliance('frontend/public/scenario_strong_modern.pcap')
