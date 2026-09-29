# SIH Evaluator Dataset

## Composition
This dataset contains synthetic IPsec/IKEv2 VPN traffic and a subset of real strongSwan captures used for evaluating the Antigravity VPN Risk Assessor. 

- **Synthetic Captures (500 files)**: Generated via Scapy across a variety of cipher suites, modes, and traffic profiles (VoIP, Video, Web, Email, WhatsApp, ICMP) to map to the project matrix.
- **Real Captures (6 files)**: Generated from actual strongSwan Docker instances to test model generalization.
- **Baseline**: Used to calibrate nominal packet timing and sizes.

## Labeling Method
Labels for the synthetic dataset are stored in `labels.csv`, containing the exact configuration parameters (encryption, PFS, DH group, traffic type, etc.).

## File Counts
- `labels.csv`: 500 rows (Synthetic)
- `dataset/*.pcap`: 500 synthetic PCAPs
- `dataset/testbed_configs/*.conf`: 500 generated config templates
- `dataset/real_captures/*.pcap`: 6 real strongSwan captures
