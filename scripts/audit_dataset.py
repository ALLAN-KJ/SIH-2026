import os
import csv
from scapy.all import rdpcap, IP, IPv6, UDP, TCP, ESP
import random
import glob

def audit_dataset():
    dataset_dir = os.path.join(os.path.dirname(__file__), '..', 'dataset')
    labels_file = os.path.join(dataset_dir, 'labels.csv')
    
    print("--- PART 1.1: FILE vs LABEL MATCHING ---")
    
    if not os.path.exists(labels_file):
        print(f"ERROR: {labels_file} does not exist.")
        return
        
    labeled_files = {}
    with open(labels_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            labeled_files[row['pcap_file']] = row
            
    print(f"Total entries in labels.csv: {len(labeled_files)}")
    
    # Check physical files
    actual_pcaps = glob.glob(os.path.join(dataset_dir, '*.pcap'))
    actual_files = [os.path.basename(f) for f in actual_pcaps]
    
    print(f"Total physical .pcap files in dataset/: {len(actual_files)}")
    
    missing_files = []
    for label_file in labeled_files.keys():
        if label_file not in actual_files:
            missing_files.append(label_file)
            
    orphaned_files = []
    for actual_file in actual_files:
        if actual_file not in labeled_files:
            orphaned_files.append(actual_file)
            
    print(f"Missing files (in csv but not on disk): {len(missing_files)}")
    print(f"Orphaned files (on disk but not in csv): {len(orphaned_files)}")
    
    # Traffic type distribution
    dist = {}
    for row in labeled_files.values():
        t = row['traffic_type']
        dist[t] = dist.get(t, 0) + 1
    
    print("\nTraffic Type Distribution in labels.csv:")
    for k, v in dist.items():
        print(f"  {k}: {v}")
        
    print("\n--- PART 1.2: MANUAL SCAPY INSPECTION (10 files) ---")
    sample_files = random.sample(list(labeled_files.keys()), min(10, len(labeled_files)))
    for fname in sample_files:
        path = os.path.join(dataset_dir, fname)
        label_info = labeled_files[fname]
        print(f"Inspecting: {fname}")
        print(f"  Claimed Label: Mode={label_info['mode']}, IP={label_info['ip_version']}, Enc={label_info['encryption']}")
        
        try:
            pkts = rdpcap(path, count=50) # Read up to 50 packets
            has_esp = any(ESP in p for p in pkts)
            has_ipv4 = any(IP in p for p in pkts)
            has_ipv6 = any(IPv6 in p for p in pkts)
            has_ike = any(UDP in p and (p[UDP].sport == 500 or p[UDP].dport == 500) for p in pkts)
            
            print(f"  Observed: ESP={has_esp}, IPv4={has_ipv4}, IPv6={has_ipv6}, IKE={has_ike}")
            
            # Simple heuristic checks
            if label_info['ip_version'] == 'IPv4' and not has_ipv4:
                print("  ! MISMATCH: Claimed IPv4 but no IPv4 packets found.")
            if label_info['ip_version'] == 'IPv6' and not has_ipv6:
                print("  ! MISMATCH: Claimed IPv6 but no IPv6 packets found.")
        except Exception as e:
            print(f"  ! ERROR reading pcap: {e}")
            
    print("\n--- PART 1.3: REAL CAPTURES INSPECTION ---")
    real_dir = os.path.join(dataset_dir, 'real_captures')
    if not os.path.exists(real_dir):
        print(f"ERROR: {real_dir} does not exist.")
    else:
        real_pcaps = glob.glob(os.path.join(real_dir, '*.pcap')) + glob.glob(os.path.join(real_dir, '*.pcapng'))
        print(f"Found {len(real_pcaps)} files in real_captures/.")
        for rp in real_pcaps:
            try:
                pkts = rdpcap(rp, count=10)
                if len(pkts) > 1:
                    time_diff = float(pkts[1].time - pkts[0].time)
                    print(f"  File: {os.path.basename(rp)} | Packets: {len(pkts)} (sample) | Jitter between pkt0 & pkt1: {time_diff:.6f}s")
                else:
                    print(f"  File: {os.path.basename(rp)} has < 2 packets.")
            except Exception as e:
                print(f"  ! ERROR reading real pcap {rp}: {e}")

if __name__ == '__main__':
    audit_dataset()
