# IPsec VPN Protocol Analyzer - 90-Second Demo Script

## 1. Problem Framing (0:00 - 0:10)
**Action:** Show the dashboard landing page.
**Voiceover:** "Traditional IPsec audits are manual and rigid. IPsec VPN Protocol Analyzer automates this by combining a machine learning risk engine with deep packet inspection to evaluate VPN security in real-time."

## 2. Upload & Sample Selection (0:10 - 0:20)
**Action:** Click the "Run Demo Scenarios" or upload the first sample.
**Voiceover:** "We'll test three distinct scenarios to demonstrate the AI's dynamic scoring."

## 3. Risk Verdict & SHAP Explainability (0:20 - 0:40)
**Action:** Show the results for the three scenarios sequentially.
**Voiceover:** 
- "First, a legacy IKEv1 configuration. The model flags this as **Critical** with a score of **96.04**, correctly identifying weak 3DES encryption and missing PFS."
- "Next, a transition state. The model dynamically adjusts the verdict to **Moderate** with a score of **51.87**, noting improved DH groups but lingering legacy hashes."
- "Finally, a modern IKEv2 setup. The engine confirms it as **Strong** with a score of **5.84**."
**Action:** Hover over the SHAP explainability panel.
**Voiceover:** "Our transparent AI doesn't just give a score; the SHAP panel explains exactly *why* a configuration is risky, exposing the top contributing factors."

## 4. LLM Remediation (0:40 - 0:55)
**Action:** Scroll down to the AI Remediation section.
**Voiceover:** "When vulnerabilities are found, the system's LLM remediation engine instantly generates a secure, drop-in replacement configuration, eliminating the guesswork for network admins."

## 5. PQC Score (0:55 - 1:05)
**Action:** Point to the Post-Quantum Readiness panel.
**Voiceover:** "Simultaneously, the tool assesses Post-Quantum Cryptography readiness, scoring the tunnel against future quantum threats based on algorithmic resilience."

## 6. Blockchain Audit / Tamper-Check (1:05 - 1:20)
**Action:** Show the Export PDF and Audit log.
**Voiceover:** "All verdicts are permanently hashed to an append-only ledger to prevent tampering. Finally, we can export dual Executive and Technical PDF reports with a single click."

## 7. Close (1:20 - 1:30)
**Action:** Return to top of dashboard.
**Voiceover:** "IPsec VPN Protocol Analyzer: Delivering AI-driven, tamper-evident security assessments for the next generation of cryptographic protocols."
