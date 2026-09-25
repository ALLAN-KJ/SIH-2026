# IPsec Sentinel Testing & Validation

## Generalization Testing
We executed the pipeline against a diverse set of PCAPs to ensure robustness against non-standard or edge-case IKE traffic.

| Test Case | Description | Result | Notes |
| :--- | :--- | :--- | :--- |
| **No IKE Traffic** (`test_no_ike.pcap`) | Standard TCP HTTP traffic with no IKE negotiations. | **PASS** (Graceful Error) | The backend correctly raises a 400 Bad Request: `No valid IKE negotiation found`. |
| **Truncated PCAP** (`test_truncated.pcap`) | A PCAP file abruptly truncated mid-negotiation. | **PASS** (Graceful Error) | Fails to parse IKE payloads safely and raises the `No valid IKE negotiation found` validation error. |
| **NAT-T Wrapping** (`test_natt.pcap`) | IKE traffic sent over UDP 4500 with a Non-ESP marker. | **PASS** | Correctly parses and evaluates the encapsulated IKE parameters. |
| **IKEv1 Usage** (`test_ikev1.pcap`) | Explicitly negotiated IKEv1 phase 1 traffic. | **PASS** | Successfully triggers the legacy IKEv1 risk penalties in the ML model. |
| **Vendor Proprietary** (`test_vendor.pcap`) | An IKEv2 packet using an unassigned/proprietary Encryption algorithm ID (250). | **PASS** | Safely maps to "Unknown", outputs 0 for key length, and evaluates without throwing a Type/Validation Error. |

## Adversarial & Edge Case Testing
To ensure the backend cannot be easily crashed or manipulated via malformed traffic, we performed adversarial testing against the `/upload_pcap` endpoint.

| Test Case | Description | Result | Notes |
| :--- | :--- | :--- | :--- |
| **Oversized Payload** (`test_adv_oversized_payload.pcap`) | IKE payload length field set maliciously high to induce OOM. | **PASS** | Scapy parser handles the structure safely; fields map to default/Unknown. |
| **Duplicate SA Proposals** (`test_adv_duplicate_sa.pcap`) | Multiple conflicting SA proposals sent simultaneously. | **PASS** | Extracted safely; resolved `None` key lengths properly without triggering Pydantic 500 errors. |
| **Malformed Transform** (`test_adv_malformed_transform.pcap`) | Transform attribute contains garbage bytes instead of expected length/value. | **PASS** | Gracefully evaluates to "Unknown" values without hanging. |
| **Zip Bomb / Large File** (`test_adv_zip_bomb.pcap`) | 6MB file of random bytes uploaded as a `.pcap`. | **PASS** (Graceful Error) | Backend rejects the file at the FastAPI layer before parsing (413 Payload Too Large) because it exceeds the 5MB strict limit. |
| **Audit DB Tampering** (Manual SQLite Deletion) | Direct manual deletion of a row from `backend/data/audit.db` to test Merkle tree integrity checks. | **PASS** (Tampering Detected) | The backend correctly logs a `CRITICAL AUDIT WARNING` and halts validation. *Note: This was fully verified. For future testing, always use a disposable copy of the DB to avoid permanently poisoning the live demo state!* |
## Known Limitations
* **Synthetic Data Only**: While the test cases above confirm the *pipeline* is structurally robust and fail-safe, the ML model's accuracy on nuanced real-world captures is bounded by its synthetic training set.
* **Partial Decapsulation**: Deeply malformed but cryptographically signed payloads might still bypass rudimentary layer checks, though the Merkle tree auditing ensures we have a permanent record of what was analyzed.

## Active Probe Test Suite

These tests verified the `/probe/active` endpoint (`backend/active_probe.py`) against a live strongSwan Docker container (`tests/strongswan/`).

| Test Case | Description | Result | Notes |
| :--- | :--- | :--- | :--- |
| **Wrong auth phrase** | POST with `auth_confirmation: "wrong phrase"` | **PASS (403 Forbidden)** | Backend rejects with `"Unauthorized: You must explicitly confirm authorization."` before any scanning. |
| **RFC1918 block — public IP** | POST `target_ip: "8.8.8.8"`, no override flag | **PASS (403 Forbidden)** | Blocked with `"Safety restriction: Target is not a private RFC1918 or loopback IP."` |
| **Rate limiting** | Two requests within 10-second window | **PASS (429 Too Many Requests)** | Second request within window returns `"Too many requests. Please wait 10 seconds between probes."` |
| **Live probe — weak profile** | Probe `172.18.0.2` (strongSwan weak: AES-CBC + SHA1 + DH Group 2) | **PASS** | Returns parsed IKE params; pipeline scores Critical/high risk; result flows through full risk/PQC/remediation/audit pipeline. |
| **Live probe — unreachable** | Probe a private IP with no running IKE service | **PASS (504 timeout)** | Returns `"Target unreachable or did not respond to IKEv2 SA_INIT on port 500."` after 5s. Never hangs indefinitely. |

