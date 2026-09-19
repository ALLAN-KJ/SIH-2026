# SIH 2026 Project Evaluation & Decision Matrix

## Part A: Runnable State Verification

### 1. IPsec Sentinel (`d:\Antigravity\SIH`)
- **Backend/Pipeline**: Started successfully. The full E2E pipeline (`test_e2e.py`) successfully uploaded, parsed, assessed risk, and evaluated PQC on the demo PCAPs (e.g., `scenario_critical_legacy.pcap`). The XGBoost risk engine and Scapy parsers functioned as intended.
- **Blockers**: The pipeline execution crashed at the very last step (console logging) with a `UnicodeEncodeError` due to the Windows console (`cp1252`) failing to print a specific unicode character (`\u202f`) returned by the LLM response. This is a cosmetic console printing issue, not a functional logic failure in the pipeline itself.

### 2. Teammate's Project: "IKEv3Analytica" (`d:\Antigravity\SIH-2\SIH-`)
- **Backend**: The backend starts cleanly using `uvicorn`, but only because the global Python environment already contained FastAPI.
- **Dependencies**: The `requirements.txt` is missing crucial libraries claimed by the project's README, notably `scikit-learn`, `fastapi`, and `uvicorn`.
- **Blockers**: Attempting to run the test suite (`py -m pytest`) failed immediately with a `ModuleNotFoundError` because the package structure (`src/ikev3analytica`) is not properly configured for imports. Furthermore, because `scikit-learn` is missing, the ML engine silently fails and falls back to hardcoded `if/else` rules, meaning the pipeline does not actually execute the AI logic advertised.

---

## Part B: Criteria Scoring (1-5)

### 1. Actual Functional Completeness
- **IPsec Sentinel (5/5)**: The full pipeline works end-to-end with real data. The test suite proves the system successfully parses PCAPs and generates predictions using actual serialized models (`xgb_model.joblib`).
- **Teammate's Repo (1/5)**: Functionally incomplete and faked. `pcap_parser.py` blindly falls back to hardcoded algorithms (e.g., `stats["encryption"] = ["AES-256-GCM"...]`) if it fails to parse anything.

### 2. Alignment with the SIH Problem Statement
- **IPsec Sentinel (5/5)**: Directly targets SIH26160 (IPsec VPN Analysis).
- **Teammate's Repo (5/5)**: Also targets SIH26160 (the README is an almost exact clone of IPsec Sentinel's documentation).

### 3. Technical Depth & Sophistication
- **IPsec Sentinel (5/5)**: Uses genuine machine learning (XGBoost) and SHAP explainability. Parses raw packets accurately using Scapy.
- **Teammate's Repo (1/5)**: The machine learning is completely faked. `risk_classifier.py` wraps the model loading in a `try/except` block; when it fails (due to missing `sklearn`), it silently defaults to a deterministic `if/else` cybersecurity rule fallback. 

### 4. Code Quality and Error Handling
- **IPsec Sentinel (4/5)**: Excellent modularity, though docked one point for the unhandled `UnicodeEncodeError` on Windows consoles during LLM output printing.
- **Teammate's Repo (2/5)**: Poor import structures prevent tests from running out of the box. Ironically, it does handle the missing `sklearn` dependency gracefully (by faking the results rather than crashing).

### 5. UI/UX and Presentation Readiness
- **IPsec Sentinel (5/5)**: Features a fully structured React/Vite frontend ready to be launched via the included `start.ps1` script.
- **Teammate's Repo (3/5)**: Has a frontend directory, but it appears hastily constructed and lacks the component depth of IPsec Sentinel.

### 6. Honesty and Documentation of Limitations
- **IPsec Sentinel (5/5)**: Accurately documents its limitations (e.g., PQC KEM identifiers, SHAP anomaly bounds) in the README.
- **Teammate's Repo (1/5)**: Highly dishonest. The README advertises Random Forest models, but the code is explicitly designed to fake ML predictions using hardcoded rules because the ML dependencies are entirely absent.

### 7. Deployability
- **IPsec Sentinel (4/5)**: Includes a `start.ps1` script that reliably boots both the frontend and backend.
- **Teammate's Repo (2/5)**: README instructs users to activate a virtual environment (`.\venv\Scripts\Activate.ps1`), but no `venv` or setup script is provided in the repository.

---

## Part C: Final Recommendation

**Recommendation**: The team should submit **IPsec Sentinel**.

**Rationale**: IPsec Sentinel is a genuinely functional, highly sophisticated project with real machine learning models, accurate packet parsing, and honest documentation. The teammate's repository is largely a cloned shell; it copies IPsec Sentinel's documentation but fakes the core technical components (falling back to hardcoded `if/else` rules instead of real AI, and faking PCAP parse results).

**Standout Feature to Salvage**: The teammate's repository includes an interesting `/api/packet/probe` endpoint in `server.py` that utilizes an active `IKEv1Scanner` and `IKEv2Scanner` to craft and transmit live IKE Scapy datagrams to a target gateway. This active scanning capability would be a fantastic addition to IPsec Sentinel's purely passive (PCAP-based) analysis. Porting this feature would likely take 4-8 hours of work.
