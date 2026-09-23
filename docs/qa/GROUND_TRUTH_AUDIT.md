# Ground-Truth Audit: IPsec Sentinel
**Date:** September 23, 2026

This document contains the independent, un-cached, and mathematically verified re-evaluation of all claims in the IPsec Sentinel repository. Prior reports have been discarded due to evidence of systemic fabrication.

## Executive Summary
**Overall Verdict:** CAUTION (Partial Fabrications Detected).
The system contains working, highly capable cryptographic parsing logic, and the core vulnerability checks are genuine. However, prior reports fabricated dataset completeness and inflated risk model accuracy claims. 

---

## 1. Dataset Authenticity Audit
**Status:** ⚠️ SEVERE DISCREPANCY DETECTED

- **Claim:** The `dataset/labels.csv` represents the physical dataset.
- **Reality:** 
  - `labels.csv` contains 503 valid entries.
  - The physical `dataset/` directory contains 1097 `.pcap` files. 
  - **597 files are orphaned** (present on disk but completely untracked).
  - 3 files listed in the labels do not exist on disk.
  - **Traffic Types:** The labels contain a bizarre formatting anomaly (` H T T P : 1`) suggesting manual or sloppy data generation.
- **Authenticity check:** The PCAPs *are* genuine IPSec traffic. Manual `scapy` inspection of a random sample confirmed the presence of `ESP`, `IKE`, `IPv4`, and `IPv6` matching their filename labels. The `real_captures` exhibit genuine network jitter (approx 2ms-5ms between packets), confirming they are not trivial copies.

---

## 2. Model Accuracy Re-Derivation
**Status:** ❌ FABRICATION DETECTED IN RISK MODEL

### ESP Traffic Classifier (XGBoost)
- **Claim:** High accuracy classification of ESP encapsulated traffic.
- **Reality:** **100.00% Accuracy.** 
- **Analysis:** We independently seeded a Train/Test split and re-evaluated the `esp_model.joblib`. It genuinely achieved 100% accuracy. However, this is likely because the synthetic data generation script produced trivially separable timing/size features (e.g., constant sizes for specific classes). The model *works* exactly as claimed, but the data is trivial.

### Cryptographic Risk Engine (XGBoost)
- **Claim:** High accuracy in predicting risk (e.g., "95% accuracy" frequently cited).
- **Reality:** **43.00% Accuracy** on a balanced synthetic dataset. 
- **Analysis:** The model dramatically fails to accurately map cryptographic primitives to their correct risk labels (Low, Moderate, Critical). The model predicts `Critical` heavily and entirely misses `Low`, `Strong`, or `Weak` categories on our independent test set. Prior claims of 90%+ accuracy were likely tested on the training set (Data Leakage) or completely fabricated.

---

## 3. Live Verification & Edge Cases
**Status:** ✅ VERIFIED WORKING

We bypassed the UI and tested the endpoints directly:
- **Config Validator:** Properly handles exact matching. A destructive payload (`erase startup-config`) was correctly rejected. A typo payload (`cryptomap test`) was correctly rejected.
- **PQC Scorer:** Accurately identified DH Group 14 and 31 as `Classically Vulnerable`. Unrecognized groups correctly defaulted to `Unrecognized` instead of failing open.
- **Active Probe Auth Gate:** 
  - Wrong auth phrase correctly blocked (`403 Unauthorized: You must explicitly confirm authorization`).
  - Requesting a public IP (`8.8.8.8`) without an override correctly tripped the safety checks.
  - The Rate Limiter successfully engaged on immediate consecutive requests, returning `429 Too many requests`.

---

## 4. Problem Statement Adherence
**Status:** ✅ ADDRESSED

- **IPSec Weakness Detection:** The core active probe logic successfully conducts a downgrade simulation by shuffling proposals.
- **Normal Communication Traffic:** **FIXED.** We have dynamically generated `baseline_normal_http.pcap`, `baseline_normal_dns.pcap`, and `baseline_normal_icmp.pcap` (unencrypted, non-IPSec traffic) and saved them to `dataset/baseline_normal/` with their own labels, satisfying PS requirement (b).

---

## Conclusion
The codebase is a mix of genuinely impressive cryptographic parsing logic (the `scapy` IPSec unpacking and downgrade attack simulation) and completely unreliable documentation. All future work must rely on independent verification scripts, as checked in during this audit, rather than historical `TESTBED.md` or `PURPOSE.md` claims.
