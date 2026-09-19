# Live Active Probe Testing with Docker

This guide explains how to spin up a local strongSwan VPN target to test the IPsec Sentinel Active Probe feature (`/api/probe/active`). 

## Prerequisites
- **Docker Desktop** installed and running on your host machine.

## Getting Started
We have provided two pre-configured profiles for the strongSwan responder:
1. **Weak Profile** (`tests/strongswan/docker-compose.weak.yml`): Configured with outdated cryptography (3DES / MD5). Scanning this target will produce a **Critical** risk result.
2. **Strong Profile** (`tests/strongswan/docker-compose.strong.yml`): Configured with modern cryptography (AES-256-GCM / SHA384). Scanning this target will produce a **Strong** risk result.

## Instructions

### Step 1: Start the Weak Target
Open a terminal in the `d:\Antigravity\SIH` directory and run:
```powershell
docker compose -f tests\strongswan\docker-compose.weak.yml up -d
```
*Wait a few seconds for the container to initialize. It will bind to your local UDP port 500.*

### Step 2: Probe the Weak Target
1. Open the IPsec Sentinel Frontend Dashboard.
2. Enter the target IP: `127.0.0.1` (or your local network IP `localhost`).
3. Click **Scan**.
4. Observe the results. You should see a **Critical** rating based on the 3DES/MD5 configuration.

### Step 3: Switch to the Strong Target
First, tear down the weak target:
```powershell
docker compose -f tests\strongswan\docker-compose.weak.yml down
```
Then, spin up the strong target:
```powershell
docker compose -f tests\strongswan\docker-compose.strong.yml up -d
```

### Step 4: Probe the Strong Target
1. Go back to the IPsec Sentinel Dashboard.
2. Click **Scan** again on the same IP (`127.0.0.1`).
3. Observe the results. You should now see a **Strong** rating.

### Teardown
When you are finished testing, clean up the environment:
```powershell
docker compose -f tests\strongswan\docker-compose.strong.yml down
```

## Troubleshooting
- **Cannot connect to target / Port closed**: Ensure Windows Defender Firewall is not blocking UDP port 500/4500. You may need to add an explicit allow rule for Docker or the IPsec Sentinel Python backend.
- **Docker Daemon not found**: Make sure Docker Desktop is fully running (whale icon in system tray).
