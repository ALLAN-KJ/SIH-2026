# IPsec Sentinel: Judge Demo Script (3-5 Minutes)

This script provides a structured walkthrough of the IPsec Sentinel platform to demonstrate the robust architecture, functional AI pipelines, and strict security hygiene to hackathon judges.

## Prep
- Ensure both backend and frontend are running.
- Have the three sample PCAPs ready in a folder (`scenario_critical_legacy.pcap`, `scenario_moderate_transition.pcap`, `scenario_strong_modern.pcap`).
- Open the UI at `http://localhost:5173`.

## Step 1: The "Critical" Scenario (0:00 - 1:30)
1. **Upload `scenario_critical_legacy.pcap`**.
2. **Parsing & ML Risk Score**: Point to the "Critical" risk label. Explain that the XGBoost model has evaluated the parsed IKEv1 parameters and assigned a score of 100 based on CVSS thresholds.
3. **Explainability (SHAP)**: Highlight the top contributing risk factors (e.g., `key_length_bits`, `hash_algorithm_MD5`). Emphasize: *"This isn't a black box. The ML model uses SHAP values to explain exactly why this negotiation is vulnerable."*
4. **LLM Remediation**: Show the LLM Copilot output. Point out how the Groq LLM generated a contextual Cisco IOS configuration snippet to fix the exact issues flagged by the ML model.

## Step 2: The "Strong" Post-Quantum Scenario (1:30 - 2:30)
1. **Upload `scenario_strong_modern.pcap`**.
2. **PQC Readiness**: Point out the PQC Readiness Score. Explain how the platform distinguishes classical Diffie-Hellman groups from quantum-resistant Key Encapsulation Mechanisms (KEMs). 
3. **Honesty on Limitations**: If asked about the specific KEMs, state: *"Because standard IANA identifiers for ML-KEM in IKEv2 are still under IETF draft, we map to the Private Use range (1024+) as the industry currently does in hybrid experimental deployments."*

## Step 3: Security & Immutability (2:30 - 3:30)
1. **Audit Trail**: Show the Merkle Root Hash generated at the bottom of the screen. 
2. **Cryptographic Proof**: Explain that every assessment is cryptographically hashed and appended to a persistent SQLite-backed Merkle tree. *"Even if a bad actor alters the database, the Merkle root mismatch will prove the audit log was tampered with."*

## Step 4: Robustness / Edge Cases (3:30 - 4:00)
1. **Upload `test_unknown.pcap` (or any random non-PCAP file)**.
2. **Input Validation**: Show how the UI gracefully catches the 400 Bad Request error. Explain that the backend enforces strict file size limits (5MB), magic number verification, and rate limiting to prevent abuse.
3. **Secret Hygiene**: Briefly mention that all keys (Groq) are loaded exclusively via environment variables and CORS is strictly enforced to `localhost:5173` in this environment.
