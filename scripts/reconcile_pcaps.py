import os
import csv
import glob
from scapy.all import rdpcap, ESP, UDP

def main():
    dataset_dir = os.path.join(os.path.dirname(__file__), '..', 'dataset')
    labels_file = os.path.join(dataset_dir, 'labels.csv')
    
    # Read existing labels
    existing_labels = []
    labeled_files = set()
    if os.path.exists(labels_file):
        with open(labels_file, 'r') as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            for row in reader:
                existing_labels.append(row)
                labeled_files.add(row['pcap_file'])
    else:
        fieldnames = ["pcap_file", "mode", "ip_version", "encryption", "dh_group", "pfs", "traffic_type"]
        
    print(f"Loaded {len(existing_labels)} existing labels.")
    
    # Get all pcaps
    all_pcaps = glob.glob(os.path.join(dataset_dir, '*.pcap'))
    orphans = [p for p in all_pcaps if os.path.basename(p) not in labeled_files]
    
    # Ignore esp_only and public
    orphans = [p for p in orphans if os.path.basename(p) not in ["esp_only.pcap", "public.pcap"]]
    
    print(f"Found {len(orphans)} orphaned pcaps to reconcile.")
    
    added_count = 0
    deleted_count = 0
    
    for pcap_path in orphans:
        fname = os.path.basename(pcap_path)
        # Check if it's a valid IPSec pcap (ESP and IKE)
        try:
            pkts = rdpcap(pcap_path, count=100)
            has_esp = any(ESP in p for p in pkts)
            has_ike = any(UDP in p and (p[UDP].sport == 500 or p[UDP].dport == 500) for p in pkts)
            
            if has_esp and has_ike:
                # Parse filename: tunnel_{index}_{enc}_{dh}_{traffic}_{ip}_{mode}.pcap
                parts = fname.replace('.pcap', '').split('_')
                if len(parts) >= 7 and parts[0] == 'tunnel':
                    mode = parts[6]
                    ip_v = parts[5]
                    traffic = parts[4]
                    dh = parts[3]
                    enc = parts[2]
                    
                    row = {
                        "pcap_file": fname,
                        "mode": mode,
                        "ip_version": ip_v,
                        "encryption": enc,
                        "dh_group": dh,
                        "pfs": "True",
                        "traffic_type": traffic
                    }
                    existing_labels.append(row)
                    added_count += 1
                else:
                    print(f"Skipping {fname}, bad format.")
            else:
                print(f"Deleting stale pcap {fname} (ESP={has_esp}, IKE={has_ike})")
                os.remove(pcap_path)
                deleted_count += 1
        except Exception as e:
            print(f"Deleting corrupt pcap {fname}: {e}")
            os.remove(pcap_path)
            deleted_count += 1
            
    print(f"Added {added_count} pcaps to labels. Deleted {deleted_count} stale/corrupted pcaps.")
    
    # Rewrite labels.csv
    with open(labels_file, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(existing_labels)
        
    print(f"labels.csv now has {len(existing_labels)} entries.")

if __name__ == "__main__":
    main()
