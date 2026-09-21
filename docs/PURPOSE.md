# IPsec Sentinel: Project Purpose & Evaluation Guide

This document serves as an evaluation guide for Smart India Hackathon (SIH) judges to understand the purpose, architecture, and current state of the IPsec Sentinel project.

## The Problem
As quantum computing matures, classical cryptography (like RSA and current Diffie-Hellman groups) used in VPNs is at risk of "harvest now, decrypt later" attacks. Additionally, legacy VPN deployments often suffer from critical misconfigurations (e.g., using DES, MD5, or lacking Perfect Forward Secrecy) that lead to immediate compromise. 

**IPsec Sentinel** is an AI-powered SOC (Security Operations Center) protocol analyzer that operates in two modes: passive ingestion of captured PCAP files, and active live probing of real IKE gateways. It provides:
1. **Machine Learning Risk Assessment**: An XGBoost model trained to detect complex combinations of misconfigurations. Includes an **Interactive Threat Matrix** to categorize impact zones and an **AI Confidence Score** (via SHAP) to show prediction certainty.
2. **Estimated Post-Quantum Readiness Assessment**: Estimates if the negotiated Key Exchange Mechanisms (KEMs) withstand Shor's algorithm, based on proposed IANA KEM identifiers (not yet finalized).
3. **LLM Remediation Copilot**: Generates NIST SP 800-77 compliant router configurations dynamically via Groq.
4. **Tamper-Evident Audit Trail**: Persists logs using a local SQLite Merkle tree structure to ensure historical analysis records are tamper-evident.
5. **Active Live Probe** (`/api/probe/active`): Crafts and sends a real IKEv2 SA_INIT packet to a target gateway (UDP 500), captures the response, and feeds it through the identical risk/PQC/remediation/audit pipeline as the passive PCAP flow. Requires explicit authorization confirmation. Default safety restriction: only RFC1918 private IPs and loopback are probed without an explicit override flag.
6. **Reporting & Exposure Detection**: Provides **Executive and Technical report generation**, flags **Metadata exposure** risks in IPsec negotiations, and automatically parses **Tunnel vs. Transport modes** and **IPv4 vs. IPv6** traffic.

## Pipeline Architecture
The pipeline is fully integrated and end-to-end. There are NO mocked paths for the risk scoring, PCAP parsing, or LLM generation.

1. **PCAP Parsing (`ike_parser.py`)**: Parses standard Scapy `ikev2` or `ISAKMP` payloads. Extracts transforms (Encryption, Hash, DH Group). *If no valid IKE negotiation is found, the system halts with a 400 Bad Request.* (Note: ESP-only captures where the tunnel is already established are outside current scope; analysis relies on the IKE handshake).
2. **Feature Preprocessing & XGBoost Classification (`main.py`)**: Transforms extracted data using the trained `preprocessor.joblib`. Evaluates using `xgb_model.joblib`. Uses `shap` to output exactly *why* a decision was made.
3. **PQC Scoring (`pqc_scorer.py`)**: Uses an explicit mapping of known DH groups to quantum-vulnerable or quantum-safe categories.
4. **Remediation (`llm_copilot.py`)**: Given the SHAP values and flagged issues, calls the Groq API to generate a `cisco_ios.conf` diff to fix the identified vulnerabilities.
5. **Auditing (`audit_trail.py`)**: Appends the report hash to a SQLite-backed Merkle tree, returning the unforgeable root hash.

## Active Probe Feature

IPsec Sentinel includes an **Active Live Probe** mode (endpoint: `POST /probe/active`) that sends a real IKEv2 SA_INIT packet to a target gateway and parses the live response through the same pipeline as a PCAP upload.

### Authorization Gate (Dual: Frontend + Backend)
The probe **cannot fire** without all three of the following:
1. User enters a valid target IP/hostname.
2. User checks an explicit ownership/authorization checkbox.
3. User types the exact phrase `I AM AUTHORIZED` into the confirmation field.

The backend independently validates the phrase — **frontend-only validation is never trusted**. Any mismatch returns HTTP 403.

### Safety Defaults
- **RFC1918 restriction**: By default, only private IPs (`10.x`, `172.16–31.x`, `192.168.x`) and loopback are permitted. Probing a public IP without explicitly setting `override_rfc1918: true` returns HTTP 403.
- **Rate limit**: Maximum 1 probe per 10 seconds per client session; additional requests within the window return HTTP 429.
- **Strict timeout**: The probe socket has a 5-second timeout. Unreachable targets return HTTP 504, never hang.

### Accountability Logging
Every probe attempt (authorized or blocked) is logged to a **separate file** (`backend/data/active_probe_audit.log`) with timestamp, target IP, and authorization phrase. This log is **never mixed** into the VPN-risk SQLite audit trail.

### Legal Disclaimer
> ⚠ **This tool sends real network packets. Unauthorized scanning may constitute a criminal offence under India's Information Technology Act (Sections 43 and 66) and equivalent laws in other jurisdictions. You must only probe systems you own or have explicit written authorization to test. The default RFC1918 restriction is a safety gate, not a substitute for legal compliance.**

