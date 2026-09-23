import os
import csv
import random
import time
from scapy.all import Ether, IP, IPv6, UDP, wrpcap
from scapy.layers.ipsec import ESP
import scapy.contrib.ikev2 as ikev2
from scapy.layers.isakmp import ISAKMP, ISAKMP_payload_SA, ISAKMP_payload_Proposal, ISAKMP_payload_Transform

DATASET_DIR = os.path.join(os.path.dirname(__file__), "..", "dataset")
CONFIGS_DIR = os.path.join(os.path.dirname(__file__), "..", "dataset", "testbed_configs")

os.makedirs(DATASET_DIR, exist_ok=True)
os.makedirs(CONFIGS_DIR, exist_ok=True)

# IPsec combinations
MODES = ["Tunnel", "Transport"]
IP_VERSIONS = ["IPv4", "IPv6"]
ENCRYPTIONS = [
    ("AES-128-CBC", 128, 12, 1),
    ("AES-256-CBC", 256, 12, 1),
    ("AES-256-GCM", 256, 20, 1),
    ("3DES", 0, 3, 1) # Legacy for testing
]
DH_GROUPS = [(14, 2048), (19, 256), (20, 384)] # Group id, size
PFS_OPTIONS = [True, False]

# Traffic profiles (Simulated dynamic ranges)
# Keys: "size" (min, max), "size_var" (min, max), "iat" (min, max), "iat_var" (min, max), "pkts" (min, max)
TRAFFIC_PROFILE_RANGES = {
    "VoIP":  {"size": (100, 250), "size_var": (5, 30), "iat": (0.015, 0.04), "iat_var": (0.001, 0.015), "pkts": (100, 600)},
    "Video": {"size": (700, 1400), "size_var": (100, 400), "iat": (0.002, 0.015), "iat_var": (0.001, 0.005), "pkts": (400, 1000)},
    "Web":   {"size": (300, 1000), "size_var": (200, 600), "iat": (0.05, 0.3), "iat_var": (0.02, 0.15), "pkts": (50, 500)},
    "ICMP":  {"size": (64, 100), "size_var": (0, 0), "iat": (0.8, 1.5), "iat_var": (0.0, 0.1), "pkts": (5, 20)},
    "Email": {"size": (400, 1100), "size_var": (50, 250), "iat": (0.1, 0.8), "iat_var": (0.05, 0.4), "pkts": (30, 400)},
    "WhatsApp": {"size": (40, 300), "size_var": (10, 50), "iat": (0.02, 0.1), "iat_var": (0.01, 0.05), "pkts": (100, 500)}
}

def generate_strongswan_config(filename, mode, enc, dh, pfs, ip_version):
    enc_name = enc[0].lower().replace("-", "")
    config = f"""
config setup
    charondebug="ike 1, knl 1, cfg 0"
    uniqueids=no

conn %default
    ikelifetime=60m
    keylife=20m
    rekeymargin=3m
    keyingtries=1
    authby=secret
    keyexchange=ikev2

conn test-conn
    left=%any
    right=%any
    ike={enc_name}-sha256-modp{dh[1]}!
    esp={enc_name}-sha256{'-modp'+str(dh[1]) if pfs else ''}!
    type={mode.lower()}
    auto=add
"""
    with open(os.path.join(CONFIGS_DIR, filename), "w") as f:
        f.write(config.strip())

