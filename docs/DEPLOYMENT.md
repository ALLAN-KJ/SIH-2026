# IPsec VPN Protocol Analyzer — Deployment Guide

This document outlines the step-by-step instructions for deploying IPsec VPN Protocol Analyzer to public cloud infrastructure for production or public demo usage.

## Architecture Overview
IPsec VPN Protocol Analyzer consists of two decoupled services:
1. **Frontend:** React + Vite SPA (Static site hosting)
2. **Backend:** FastAPI + Python (Python runtime hosting with persistent storage)

---

## 1. Backend Deployment (Render)

We recommend **Render** for the backend because it natively supports Python and offers easy persistent disk attachment for SQLite.

### Prerequisites
- Push your backend code to a GitHub repository.
- Ensure `requirements.txt` is up-to-date.

### Deployment Steps
1. Log into [Render](https://render.com/) and click **New+** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name:** `ipsec-sentinel-backend` (or your choice)
   - **Environment:** `Python 3`
   - **Root Directory:** *(leave blank)*
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables:**
   - `GROQ_API_KEY`: Your Groq API key for LLM remediation.
   - `CORS_ORIGIN`: *Leave blank for now. We will set this in Step 3 after deploying the frontend.*
   - `PORT`: (Optional) Render sets this automatically.
5. **CRITICAL: Persistent Disk (for Audit Trail)**
   - Scroll down to **Advanced** -> **Disks**.
   - Add a disk:
     - **Name:** `sqlite-data`
     - **Mount Path:** `/data`
     - **Size:** 1 GB (sufficient for audit logs)
   - *Note: If you do not attach a persistent disk, the SQLite `audit.db` will be wiped on every redeploy, breaking the continuous tamper-evident Merkle tree.*
   - Update `audit_trail.py` to point to `/data/audit.db` instead of the local directory (or use an environment variable like `DB_PATH=/data/audit.db`).
6. Click **Create Web Service**. Note the deployed URL (e.g., `https://ipsec-sentinel-backend.onrender.com`).

---

## 1.5. Preventing Render "Spin-Down" (Keep-Alive)

Render's free tier automatically spins down web services after 15 minutes of inactivity. When the next request comes in, the backend experiences a "cold start" which can take 30–60 seconds, leading to a poor demo experience.

To mitigate this during active hours, we have configured a GitHub Actions workflow (`.github/workflows/render-keepalive.yml`) to automatically ping the `/health` endpoint every 10 minutes.

**Trade-off Note: Why we kept the main backend on Render instead of moving to GCP e2-micro**
While we are using a Google Cloud Platform (GCP) e2-micro always-on free instance to host our Active Probe (since Render does not support UDP traffic for `active_probe.py`), we explicitly chose *not* to migrate the main FastAPI machine-learning backend to this GCP instance. 
The GCP e2-micro instance provides only 1GB of RAM. Our backend heavily relies on memory-intensive libraries (`scikit-learn`, `xgboost`, `shap`) and loading these models into memory alongside a FastAPI application on a 1GB VM presents a significant risk of Out-Of-Memory (OOM) crashes. 
Therefore, keeping the main backend on Render (which manages memory swapping and container lifecycle gracefully) and using the GitHub Actions keep-alive ping is the most stable architecture for the SIH demo, despite the minor risk of a cold start if the GitHub Actions cron is delayed.

---
## 2. Frontend Deployment (Vercel)

We recommend **Vercel** for the frontend for zero-config Vite deployments.

### Deployment Steps
1. Log into [Vercel](https://vercel.com/) and click **Add New...** -> **Project**.
2. Connect your GitHub repository and select the `frontend/` directory as the Root Directory.
3. Configure the build settings (Vercel usually auto-detects Vite):
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables:**
   - `VITE_API_BASE_URL`: The URL of your deployed backend (e.g., `https://ipsec-sentinel-backend.onrender.com`).
5. Click **Deploy**. Note the deployed URL (e.g., `https://ipsec-sentinel.vercel.app`).

---

## 3. Finalizing Security (CORS)

Once both services are deployed, you must lock down the backend CORS policy so only your Vercel frontend can call it.

1. Go back to your **Render** dashboard for the Backend service.
2. Navigate to **Environment**.
3. Add/Update the `CORS_ORIGIN` variable to exactly match your Vercel URL:
   - `CORS_ORIGIN` = `https://ipsec-sentinel.vercel.app` (No trailing slash)
4. Restart the backend service.

---

## 4. Post-Deployment Smoke Test Checklist

After deployment, perform this checklist to ensure everything is wired correctly:

- [ ] **1. Upload & Parse:** Upload `scenario_critical_legacy.pcap`. Ensure it parses successfully. If it fails, check the browser console for CORS errors.
- [ ] **2. Risk Assessment:** Ensure the ML model correctly evaluates the risk and displays the SHAP chart.
- [ ] **3. PQC Heuristic:** Check the PQC panel. It should successfully fetch and display the heuristic details.
- [ ] **4. LLM Remediation:** Click "Generate Fix". Wait for the LLM to return the Cisco IOS config. If it times out, verify your `GROQ_API_KEY` is set correctly in Render.
- [ ] **5. Audit Trail Persistence:**
      1. Check the Audit Trail panel to confirm the log was recorded.
      2. Manually trigger a "Manual Deploy" (restart) in Render to cycle the container.
      3. Refresh the web app and check the Audit Trail again. The logs should still be present. If they are gone, your persistent disk is not mounted correctly.
