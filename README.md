# IPsec Sentinel

IPsec Sentinel is a security auditing engine that ingests IPsec VPN negotiation captures (PCAP), parses cryptographic parameters, and evaluates the configuration's security posture using an XGBoost risk classifier. It natively integrates SHAP for explainable scoring, checks against NIST FIPS 203 for Post-Quantum Cryptography (PQC) readiness, and leverages an LLM to generate compliant remediation configurations.

## Features

*   **PQC Readiness Scoring:** Evaluates current configuration against proposed IANA draft identifiers for ML-KEM and estimates vulnerability to Shor's algorithm (Grover search mitigation via AES-256).
*   **Encrypted Traffic Classification:** Machine Learning (Random Forest) model to classify ESP payload traffic types (VoIP, Video, Web, Chat) based on metadata (packet size, inter-arrival time) without decryption.
*   **NIST SP 800-77 Compliance:** Automated evaluation of IPsec parameters (encryption, hash, DH group, SA lifetime, PFS, and Replay Protection capability).
*   **Active Probing:** Generate synthetic IKE handshakes to probe live targets (authorized use only) when PCAP is unavailable.
*   **LLM Remediation Copilot:** Auto-generates vendor-specific (Cisco IOS) CLI configuration fixes to remediate identified vulnerabilities.
*   **Tamper-Evident Audit Trail:** Merkle-tree based cryptographic logging for compliance and forensic integrity.

## Architecture

*   **Frontend:** React 18, Vite, TypeScript, GSAP for UI animation.
*   **Backend:** FastAPI (Python), Scapy (for IKE/ESP parsing), XGBoost & SHAP (for Risk Assessment), scikit-learn (for Traffic Classification).
*   **Dataset Generator:** Python script leveraging Scapy to synthetically generate a wide array of IPsec configurations (Tunnel/Transport mode, IPv4/IPv6, various encryption/hash suites) and ESP payload profiles. See `/dataset/` and `docs/TESTBED.md`.

```text
[PCAP Upload] ──┐
                ├─> (FastAPI Backend)
[Active Probe]──┘          |
  (IKEv2 SA_INIT           +--> [IKE Parser (Scapy)] --> Extracts Config & ESP Metadata
   UDP 500/4500)            |
   + AuthGate               +--> [Risk Engine (XGBoost)] --> Predicts Vulnerability Score
   + RFC1918 check          |         +--> [SHAP Explainer] --> Identifies Top Contributing Factors
   + Rate limit (1/10s)     |
   + Audit log              +--> [Traffic Classifier] --> Predicts ESP Traffic Type via Metadata
                            |
                            +--> [PQC Scorer] --> Assesses NIST KEM Post-Quantum Readiness
                            |
                            +--> [LLM Copilot] --> Generates Vendor-Specific Remediation & NIST Citations
                            |
                            +--> [Audit Logger] -> Commits to SQLite Merkle Tree for Immutable Compliance

## Setup & Execution

### Requirements
- Python 3.10+
- Node.js 18+

### Environment Configuration
Create a `.env` file in the root directory:
```env
GROQ_API_KEY=your_groq_api_key
PORT=8000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173
```

### Backend (API Engine)
```bash
python -m venv venv
# Windows: .\venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt
python -m backend.main
```

### Frontend (Audit Console)
```bash
cd frontend
npm install
npm run dev
```

## Production Deployment
The backend should be deployed using a production ASGI server (e.g., Uvicorn + Gunicorn). Ensure that the `CORS_ORIGIN` is restricted to the production frontend URL. 

The frontend should be built via `npm run build` and served statically. Ensure `VITE_API_BASE_URL` is set during the build step to point to the production backend.

## Limitations
- **PQC KEM Identifiers**: Standardized IKEv2 identifiers for ML-KEM and other FIPS 203 finalists are still evolving. The scorer currently relies on proposed Private Use ranges.
- **SHAP Anomaly Bounds**: Testing with parameters significantly outside the training distribution may result in high variance in feature impact calculations.
- **Active Probe Safety**: The Active Probe feature sends real IKEv2 packets. Default operation is restricted to RFC1918 private and loopback IPs. Never use against unauthorized targets. See [Purpose & Evaluation Guide](docs/PURPOSE.md#active-probe-feature) for full authorization requirements and legal disclaimer.


## Documentation
For further details on architecture, evaluation criteria, and testing guidelines, please see:
- [Purpose & Evaluation Guide](docs/PURPOSE.md)
- [Testing Guidelines](docs/TESTING.md)
- [Deployment Instructions](docs/DEPLOYMENT.md)