## Evaluation Notes & Known Limitations
For evaluation, use the provided demo PCAPs (`scenario_critical_legacy.pcap`, `scenario_moderate_transition.pcap`, `scenario_strong_modern.pcap`), or upload your own IKEv1/IKEv2 PCAP.

* **Synthetic vs. Real Training Data**: The ML model was predominantly trained on 500 synthetically generated IPsec configurations and ESP traffic profiles (constructed from real IETF/NIST-documented combinations). A small validation set of genuinely real IPsec captures (generated via strongSwan Docker containers and tcpdump) exists in `dataset/real_captures/` to ground the ESP classifier's accuracy on non-simulated traffic. On a small preliminary validation set of 2 real strongSwan captures (not yet at a scale to claim statistical significance), the ESP classifier correctly classified 2/2 samples. This is an encouraging early signal but does not substitute for a larger real-world validation study.
* **Speculative PQC Claims (Heuristic Scoring)**: Standardized IANA identifiers for ML-KEM and other FIPS 203 finalists in IKEv2 are still under draft. The PQC score is an explicit heuristic evaluation relying on three factors: 1) Symmetric key length &ge; 256 bits (resists Grover's), 2) Hash digest size &ge; 384 bits, and 3) Key Exchange Group classification. It strictly rejects classical Diffie-Hellman groups as vulnerable to Shor's algorithm, relying instead on proposed Private Use ranges (e.g. 1024 for ML-KEM-512) for safe KEMs. Note: All three demo scenarios show PQC Safe: False because classical DH key exchange is not quantum-safe regardless of key size.
* **Arbitrary Risk Score Weighting**: The 0-100 continuous risk score is a designed scoring convention mapped to CVSS v3.1 qualitative severity band midpoints (e.g., Strong=0, Moderate=50, Weak=75, Critical=100) applied over the XGBoost probabilities, rather than a value derived purely from ML calibration.
* **LLM Remediation Limitations**: AI-generated configurations are unverified starting points. While the backend performs a basic syntax and keyword check, the output is not guaranteed to be safe for production without manual human review.
* **Tamper-Evident vs. Tamper-Proof**: The audit trail uses SQLite `EXCLUSIVE` transactions to guarantee atomic, thread-safe writes preventing concurrency races. A secondary `root_history` table allows the system to detect if rows in the primary log are silently deleted or modified, surfacing a "TAMPERING DETECTED" alert on startup and in the UI. However, this still does not protect against an attacker with full file-system access who can consistently rewrite both the data table and the root-history table in the SQLite file. It is tamper-evident against partial manipulation, but not fully tamper-proof against full DB replacement.
* **XGBoost SHAP Compatibility**: If testing extremely anomalous inputs, SHAP tree explainers may flag standard parameters as anomalies if they fall too far out of the distribution of the synthetic dataset.

## Deployment
**Live Deployment (Demo):**
- **Frontend:** https://sih-2026-frontend-eight.vercel.app
- **Backend (API):** https://sih-2026-jg10.onrender.com

The backend can be started locally via:
```bash
cd backend
uvicorn main:app --reload
```
*(Uses `PORT`, `HOST`, and `CORS_ORIGIN` environment variables).*

The frontend static bundle can be built via:
```bash
npm run build
```
*(Requires `VITE_API_BASE_URL` at build time).*

## SIH PS-26160 Alignment Checklist
*(Verified against the SIH 26160 NTRO IPsec Sentinel requirements)*

### (a) VPN Testbed Generation
- **Requirement:** Produce tunnels across Tunnel/Transport mode, AES-128/256/GCM/CBC+HMAC, multiple DH groups, PFS on/off, IPv4 AND IPv6. -> **Fully Covered** (100 permutations in /dataset/).
- **Requirement:** Multiple traffic types represented (VoIP, web, video, ICMP, email). -> **Fully Covered** (Labels map dynamically across 5 classes).

### (b) Traffic Capture
- **Requirement:** Includes IKE negotiation packets AND ESP packets. -> **Fully Covered** (Extracted dynamically via Scapy).
- **Requirement:** "Normal communication" (non-VPN baseline traffic). -> **Not Covered** (System focuses strictly on IPsec traffic and ESP variance analysis).

### (c) AI-Based Protocol Identification
- **Requirement:** IPsec protocol, IKE version, Tunnel vs Transport, Encryption/Auth algorithms, DH groups, SA parameters. -> **Fully Covered** (Extracted via ike_parser.py).
- **Requirement:** Predict type of traffic inside ESP. -> **Fully Covered** (Random Forest ESP classifier trained on inter-arrival time and packet length).

### (d) Security Assessment
- **Requirement:** Cryptographic strength, config compliance, SA evaluation, Key lifetime, Replay protection, PFS detection, Cipher suite strength, Metadata exposure. -> **Fully Covered** (Analyzed via XGBoost model and explicit compliance rules matching NIST SP 800-77).

### (e) Output Requirements
- **Requirement:** Security score, Traffic analysis, Metadata inference, Executive & Technical Reports, Risk Score, Threat Matrix, AI Confidence Score. -> **Fully Covered** (Fully integrated into React Dashboard with PDF Export).
