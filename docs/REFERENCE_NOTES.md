# Reference Repositories Notes

## 1. CipherLens
- **Description**: Appears to be a comprehensive project blueprint/starter for the SIH 26160 problem statement itself. Contains a full stack including `frontend`, `backend`, `testbed`, `supabase` integration, and detailed documentation (`PITCH_PREP.md`, `TASKS_overall.md`).
- **Tech Stack**: React/Next.js (implied by frontend/backend split and `supabase`), Markdown docs.
- **License**: MIT License
- **Relevance**: Highly relevant for the Dashboard, LLM Remediation Copilot module, and overall architectural scaffolding.

## 2. IKEv3Analytica
- **Description**: Next-generation analysis and enumeration framework for IPsec VPNs. Replaces older tools with a modern Python engine supporting IKEv1 and IKEv2. Supports auto-enumeration, XAUTH brute force, risk scoring, and structured reporting.
- **Tech Stack**: Python 3.10+, Docker.
- **License**: MIT License (As declared in `README.md`)
- **Relevance**: Highly relevant for the core IPsec parsing engine, risk scoring rules, and packet analysis techniques.

## 3. iker
- **Description**: A classic IPsec/IKE enumeration tool. Analyzes IKE phase 1, identifies vendor IDs, and enumerates transform sets. 
- **Tech Stack**: Python, shell scripts, legacy `ike-scan` wrapping.
- **License**: GNU General Public License v3 (GPLv3)
- **Relevance**: Useful for understanding legacy IKE protocol parsing. **Warning**: Due to GPLv3, direct vendoring into our project would require our project to also be open-sourced under GPLv3. Must use strictly for reference/study.
