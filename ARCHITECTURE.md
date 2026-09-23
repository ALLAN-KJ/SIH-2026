# IPsec Sentinel Architecture

## Overview
IPsec Sentinel is an AI-driven, PQC-aware VPN configuration auditor. It captures IKE negotiation traffic and ESP payloads to detect misconfigurations, cryptographic weaknesses, and traffic anomalies without relying on payload decryption.

## Core Components

1. **Frontend (React / Vite)**
   - Dashboard-centric UI using Framer Motion and custom CSS properties.
   - Panels: Upload/Probe, Risk Assessment, PQC Readiness, AI Copilot, Audit Log.
   - Dual-layout PDF report generator (Executive & Technical).

2. **Backend (FastAPI)**
   - `ike_parser.py`: Scapy-based IKEv1/IKEv2 parser. Extracts key lengths, algorithms, DH groups, modes, and IP headers for metadata exposure detection.
   - `risk_engine.py`: Prepares the data for the XGBoost model and calculates SHAP values.
   - `esp_traffic_classifier.py`: Calculates statistical timing/size heuristics and evaluates against an Isolation Forest (anomaly detection) and a Random Forest (multi-class traffic prediction).
   - `llm_copilot.py`: Connects to Groq for NIST-cited remediation steps.

3. **Machine Learning Pipeline**
   - **XGBoost Risk Classifier**: Trained on synthetic IKE parameter sets mapping to Weak, Moderate, Strong, and Critical risk labels.
   - **RandomForest Traffic Classifier**: Predicts traffic type (VoIP, Video, Web, ICMP, Email, WhatsApp) inside ESP tunnels using inter-arrival times and packet size variances.

4. **Data Generation**
   - `generate_testbed.py`: Automates strongSwan IPsec tunnels inside network namespaces and captures traffic using `tshark` to build the synthetic training sets.
