# IPsec VPN Protocol Analyzer VPN Testbed

This document details the synthetic generation of the IPsec VPN configurations and traffic datasets used to test and train the IPsec VPN Protocol Analyzer project.

## Overview
As part of the requirement to evaluate IPsec behavior across multiple modes, encryption algorithms, Diffie-Hellman groups, and traffic profiles, we developed a deterministic generation pipeline.

## Methodology

### 1. Configuration Matrix Generation
The testbed script (`scripts/generate_testbed.py`) programmatically generates `ipsec.conf` templates representing the configurations of strongSwan endpoints.
It varies the following parameters:
- **Operation Mode**: Tunnel, Transport
- **IP Version**: IPv4, IPv6
- **Encryption/Integrity**: AES-128-CBC, AES-256-CBC, AES-256-GCM, 3DES
- **DH Groups**: 14 (2048-bit), 19 (256-bit ECP), 20 (384-bit ECP)
- **Perfect Forward Secrecy (PFS)**: Enabled, Disabled

### 2. Traffic Generation and PCAP Capture
To ensure a scalable and reliable dataset, the testbed utilizes **Scapy** to generate high-fidelity IKEv2 negotiations and ESP (Encapsulating Security Payload) payloads.

> [!WARNING]
> **Important Limitation regarding Traffic Types:**
> The ESP traffic captured in these datasets does **not** contain real application payloads (e.g., actual WhatsApp or VoIP data). Instead, it uses **simulated traffic generators** that replicate the *statistical properties* (packet size, inter-packet arrival time, burstiness) of these applications.

**Simulated Traffic Profiles (Dynamic Ranges):**
To ensure realistic training data for the ESP classifier, the statistical properties of each traffic class are dynamically sampled from overlapping ranges for every generated PCAP.
- **VoIP**: Small packets (100-250 bytes) with low inter-packet time (0.015-0.04s) and low variance.
- **Video**: High bandwidth, large packets (700-1400 bytes), with very frequent bursts (0.002-0.015s).
- **Web Browsing**: Highly variable packet sizes (300-1000 bytes) and bursty timing that deliberately overlaps with Email.
- **ICMP**: Small packets (64-100 bytes) with slow, regular intervals (0.8-1.5s).
- **Email**: Moderate rate, variable size (400-1100 bytes) with timing that can mimic Web browsing behavior.

### 3. Dataset Format
The main output dataset is located in `dataset/`.
It contains:
- `500` PCAP files named using the pattern `tunnel_{id}_{encryption}_{dh}_{traffic}_{ip}_{mode}.pcap`
- `labels.csv`: The ground truth mapping for each PCAP to train the ML models.
- `dataset/testbed_configs/`: The generated `ipsec.conf` files corresponding to each scenario.

### 4. Real-World Validation Captures
To validate the synthetic model against genuine traffic, a separate set of real captures is maintained in `dataset/real_captures/`.
These are generated using actual strongSwan endpoints (via Docker) and captured with `tcpdump`, rather than Scapy.
- **Synthetic vs. Real Training Data**: The ML models are trained entirely on synthetic data constructed from real IETF/NIST-documented IKE parameter combinations (e.g., standard cipher suites and DH groups). We have not yet validated the ESP anomaly detection heuristic against a statistically significant real-world capture dataset. The `dataset/real_captures/` folder contains structural validation tests, but not enough samples to guarantee real-world classification accuracy.

### How to Regenerate
To regenerate the dataset, run:
```bash
.\venv\Scripts\python.exe scripts\generate_testbed.py
```
