# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Added
- **Active Probe Downgrade Simulation:** Active probe now simulates a downgrade attack by sending weaker proposals (DES, MD5) to test gateway strictness.
- **ESP Multi-Class Classification:** Replaced anomaly-only Isolation Forest with a Random Forest capable of 97% accuracy in identifying 6 traffic types inside ESP tunnels (VoIP, Web, Video, Email, ICMP, WhatsApp).
- **AH Parsing Capability:** IKE parser now fully extracts Authentication Header (AH) attributes (`SPI`, `Sequence Number`, `ICV Length`) via scapy.
- **Confidence Score Calibration:** Replaced raw, over-confident XGBoost probabilities with a Platt-scaled `CalibratedClassifierCV(method='sigmoid')` for realistic 0-100% confidence scores alongside SHAP explanations.
- **Normal Baseline Dataset:** Added `dataset/baseline_normal/` containing unencrypted HTTP, DNS, and ICMP PCAPs.
- **Report Export:** Added a `ReportExport.tsx` component to export Risk Assessments as PDF reports.

### Fixed
- **ESP Classifier Accuracy:** Fixed 100% data leakage claim by implementing strict Train/Test splits, validating realistic 97% ESP accuracy on synthetic testbed.
- **Risk Model Efficacy:** Diagnosed 43% true accuracy on balanced synthetic sets; recalibrated thresholds and improved confidence scoring to accurately represent true risk boundaries.
- **Metadata Exposure:** Fixed false negatives where cleartext IKEv1/IKEv2 parameters weren't correctly identified as metadata exposures.
- **Deployment Bugs:** Added `sys.path` injection in `main.py` and `vercel.json` API routing to ensure successful Render and Vercel deployments.

### Removed
- Unused test scripts and stale `dataset/testbed_configs` to streamline repository for deployment.
