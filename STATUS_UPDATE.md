# SIH Project Status Update - Gap Fixes

## 1. Testbed Coverage
**Status:** ✅ Completed
- Audited `scripts/generate_testbed.py` against the problem statement matrix.
- Added missing representations of AES-GCM (128/256), explicit Integrity variants for CBC, and fully aligned traffic profiles (Web-browsing, Video streaming) with the text.
- Regenerated the 500-file synthetic dataset with these parameters.
- Exported a concrete artifact: `samples/sample.pcap` along with `samples/sample_ground_truth.json` for reference.

## 2. Real Captures & Accuracy
**Status:** ⚠️ Partially Completed (Need local environment)
- Tested automated Dockerized generation of more `strongSwan` captures (`scripts/generate_real.ps1`). Since Docker was inaccessible in this environment (and WSL sudo blocked), we fell back to testing exclusively on the 6 existing real captures (`real_strong*.pcap`, `real_weak*.pcap`).
- Generating more real captures is explicitly noted as a task that needs to run on a local machine with strongSwan installed.
- Created and executed `scripts/eval_real.py` to evaluate the XGBoost model explicitly on these real captures (separated from the synthetic 5000-row tabular dataset).
- **Result:** 6 of 6 real strongSwan captures correctly classified — however, this sample size is too small to claim generalization; real-world validation at scale is still an open item. Do not consider this a 100% accuracy claim.

## 3. Screenshots
**Status:** ✅ Completed
- Wrote a Playwright automation script (`scripts/capture_screenshots.py`) that successfully launched a headless Chromium instance against the local dev server.
- Executed the full analysis flow and captured screenshots of the dashboard.
- The screenshots include the expanded Risk Score panel (with SHAP factors), the Threat Matrix, and the PQC assessment panel.

## 4. Threat Matrix
**Status:** ✅ Completed
- Found `ThreatMatrix.tsx` acting as a static visual mockup instead of a functional matrix.
- Rewrote `ThreatMatrix.tsx` to dynamically iterate through `risk.flagged_issues` (e.g., parsing whether an issue affects Confidentiality, Integrity, or Authentication based on the string content) and map them to severity. 
- It now displays an actual Vulnerabilities vs. CIA Triad table.

## 5. Dataset Deliverable
**Status:** ✅ Completed
- Wrote `DATASET_README.md` containing composition (500 synthetic PCAPs + 6 real PCAPs), labeling methods, and counts.
- Zipped the full payload using PowerShell `Compress-Archive` to `dataset_deliverable.zip`, ready for GitHub Release upload or deck linking.

## 6. Active Probe Scope
**Status:** ✅ Completed
- Validated that the Active Probe migration to a public UDP-capable VPS was not executed (missing `.env` credentials).
- Scoped down the claim in `README.md` to explicitly state: *(Note: Supported on a self-hosted instance; blocked by outbound UDP restrictions on free PaaS tiers like Render/Heroku)*, thereby removing any ambiguity for the evaluator.

## 7. Backend Status Indicator & Keep-Alive
**Status:** ✅ Completed
- **Diagnose:** `Home.tsx` defaulted to an "Offline" or "Online" state based on a 5000ms timeout in `api.ts`. Because Render cold-starts take 50+ seconds, the 5s timeout always resulted in a failed fetch, defaulting the indicator to "Offline" while the backend was merely waking up.
- **Fix:** Increased the timeout in `api.ts` to 60s. Refactored `Home.tsx` state into a 4-state system: `checking`, `waking_up` (if no response within 4 seconds), `online`, and `offline`. The indicator will now actively show "Checking..." and "Waking up..." rather than defaulting incorrectly.
- **Test:** Wrote `test_ui.py` to stop the backend, confirm the UI gracefully hits "Checking..." and then "Offline", and then recovers to "Online" when the backend restarts.
- **Keep-Alive Analysis:** The `.github/workflows/render-keepalive.yml` file is configured with a `*/10 * * * *` cron interval. However, GitHub Actions run logs show severe delays (often skipping runs for hours). The workflow successfully executed 4 hours ago, but is currently practically ineffective due to GitHub's scheduling limits on free tiers. The UI fix natively handles the cold-starts caused by this limitation.

## 8. Threat Matrix and Screenshots Verification
**Status:** ✅ Completed
- **Threat Matrix Verification:** Analyzed `frontend/src/components/panels/ThreatMatrix.tsx`. It correctly processes `flagged_issues` into C-I-A triad pillars. E.g., `hash`, `integrity`, or `hmac` issues map to Integrity; `psk`, `auth`, or `aggressive` map to Authentication; weak ciphers default to Confidentiality. 
- **Screenshot Verification:** A newly engineered script (`scripts/capture_screenshots.py`) correctly navigated the new automatic PCAP upload trigger, uploaded a moderate scenario, and captured:
  - `docs/assets/screenshot_dashboard.png`: Full dashboard displaying the generated AI assessment.
  - `docs/assets/screenshot_risk_shap.png`: Full dashboard showing the SHAP factors horizontally expanded.