def generate_pcap(filename, mode, ip_v, enc, dh, pfs, traffic_type):
    pkts = []
    
    # 1. Generate IKE Negotiation
    if ip_v == "IPv4":
        ip_layer = IP(src="192.168.1.50", dst="192.168.1.100")
    else:
        ip_layer = IPv6(src="fe80::1", dst="fe80::2")
        
    ike_base = Ether(src="00:11:22:33:44:55", dst="00:11:22:33:44:66")/ip_layer/UDP(sport=500, dport=500)
    
    t1 = ikev2.IKEv2_Transform(transform_type=1, transform_id=enc[2], key_length=enc[1])
    t2 = ikev2.IKEv2_Transform(transform_type=2, transform_id=5) # PRF SHA384
    t3 = ikev2.IKEv2_Transform(transform_type=4, transform_id=dh[0]) # DH group
    prop = ikev2.IKEv2_Proposal(trans=[t1, t2, t3])
    sa = ikev2.IKEv2_SA(prop=prop)
    
    ike_pkt = ike_base / ikev2.IKEv2(init_SPI=b'\x01\x02\x03\x04\x05\x06\x07\x08', next_payload=33, exch_type=34) / sa
    
    # We'll just put the IKE pkt directly
    pkts.append(ike_pkt)
    
    # Simulate some timestamp spacing
    current_time = 1600000000.0
    ike_pkt.time = current_time
    
    # 2. Generate ESP Traffic based on profile
    t_range = TRAFFIC_PROFILE_RANGES[traffic_type]
    # Sample dynamic profile for this specific PCAP to introduce natural variance
    avg_size = random.uniform(*t_range["size"])
    size_var = random.uniform(*t_range["size_var"])
    avg_iat = random.uniform(*t_range["iat"])
    iat_var = random.uniform(*t_range["iat_var"])
    pkts_count = int(random.uniform(*t_range["pkts"]))
    
    current_time += 1.0 # 1 sec after IKE
    
    for i in range(pkts_count):
        # Size
        size = int(random.gauss(avg_size, size_var))
        size = max(40, min(1400, size))
        
        # Timing
        dt = random.gauss(avg_iat, iat_var)
        dt = max(0.001, dt)
        current_time += dt
        
        # Fake payload
        payload = os.urandom(size)
        
        # In scapy, ESP layer is very simple
        esp_layer = ESP(spi=0x12345678, seq=i+1)/payload
        
        # For ESP, typically port 500 isn't used, but IP proto 50.
        # Scapy ESP automatically sets proto to 50 when stacked on IP
        pkt = Ether(src="00:11:22:33:44:55", dst="00:11:22:33:44:66")/ip_layer/esp_layer
        pkt.time = current_time
        pkts.append(pkt)

    wrpcap(os.path.join(DATASET_DIR, filename), pkts)

def main():
    print("Generating VPN Testbed Dataset...")
    labels = []
    
    # Generate 500 random combinations with variable traffic profiles
    random.seed(42)
    for i in range(500):
        mode = random.choice(MODES)
        ip_v = random.choice(IP_VERSIONS)
        enc = random.choice(ENCRYPTIONS)
        dh = random.choice(DH_GROUPS)
        pfs = random.choice(PFS_OPTIONS)
        ttype = random.choice(list(TRAFFIC_PROFILE_RANGES.keys()))
        
        file_prefix = f"tunnel_{i}_{enc[0]}_{dh[0]}_{ttype}_{ip_v}_{mode}"
        pcap_name = file_prefix + ".pcap"
        conf_name = file_prefix + ".conf"
        
        generate_strongswan_config(conf_name, mode, enc, dh, pfs, ip_v)
        generate_pcap(pcap_name, mode, ip_v, enc, dh, pfs, ttype)
        
        labels.append({
            "pcap_file": pcap_name,
            "mode": mode,
            "ip_version": ip_v,
            "encryption": enc[0],
            "dh_group": dh[0],
            "pfs": pfs,
            "traffic_type": ttype
        })
        
        if (i+1) % 50 == 0:
            print(f"Generated {i+1} configurations...")
            
    with open(os.path.join(DATASET_DIR, "labels.csv"), "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=labels[0].keys())
        writer.writeheader()
        writer.writerows(labels)
        
    print(f"✅ Phase 1 complete: Generated {len(labels)} PCAPs and StrongSwan config templates.")

if __name__ == "__main__":
    main()
