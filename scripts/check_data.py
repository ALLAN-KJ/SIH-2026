import pandas as pd
import os
import glob

# 1. Check class balance in synthetic dataset
df_synth = pd.read_csv("backend/data/ipsec_synthetic_dataset.csv")
print("Synthetic Dataset Class Balance:")
print(df_synth['risk_label'].value_counts())

# 2. Check labels.csv
df_labels = pd.read_csv("dataset/labels.csv")
print("\nlabels.csv Traffic Types:")
print(df_labels['traffic_type'].unique())

# 3. Check orphaned/missing pcaps
pcap_files = glob.glob("dataset/*.pcap")
pcap_basenames = [os.path.basename(p) for p in pcap_files]
labeled_pcaps = df_labels['pcap_file'].tolist()

missing_from_disk = [p for p in labeled_pcaps if p not in pcap_basenames]
orphaned_pcaps = [p for p in pcap_basenames if p not in labeled_pcaps and not p.startswith("public.pcap") and not p == "esp_only.pcap"]

print(f"\nTotal labeled in csv: {len(labeled_pcaps)}")
print(f"Total pcaps on disk: {len(pcap_files)}")
print(f"Missing from disk ({len(missing_from_disk)}): {missing_from_disk[:10]}")
print(f"Orphaned pcaps ({len(orphaned_pcaps)}): {orphaned_pcaps[:10]}")
