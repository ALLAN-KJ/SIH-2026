# Demo Script: IPsec Sentinel

**Theme:** "Zero Trust through Mathematical Verification."

## 1. Introduction
- **Judge Pitch:** "We are demonstrating IPsec Sentinel. Everything you are about to see—risk classification, PQC scoring, LLM remediation, and blockchain audit trail—is fully live, end-to-end against real parsed packet data. We are not using mocked data or static dashboards."
- **Novelty:** Explain that our tool bridges the gap between passive packet capture and AI-driven remediation.
- **Beta Feature (Honesty Check):** "We've included an early-stage beta feature: ESP Traffic Anomaly Detection. Using an Isolation Forest trained on real packet size and inter-arrival variances, we can detect anomalous ESP flows without decrypting the payload. Full multi-class protocol classification is future work, but anomaly detection is live today."

## 2. Live Demo: PCAP Upload
- **Action:** Click "Upload PCAP" and select `scenario_critical_legacy.pcap`.
- **Talking Points:**
  - "Notice the parser instantly extracting cryptographic parameters."
  - "The XGBoost model scores this as Critical (99/100)."
  - **SHAP Explanation:** "Why this score? Let's open the Technical Details. This horizontal bar chart is live SHAP (SHapley Additive exPlanations) data proving *exactly* which features the model penalized, ensuring explainable AI."

## 3. Post-Quantum Cryptography (PQC)
- **Action:** Scroll to the PQC panel.
- **Talking Points:** 
  - "NIST and IANA are finalizing ML-KEM identifiers. We score legacy DH groups as 'Classically Vulnerable'."

## 4. LLM Remediation Copilot
- **Action:** Open the Remediation Copilot panel.
- **Talking Points:**
  - "Instead of just telling a network engineer they failed, we provide the exact Cisco IOS configuration needed to fix it."
  - "This is generated live by a Qwen 27B model, fed our exact findings and NIST citations, using robust regex extraction to guarantee a syntactically valid output."

## 5. Blockchain Audit Trail
- **Action:** Scroll to the Audit Log.
- **Talking Points:**
  - "To prevent insider threats from covering up bad configurations, every report is hashed and stored in a Merkle tree."

## 6. Edge Cases & Safety
- **Action:** Attempt to upload a malformed PCAP or use the Active Probe against a public IP.
- **Talking Points:**
  - "Our backend is hardened. It rejects malformed data, and the Active Probe enforces strict authorization checks and rate-limiting to prevent misuse."

## 7. Conclusion
- "IPsec Sentinel brings explainable AI, proactive remediation, and post-quantum readiness to VPN security auditing."
