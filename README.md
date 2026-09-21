# IPsec Sentinel

IPsec Sentinel is a security auditing engine that ingests IPsec VPN negotiation captures (PCAP), parses cryptographic parameters, and evaluates the configuration's security posture using an XGBoost risk classifier. It natively integrates SHAP for explainable scoring, checks against NIST FIPS 203 for Post-Quantum Cryptography (PQC) readiness, and leverages an LLM to generate compliant remediation configurations.

**Live Deployment (Demo):**
- **Frontend:** https://sih-2026-frontend-eight.vercel.app
- **Backend (API):** https://sih-2026-jg10.onrender.com

## Features

*   **PQC Readiness Scoring:** Evaluates current configuration against proposed IANA draft identifiers for ML-KEM and estimates vulnerability to Shor's algorithm.
*   **Encrypted Traffic Classification:** Machine Learning (Random Forest) model to classify ESP payload traffic types (VoIP, Video, Web, Email, ICMP) based on metadata without decryption.
*   **NIST SP 800-77 Compliance:** Automated evaluation of IPsec parameters (encryption, hash, DH group, SA lifetime, PFS, and Replay Protection capability).
*   **Interactive Threat Matrix:** Visual dashboard categorizing vulnerabilities into Weak, Moderate, and Critical impact zones.
*   **AI Confidence Score & SHAP Explainability:** Provides transparent ML certainty metrics and identifies exactly why a negotiation was flagged.
*   **Executive & Technical Reporting:** Automatically generates downloadable reports tailored for C-suite and technical engineers.
*   **Metadata Exposure Detection:** Identifies and flags leakage of sensitive configuration metadata from IPsec negotiations.
*   **Tunnel/Transport & IPv4/IPv6 Detection:** Automatically parses and differentiates between IPsec Tunnel and Transport modes, as well as IPv4/IPv6 traffic.
*   **Active Probing:** Generate synthetic IKE handshakes to probe live targets (authorized use only) when PCAP is unavailable.
*   **LLM Remediation Copilot:** Auto-generates vendor-specific (Cisco IOS) CLI configuration fixes to remediate identified vulnerabilities.
*   **Tamper-Evident Audit Trail:** Merkle-tree based cryptographic logging for compliance and forensic integrity.

## Architecture

*   **Frontend:** React 18, Vite, TypeScript, GSAP for UI animation.
*   **Backend:** FastAPI (Python), Scapy (for IKE/ESP parsing), XGBoost & SHAP (for Risk Assessment), scikit-learn (for Traffic Classification).
*   **Dataset Generator:** Python script leveraging Scapy to synthetically generate a wide array of IPsec configurations and ESP payload profiles.

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
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
``

### Frontend (Audit Console)
``bash
cd frontend
npm install
npm run dev
``

## Known Limitations
- **Synthetic vs. Real Data:** The models were trained predominantly on 500 synthetically generated IPsec combinations. We have performed an initial validation against a small sample of 2 real-world strongSwan captures (2/2 correct classification) as an encouraging preliminary signal, but this is not yet a statistically significant sample size for real-world guarantees.
- **Speculative PQC Claims:** Standardized IANA identifiers for ML-KEM in IKEv2 are still under draft. The PQC score relies on a heuristic mapping based on current proposals.
- **LLM Remediation as Starting Point:** AI-generated Cisco IOS configurations are unverified starting points and must be reviewed by network engineers before production deployment.
- **Tamper-Evident, not Tamper-Proof:** The SQLite Merkle-tree log proves if partial tampering occurred, but does not prevent an attacker with full filesystem access from deleting/replacing the entire database file outright.

## Documentation
- [Purpose & Evaluation Guide](docs/PURPOSE.md)
- [Testing Guidelines](docs/TESTING.md)
- [Deployment Instructions](docs/DEPLOYMENT.md)
- [Dataset Generation & PCAPs](docs/TESTBED.md)