### ⚠️ Disposable DB Rule for Audit Trail Testing
The **Audit DB Tampering** test (manual SQLite row deletion + restart detection) was **verified working** during QA testing. The system correctly detected the tampering and logged `CRITICAL AUDIT WARNING: TAMPERING DETECTED`.

**IMPORTANT for future re-tests**: Always use a *disposable copy* of `backend/data/audit.db` for tampering tests — **never the live demo database**. Steps:
```powershell
# Create disposable copy, test against it, discard
Copy-Item backend\data\audit.db backend\data\audit_test_backup.db
# [run your tampering test against a temp DB path]
# Then delete the disposable copy afterward
Remove-Item backend\data\audit_test_backup.db
```
Failing to follow this rule will poison the live demo database and cause false TAMPERING warnings on every subsequent boot until the DB is manually reset (which was exactly what happened in the pre-SIH QA pass).


## Live Active Probe Testing with Docker

This guide explains how to spin up a local strongSwan VPN target to test the IPsec Sentinel Active Probe feature (/api/probe/active). 

### Prerequisites
- **Docker Desktop** installed and running on your host machine.

### Getting Started
We have provided two pre-configured profiles for the strongSwan responder:
1. **Weak Profile** (	ests/strongswan/docker-compose.weak.yml): Configured with outdated cryptography (3DES / MD5). Scanning this target will produce a **Critical** risk result.
2. **Strong Profile** (	ests/strongswan/docker-compose.strong.yml): Configured with modern cryptography (AES-256-GCM / SHA384). Scanning this target will produce a **Strong** risk result.

### Generating Live Active Probes
The Active Probe feature allows you to send synthetic IKEv2 handshakes to a live target and evaluate the response. By default, this is restricted to RFC1918 private IP addresses.

> [!CAUTION]
> **Authorization Policy:** You must only probe infrastructure that you own or have explicit written authorization to scan. During development, a one-time validation probe was fired at `vpn.strongswan.org` (a publicly documented interoperability test server). **This is NOT the intended pattern for demos or general use.** Do not probe third-party servers. All SIH presentations and normal usage must target your own local strongSwan container or an explicitly authorized cloud VM.

### Testing Locally
If you are running the backend locally (`localhost:8000`), you can simply use the IP address of your local strongSwan Docker container (e.g., `10.5.0.10`).



### Instructions

#### Step 1: Start the Weak Target
Open a terminal in the d:\Antigravity\SIH directory and run:
``powershell
docker compose -f tests\strongswan\docker-compose.weak.yml up -d
``
*Wait a few seconds for the container to initialize. It will bind to your local UDP port 500.*

#### Step 2: Probe the Weak Target
1. Open the IPsec Sentinel Frontend Dashboard.
2. Enter the target IP: 127.0.0.1 (or your local network IP localhost).
3. Click **Scan**.
4. Observe the results. You should see a **Critical** rating based on the 3DES/MD5 configuration.

#### Step 3: Switch to the Strong Target
First, tear down the weak target:
``powershell
docker compose -f tests\strongswan\docker-compose.weak.yml down
``
Then, spin up the strong target:
``powershell
docker compose -f tests\strongswan\docker-compose.strong.yml up -d
``

#### Step 4: Probe the Strong Target
1. Go back to the IPsec Sentinel Dashboard.
2. Click **Scan** again on the same IP (127.0.0.1).
3. Observe the results. You should now see a **Strong** rating.

#### Teardown
When you are finished testing, clean up the environment:
``powershell
docker compose -f tests\strongswan\docker-compose.strong.yml down
``

### Troubleshooting
- **Cannot connect to target / Port closed**: Ensure Windows Defender Firewall is not blocking UDP port 500/4500. You may need to add an explicit allow rule for Docker or the IPsec Sentinel Python backend.
- **Docker Daemon not found**: Make sure Docker Desktop is fully running (whale icon in system tray).
