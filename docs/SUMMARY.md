# IPsec Sentinel — Technical Summary

This document provides a comprehensive technical overview of the IPsec Sentinel application, based on a code-level investigation of the repository. It is intended for reviewers and developers to understand the system architecture, core pipeline logic, data flows, and current limitations.

## 1. Project Structure

The project is structured as a full-stack web application with a Python-based AI backend and a React frontend.

**Backend Files:**
- `main.py`: The FastAPI backend entry point that orchestrates the machine learning models and API endpoints.
- `ike_parser.py`: Contains the logic for parsing `.pcap` network capture files using the Scapy library to extract IKE (Internet Key Exchange) negotiation parameters.
- `pqc_scorer.py`: Contains the logic for the Post-Quantum Cryptography readiness assessment.
- `llm_copilot.py`: Contains the LLM integration logic for generating remediation plans.
- `audit_trail.py`: Implements the Merkle-tree based audit logging system.
- `generate_dataset.py` & `eda_and_training.py`: Scripts used to generate synthetic training data and train the XGBoost models.
- `*.joblib` (`xgb_model.joblib`, `preprocessor.joblib`, etc.): Serialized machine learning models and preprocessors loaded at startup.
- `scenario_*.pcap`: Sample PCAP files (`scenario_critical_legacy.pcap`, `scenario_moderate_transition.pcap`, `scenario_strong_modern.pcap`) representing different security states for demo testing.

**Frontend Files:**
- `frontend/`: The root directory for the Vite + React frontend.
- `frontend/src/App.tsx`: The main UI view, which includes specialized components (`RiskPanel`, `PQCPanel`, `LLMPanel`, `AuditPanel`).
- `frontend/src/api.ts`: An abstraction layer that orchestrates the multi-step HTTP calls to the backend API.
- `frontend/src/types.ts`: TypeScript definitions enforcing rigid type structures for API payloads.

## 2. Backend Architecture

The backend is built with **FastAPI** (`main.py`) and is designed around a modular routing architecture. It uses `uvicorn` as the ASGI server. 

**Entry Point (`main.py`):**
Upon startup, the backend globally loads the pre-trained ML models and processors (`joblib` files) and initializes a `shap.TreeExplainer` for generating AI explainability metrics.

**API Routes:**
- `POST /upload_pcap`: Accepts a binary PCAP file, saves it to a temporary file, and passes it to `ike_parser.py` to extract IPsec parameters.
- `POST /assess`: Receives IPsec parameters, preprocesses them, and runs them through the XGBoost classifier to generate a risk score and SHAP impact values.
- `POST /remediate` (via `llm_copilot.py`): Generates a NIST-compliant remediation plan based on the risk score and SHAP factors.
- `POST /pqc_score` (via `pqc_scorer.py`): Assesses the parameters against quantum computing threats.
- `POST /log` & `POST /verify` (via `audit_trail.py`): Hashes the final analysis report and manages the Merkle tree for audit verification.

## 3. Core Pipeline (Execution Step-by-Step)

When a PCAP file is uploaded, the backend executes the following pipeline:

### Step 1: PCAP Parsing (`ike_parser.py`)
- Uses the **Scapy** library (`rdpcap`, `IKEv2`, `ISAKMP` layers).
- Scans the PCAP until it finds the *first* IKE SA negotiation packet.
- Extracts fields: `ike_version`, `ike_mode`, `encryption_algorithm`, `key_length_bits`, `hash_algorithm`, `dh_group`, `auth_method`, `pfs_enabled`, and `sa_lifetime_seconds`.

### Step 2: Risk Scoring (`main.py`)
- The extracted parameters are fed into a Scikit-Learn `ColumnTransformer` (scaling and one-hot encoding).
- The transformed data is passed to the **XGBoost** model (`predict_proba`).
- **Risk Score Calculation:** The score (0-100) is calculated using a weighted sum of the predicted probabilities for the classes (`Strong`=0, `Moderate`=50, `Weak`=75, `Critical`=100).
- **SHAP Explanations:** A SHAP `TreeExplainer` extracts the impact values of individual features for the predicted class. The top three features by absolute impact are identified and returned to explain *why* a connection was flagged.

### Step 3: Post-Quantum Readiness Assessment (`pqc_scorer.py`)
- Starts with a base score of 100 and applies penalty deductions based on known quantum vulnerabilities:
  - **Symmetric Encryption:** Checks against Grover's algorithm (Requires key lengths >= 256 bits, else deducts 30 points).
  - **Hashing:** Deducts 20 points if the hash is not `SHA384` or `SHA512`.
  - **Key Exchange:** Checks against Shor's algorithm. Deducts 50 points if the Diffie-Hellman (DH) group is <= 31 (classical DH groups).
- Outputs a 0-100 score and a boolean `is_quantum_safe`.

