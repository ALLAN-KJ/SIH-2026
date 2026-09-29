import os
import subprocess
import shutil

PROFILES = [
    {"name": "aes128cbc-sha256-modp2048", "ike": "aes128-sha256-modp2048!", "esp": "aes128-sha256!"},
    {"name": "aes256cbc-sha384-modp4096", "ike": "aes256-sha384-modp4096!", "esp": "aes256-sha384!"},
    {"name": "aes128gcm16-prfsha256-ecp256", "ike": "aes128gcm16-prfsha256-ecp256!", "esp": "aes128gcm16-ecp256!"},
    {"name": "aes256gcm16-prfsha384-ecp384", "ike": "aes256gcm16-prfsha384-ecp384!", "esp": "aes256gcm16-ecp384!"},
    {"name": "aes128cbc-sha1-modp1024", "ike": "aes128-sha1-modp1024!", "esp": "aes128-sha1!"}, # Weak
    {"name": "3des-md5-modp1024", "ike": "3des-md5-modp1024!", "esp": "3des-md5!"}, # Legacy
    {"name": "aes128gcm8-prfsha256-modp2048", "ike": "aes128gcm8-prfsha256-modp2048!", "esp": "aes128gcm8-modp2048!"},
    {"name": "aes256cbc-md5-modp1024", "ike": "aes256-md5-modp1024!", "esp": "aes256-md5!"}, # Mixed
]

TRAFFIC_TYPES = ["ICMP", "HTTP", "DNS"]

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TESTS_DIR = os.path.join(BASE_DIR, "tests", "strongswan")
DATASET_DIR = os.path.join(BASE_DIR, "dataset", "real_captures")

os.makedirs(DATASET_DIR, exist_ok=True)

for p in PROFILES:
    profile_dir = os.path.join(TESTS_DIR, p["name"])
    os.makedirs(profile_dir, exist_ok=True)
    
    # Write ipsec.conf
    conf_content = f"""config setup
    charondebug="ike 1, knl 1, cfg 0"
    uniqueids=no

conn %default
    ikelifetime=60m
    keylife=20m
    rekeymargin=3m
    keyingtries=1
    authby=secret
    keyexchange=ikev2

conn test-tunnel
    left=%any
    leftsubnet=0.0.0.0/0
    right=%any
    rightsubnet=0.0.0.0/0
    ike={p["ike"]}
    esp={p["esp"]}
    auto=add
"""
    with open(os.path.join(profile_dir, "ipsec.conf"), "w") as f:
        f.write(conf_content)
        
    # Write ipsec.secrets
    with open(os.path.join(profile_dir, "ipsec.secrets"), "w") as f:
        f.write(": PSK \"secretkey123\"")
        
    for t in TRAFFIC_TYPES:
        out_file = f"real_{p['name']}_{t.lower()}.pcap"
        print(f"Running profile {p['name']} with traffic {t} -> {out_file}")
        cmd = ["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", 
               os.path.join(BASE_DIR, "scripts", "generate_real.ps1"), 
               p['name'], os.path.join(DATASET_DIR, out_file), t]
        
        # We need docker, assuming docker daemon is running on windows or via WSL
        subprocess.run(cmd)

print("Done generating real captures.")
