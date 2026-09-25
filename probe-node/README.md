# Standalone IPsec Probe Node

This directory contains a standalone microservice extracted from the main backend. 

### Why does this exist?
The main IPsec VPN Protocol Analyzer backend is deployed on Render's free tier. Render's free tier (Web Services) natively blocks all outbound UDP traffic. Because active IKEv2 probing requires sending raw UDP packets on port 500, the main backend cannot perform this action when deployed to the cloud.

To resolve this without forcing a paid cloud tier upgrade, the active probe logic has been isolated into this standalone service. 

### Usage
You can deploy this `probe-node` to any host that allows outbound UDP traffic (e.g., your local machine, a Raspberry Pi, or a free-tier VM on GCP/Oracle Cloud). 

Once deployed, simply set the `PROBE_NODE_URL` environment variable on the main Render backend to point to this node's URL (e.g., `http://YOUR_PROBE_IP:8080`). The main backend will seamlessly proxy all active probe requests through this node.

### Running Locally
```bash
# Using Python
pip install -r requirements.txt
python main.py

# Using Docker
docker build -t ipsec-probe-node .
docker run -d --name probe-node -p 8080:8080 ipsec-probe-node
```