### Step 4: LLM Remediation Plan Generation (`llm_copilot.py`)
- Constructs a prompt containing the Risk Label, Flagged Issues, and Top Contributing SHAP factors.
- **Implementation detail:** Currently, it returns a deterministic, hardcoded mock response (including an explanation, a NIST SP 800-77 Rev. 1 citation, and a Cisco IOS config diff). This guarantees the MVP demo never fails due to LLM rate limits.

### Step 5: Blockchain / Merkle Logging (`audit_trail.py`)
- Serializes the entire analysis report to JSON and generates a **SHA-256** hash.
- Appends the hash to an in-memory list (`audit_logs`) and recalculates a simple **Merkle Root**.
- "Tamper-proof" in this context means a third party can query `/verify` with a hash to mathematically prove whether that specific report existed in the tree at the time of calculation.

## 4. Frontend Architecture

The frontend is a Single Page Application (SPA) built with **React 19, TypeScript, and Vite**, styled using **Tailwind CSS v4**.

- **Dashboard Components:** `App.tsx` contains the main layout and state management. It renders four decoupled presentation components: `RiskPanel` (displays score and SHAP text values), `PQCPanel` (displays quantum readiness and criteria status), `LLMPanel` (displays the mock LLM output and Cisco config snippet), and `AuditPanel` (displays the Merkle hash).
- **API Orchestration (`api.ts`):** 
  - Abstracts all `fetch` calls.
  - Implements an optimized asynchronous flow: it first uploads the PCAP and assesses the risk sequentially. Then, it calls the `remediate` and `pqc_score` endpoints in **parallel** using `Promise.all()`. Finally, it executes the `/log` call.
- **Rendering:** Values like SHAP impacts and risk scores are displayed using dynamic Tailwind color classes based on the severity label (e.g., Critical = Red, Strong = Green).

## 5. Data Flow Diagram

```text
1. [User] uploads `.pcap` file in the Browser.
2. [Frontend] api.ts -> POST /upload_pcap with FormData(file)
3. [Backend] main.py -> calls ike_parser.parse_ike_negotiation()
4. [Backend] Returns IPsecRequest JSON to Frontend.
5. [Frontend] api.ts -> POST /assess with IPsecRequest JSON
6. [Backend] main.py -> preprocessor.transform() -> model.predict_proba() -> explainer.shap_values()
7. [Backend] Returns AssessResponse JSON to Frontend.
8. [Frontend] api.ts -> PARALLEL EXECUTION:
      a. POST /remediate -> [Backend] llm_copilot.build_prompt() -> Returns RemediateResponse
      b. POST /pqc_score -> [Backend] pqc_scorer.evaluate_pqc_readiness() -> Returns PQCResponse
9. [Frontend] api.ts -> POST /log with combined Report JSON
10. [Backend] audit_trail.log_report() -> hashlib.sha256() -> compute_merkle_root()
11. [Backend] Returns AuditLogResponse to Frontend.
12. [Frontend] App.tsx updates React state -> Renders Panels to [User]
```

## 6. Dependencies

**Python (Backend):**
- `fastapi` & `uvicorn`: API routing and ASGI web server.
- `scapy`: Network packet parsing and inspection.
- `pandas` & `numpy`: Data manipulation for ML processing.
- `scikit-learn` & `xgboost`: Machine learning models and preprocessing pipelines.
- `shap`: Game-theoretic approach for explaining ML model predictions.
- `joblib`: Serialization for loading trained ML models.
- `pydantic`: Data validation and schema enforcement.

**Node.js / npm (Frontend):**
- `react` & `react-dom` (v19): UI library.
- `vite`: Build tool and dev server.
- `tailwindcss` (v4) & `@tailwindcss/vite`: Utility-first CSS framework.

## 7. Known Gaps & TODOs

During the investigation, several limitations and hardcoded shortcuts were identified that should be addressed before a production release:

- **Mocked LLM Integration:** `llm_copilot.py` does not currently make real API calls to an LLM (e.g., OpenAI/Anthropic). It returns a static string and a hardcoded Cisco config snippet regardless of the input data.
- **In-Memory Audit Trail:** The Merkle tree in `audit_trail.py` uses a simple Python list (`audit_logs = []`). This means the entire audit history is lost every time the FastAPI server restarts. It needs a persistent database or actual blockchain integration.
- **Naïve PCAP Parsing:** `ike_parser.py` stops execution as soon as it detects the *first* IKE packet and uses simplified logic (e.g., hardcoding `AES-CBC` if `exch_type == 2`). A robust implementation would deeply inspect payload attributes instead of making assumptions.
- **Static PQC Logic:** `pqc_scorer.py` assumes any Diffie-Hellman group greater than 31 is a quantum-safe KEM (Key Encapsulation Mechanism). This logic is speculative and lacks true cryptographic mapping to actual NIST PQC standards (like Kyber).
- **ML Class Probability Weights:** The final 0-100 risk score in `main.py` is calculated via hardcoded dictionary weights (`Strong: 0, Moderate: 50, Weak: 75, Critical: 100`) multiplied by class probabilities, rather than using a pure regression model output.
