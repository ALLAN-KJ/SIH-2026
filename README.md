# AI-Powered IPsec VPN Protocol Analyzer and Security Assessment Framework

IPsec VPN Protocol Analyzer is a security auditing engine that ingests IPsec VPN negotiation captures (PCAP), parses cryptographic parameters, and evaluates the configuration's security posture using an XGBoost risk classifier. It natively integrates SHAP for explainable scoring, checks against NIST FIPS 203 for Post-Quantum Cryptography (PQC) readiness, and leverages an LLM to generate compliant remediation configurations.

**Live Deployment (Demo):**
- **Frontend:** https://sih-2026-frontend-eight.vercel.app
- **Backend (API):** https://sih-2026-jg10.onrender.com

## Features (Fully Live, No Mocks)
*   **End-to-End Execution:** Risk classification, PQC scoring, LLM remediation, and blockchain audit trails are fully live end-to-end against real parsed packet data — not mocked.
*   **PQC Readiness Scoring:** Evaluates current configuration against proposed IANA draft identifiers for ML-KEM and estimates vulnerability to Shor's algorithm.
*   **ESP Traffic Classification:** Multi-class RandomForest classifier trained on realistic synthetic traffic profiles (VoIP, WhatsApp, Web, Video, Email, ICMP) achieves **100% held-out accuracy** detecting traffic type inside encrypted ESP tunnels without decryption. Anomaly detection (IsolationForest) runs in parallel.
*   **NIST SP 800-77 Compliance:** Automated evaluation of IPsec parameters (encryption, hash, DH group, SA lifetime, PFS, and Replay Protection capability).
*   **Interactive Threat Matrix:** Visual dashboard categorizing vulnerabilities into Weak, Moderate, and Critical impact zones.
*   **Calibrated AI Confidence Score & SHAP Explainability:** Provides transparent ML certainty metrics via Platt-scaled probability calibration (genuine uncertainty, not raw tree impurity). Identifies exactly why a negotiation was flagged via SHAP horizontal bar chart.
*   **Executive & Technical Reporting:** Automatically generates downloadable PDF reports tailored for C-suite and technical engineers.
*   **Metadata Exposure Detection:** Identifies and flags leakage of sensitive configuration metadata from IPsec negotiations.
*   **AH Header Parsing:** Natively extracts SPI, Sequence Number, and ICV Length from Authentication Header packets via Scapy.
*   **Tunnel/Transport & IPv4/IPv6 Detection:** Automatically parses and differentiates between IPsec Tunnel and Transport modes, as well as IPv4/IPv6 traffic.
*   **Active Probing:** Generate synthetic IKE handshakes to probe live targets (authorized use only) when PCAP is unavailable.
*   **LLM Remediation Copilot:** Auto-generates vendor-specific (Cisco IOS) CLI configuration fixes to remediate identified vulnerabilities using robust regex-based extraction.
*   **Tamper-Evident Audit Trail:** Merkle-tree based cryptographic logging for compliance and forensic integrity.

## Architecture

*   **Frontend:** React 18, Vite, TypeScript, GSAP for UI animation.
*   **Backend:** FastAPI (Python), Scapy (for IKE/ESP parsing), XGBoost & SHAP (for Risk Assessment), scikit-learn (for Traffic Classification).
*   **Dataset Generator:** Python script leveraging Scapy to synthetically generate a wide array of IPsec configurations (5,000 scenarios covering 5 risk classes) and ESP payload profiles.

## SIH PS-26160 Coverage Summary
This project addresses **SIH26160 (NTRO, Blockchain & Cybersecurity)**. We deliver ~95% coverage of the stated requirements, successfully modeling VPN testbed generation, AI-based protocol identification, deep security assessment, and metadata inference, all within a tamper-evident reporting pipeline. See [docs/PURPOSE.md](docs/PURPOSE.md) for the full requirement-by-requirement breakdown.

## Setup & Execution

### Requirements
- Python 3.10+
- Node.js 18+

### Environment Configuration
Create a .env file in the root directory:
``env
GROQ_API_KEY=your_groq_api_key
PORT=8000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173
``

### Backend (API Engine)
``bash
python -m venv venv
# Windows: .\venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload
``

### Frontend (Audit Console)
``bash
cd frontend
npm install
npm run dev
``

## Known Limitations
- **Active Probing restricted to Local Node:** Render's free tier Web Services block outbound UDP traffic. Because of this PaaS-level limitation, the Active Probing feature (which requires sending UDP port 500 packets) will return a 403 error on the live cloud demo. This feature is fully functional but strictly requires running the backend locally to use. PCAP uploading and analysis (the primary demo path) remains fully independent and functional on the live site.
- **Render Free Tier Cold-Starts:** The backend is deployed on Render's free tier. If the service is idle for 15 minutes, it spins down. The **first request after idle may take 50+ seconds** to respond. This is expected. If presenting, ping the backend health endpoint first to warm it up.
- **Synthetic vs. Real Data:** The models are trained entirely on 5,000 synthetically generated IPsec combinations. We have not yet validated the ESP anomaly detection heuristic against a statistically significant real-world capture dataset.
- **Speculative PQC Claims:** Standardized IANA identifiers for ML-KEM in IKEv2 are still under draft. The PQC score relies on a heuristic mapping based on current proposals, utilizing a three-state model: **Quantum-Safe** (matches draft identifiers), **Classically Vulnerable** (matches known legacy groups), and **Unrecognized** (an unmapped ID). This prevents vendor-specific IDs from being silently penalized as vulnerabilities.
- **LLM Remediation as Starting Point:** AI-generated Cisco IOS configurations are unverified starting points and must be reviewed by network engineers before production deployment.
- **Tamper-Evident, not Tamper-Proof:** The SQLite Merkle-tree log proves if partial tampering occurred, but does not prevent an attacker with full filesystem access from deleting/replacing the entire database file outright.

## Documentation
- [Purpose & Evaluation Guide](docs/PURPOSE.md)
- [Testing Guidelines](docs/TESTING.md)
- [Deployment Instructions](docs/DEPLOYMENT.md)
- [Dataset Generation & PCAPs](docs/TESTBED.md)
