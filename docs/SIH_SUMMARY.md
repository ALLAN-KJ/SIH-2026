# IPsec Sentinel — SIH Project Summary

## 1. Problem Statement Targeted
**SIH26160 (NTRO, Blockchain & Cybersecurity)**
The problem statement asks for the development of a solution to detect, analyze, and mitigate vulnerabilities in VPN cryptography (specifically IPsec/IKE), with an emphasis on anticipating the threat posed by quantum computers (Shor's algorithm) breaking classical cryptography. It demands a tool capable of auditing configurations and providing actionable, secure remediation.

## 2. Architecture Overview
IPsec Sentinel is decoupled into a frontend SPA and a Python backend.

### Backend Modules (`backend/`)
- **`main.py`**: The FastAPI entry point. Handles the `upload_pcap` and `assess` endpoints. Routes data through the XGBoost ML pipeline using `preprocessor.joblib` and `xgb_model.joblib`.
- **`active_probe.py`**: The live scanning engine. Uses `scapy` to craft and send raw IKEv2 SA_INIT packets over UDP 500 to a target IP, capturing the response and converting it into a temporary PCAP for the standard parsing pipeline.
- **`ike_parser.py`**: The ingestion engine. Uses Scapy and Pyshark to dissect IKEv1/IKEv2 PCAP payloads and extract negotiated cryptographic suites (Encryption, Hash, DH Group).
- **`pqc_scorer.py`**: The quantum-readiness engine. Evaluates the extracted DH Groups and key lengths against proposed IANA KEM identifiers and symmetric strength heuristics to estimate post-quantum resilience.
- **`llm_copilot.py`**: The remediation engine. Integrates with the Groq API (Qwen model) to generate NIST SP 800-77 compliant Cisco IOS configuration diffs based on the ML SHAP values. Includes a `validate_config()` safety gate.
- **`audit_trail.py`**: The compliance engine. Implements a SQLite-backed Merkle tree. Appends report hashes to `audit.db` and manages atomic `EXCLUSIVE` transactions to detect historical tampering.

### Frontend Components (`frontend/src/`)
- **`App.tsx`**: The main application shell. Handles the "Passive PCAP" vs "Active Target Probe" routing, file uploads, and GSAP-driven layout animations.
- **`components/panels/`**: 
  - `RiskPanel.tsx`: Renders the ML score, risk severity, and SHAP value breakdown chart.
  - `PQCPanel.tsx`: Renders the quantum-readiness status of the Encryption, Hash, and Key Exchange algorithms.
  - `LLMPanel.tsx`: Renders the AI-generated remediation text and configuration diff.
  - `AuditPanel.tsx`: Renders the tamper-evident Merkle root, report hash, and DB integrity status.
- **`components/SihDemoModal.tsx`**: A self-contained, interactive guided walkthrough of the platform for failsafe demonstrations.

## 3. Full Feature List (Live Status)
- **Passive PCAP Analysis (Parse/Risk/PQC/Remediate/Audit):** ✅ Working
- **Active Probe (Live Scanning):** ✅ Working
- **Active Probe Authorization Gate & RFC1918 Restriction:** ✅ Working 
- **Guided Demo Modal:** ✅ Working
- **Audit Trail Persistence + Tamper Detection:** ✅ Working (Accurately detects both row deletion and hash modification).
- **Security Controls (CORS/Secrets/Input Validation):** ⚠️ Partially Working (CORS is secure, but `validate_config()` input validation is overly strict and blocks valid commands like `access-list`).
- **UI/UX Layout:** ✅ Working (Landing page renders fully with no ghost elements following recent CSS Grid fixes).

## 4. Tech Stack (Verified)
**Backend:**
- Python 3
- `fastapi==0.141.1` & `uvicorn==0.52.4`
- `xgboost==3.4.1`, `scikit-learn==1.9.1`, `shap==0.52.0`
- `scapy==2.7.0` & `pyshark==0.6`
- `groq==1.7.0`
- SQLite (built-in `sqlite3`)

**Frontend:**
- Node / React
- `react==19.2.8`
- `vite==8.3.0`
- `tailwindcss==4.3.3`
- `gsap==3.15.0`
- `three==0.186.0` (for background effects)

## 5. Known Limitations
- **Synthetic Training Data:** The XGBoost model is trained on a synthetic dataset constructed from IETF/NIST combinations, not a real-world labeled traffic corpus.
- **Speculative PQC Standards:** IANA identifiers for ML-KEM are still drafts. The PQC score is heuristic (Symmetric keys >= 256 bits, Hashes >= 384 bits).
- **LLM Remediation as Starting Point:** AI-generated configs are unverified. A prompt edge-case causes the LLM to hallucinate vulnerabilities (e.g. citing IKEv1) when presented with a perfectly secure config.
- **Tamper-Evident vs Tamper-Proof:** The DB detects partial manipulation via Merkle roots, but cannot prevent a full DB file replacement by a root-level attacker.
- **Active Probe Cloud Reachability:** Docker Desktop on Windows natively blocks UDP NAT responses to host Python sockets. Cloud deployments or native Linux environments are required for full end-to-end routing.

## 6. Deployment Status
**Not Deployed.** The project is currently strictly local. `docs/DEPLOYMENT.md` contains instructions for Render/Vercel deployment, but no live instances are currently hosted.

## 7. Project History (Brief)
1. **Initial Architecture:** Backend parsing pipeline and ML risk assessment built.
2. **Groq Integration:** LLM Copilot added for automated remediation.
3. **Security Hardening:** Merkle-tree SQLite audit trail implemented for tamper evidence.
4. **Active Probe Build:** Migrated from passive-only to active UDP scanning using `scapy`. Safety gates (RFC1918, Rate Limiting) added.
5. **UI Redesign:** GSAP animations and UI layout revamped, leading to a temporary regression where cards became invisible ghost elements.
6. **Bug Fixes:** Ghost element CSS fixed. Scapy `IKEv2_Proposal` logic patched to fix Active Probe timeouts. Frontend API call updated to allow external scanning overrides for testing.
