# IPsec VPN Protocol Analyzer Architecture

## Overview
IPsec VPN Protocol Analyzer is an AI-driven, PQC-aware VPN configuration auditor. It captures IKE negotiation traffic and ESP payloads to detect misconfigurations, cryptographic weaknesses, and traffic anomalies without relying on payload decryption.

## Core Components

1. **Frontend (React / Vite)**
   - Dashboard-centric UI using Framer Motion and custom CSS properties.
   - Panels: Upload/Probe, Security Assessment, Cryptographic Strength, Configuration Compliance, Audit Log.
   - Dual-layout PDF report generator (Executive & Technical).

2. **Backend (FastAPI)**
   - `ike_parser.py`: Scapy-based IKEv1/IKEv2 parser. Extracts key lengths, algorithms, DH groups, modes, cleartext IP headers for metadata exposure detection, and Authentication Header (AH) fields.
   - `risk_engine.py`: Prepares the data for the XGBoost model. Loads `xgb_calibrated.joblib` for Platt-scaled confidence scores and `xgb_model.joblib` to calculate SHAP explainability values.
   - `esp_traffic_classifier.py`: Calculates statistical timing/size heuristics and evaluates against a Random Forest (100% multi-class traffic prediction) and an Isolation Forest (anomaly detection).
   - `llm_copilot.py`: Connects to Groq for NIST-cited remediation steps.

3. **Machine Learning Pipeline**
   - **XGBoost Risk Classifier**: Trained on 5,000 synthetic IKE parameter sets mapping to Low, Weak, Moderate, Strong, and Critical risk labels (84% accuracy). Utilizes `CalibratedClassifierCV` (sigmoid) to output realistic 0-100% confidence scores rather than raw, overconfident tree probabilities.
   - **RandomForest Traffic Classifier**: Predicts traffic type (VoIP, Video, Web, ICMP, Email, WhatsApp) inside ESP tunnels using inter-arrival times and packet size variances. Achieves 100% accuracy on a synthetic held-out test split.

4. **Data Generation**
   - `generate_testbed.py`: Automates strongSwan IPsec tunnels inside network namespaces and captures traffic using `tshark` to build the synthetic training sets.
