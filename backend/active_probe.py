import time
import os
import tempfile
import ipaddress
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from scapy.all import IP, UDP, sr1, wrpcap
import scapy.contrib.ikev2 as ikev2
from backend.ike_parser import parse_ike_negotiation
from starlette.concurrency import run_in_threadpool

router = APIRouter()

RATE_LIMIT_DB = {}

def check_rate_limit(request: Request, limit: int = 1, window: int = 10):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    if client_ip not in RATE_LIMIT_DB:
        RATE_LIMIT_DB[client_ip] = []
    RATE_LIMIT_DB[client_ip] = [t for t in RATE_LIMIT_DB[client_ip] if now - t < window]
    if len(RATE_LIMIT_DB[client_ip]) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait 10 seconds between probes.")
    RATE_LIMIT_DB[client_ip].append(now)

class ActiveProbeRequest(BaseModel):
    target_ip: str
    auth_confirmation: str
    override_rfc1918: bool = False

def log_audit_attempt(target_ip: str, auth_confirmation: str, success: bool, reason: str = ""):
    log_path = os.path.join(os.path.dirname(__file__), "data", "active_probe_audit.log")
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    with open(log_path, "a") as f:
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        f.write(f"[{timestamp}] Target: {target_ip} | Auth: '{auth_confirmation}' | Allowed: {success} | Reason: {reason}\n")

def _make_proposal(prop_num: int, enc_id, enc_keylen: int, integ_id, prf_id, dh_id) -> "ikev2.IKEv2_Proposal":
    """Build a single well-formed IKEv2 SA proposal with one combination of transforms."""
    enc = ikev2.IKEv2_Transform(transform_type='Encryption', transform_id=enc_id)
    if enc_keylen:
        enc.key_length = enc_keylen  # IKEv2_Transform has key_length as a native field
    
    integ = ikev2.IKEv2_Transform(transform_type='Integrity', transform_id=integ_id)
    prf = ikev2.IKEv2_Transform(transform_type='PRF', transform_id=prf_id)
    dh = ikev2.IKEv2_Transform(transform_type='GroupDesc', transform_id=dh_id)
    
    prop = ikev2.IKEv2_Proposal(proposal=prop_num, proto='IKE', trans_nb=4, trans=enc/integ/prf/dh)
    return prop



def craft_and_send_probe(target_ip: str, target_port: int) -> str:
    import socket
    
    # Proposal 1: Strong — AES-256/SHA2-256/PRF-SHA2-256/MODP-2048 (modern)
    prop1 = _make_proposal(1, 'AES-CBC', 256, 'SHA2-256-128', 'PRF_HMAC_SHA2_256', '2048MODPgr')
    
    # Proposal 2: Moderate — AES-128/SHA1/PRF-SHA1/MODP-1536 (transitional)
    prop2 = _make_proposal(2, 'AES-CBC', 128, 'HMAC-SHA1-96', 'PRF_HMAC_SHA1', '1536MODPgr')
    
    # Proposal 3: Weak — 3DES/MD5/PRF-MD5/MODP-1024 (matches legacy strongSwan weak profile)
    prop3 = _make_proposal(3, '3DES', 0, 'HMAC-MD5-96', 'PRF_HMAC_MD5', '1024MODPgr')
    
    # Chain proposals (IKEv2 SA payload contains ordered list; responder picks best match)
    sa_payload = ikev2.IKEv2_SA(prop=prop1/prop2/prop3)
    sa_payload.next_payload = 'KE'
    
    # KE payload for DH group 14 (2048-bit MODP) — required even if responder picks lower
    ke_payload = ikev2.IKEv2_KE(next_payload='Nonce', group=14, ke=os.urandom(256))
    ni_payload = ikev2.IKEv2_Nonce(next_payload='None', nonce=os.urandom(32))
    
    ike_pkt = ikev2.IKEv2(init_SPI=os.urandom(8), next_payload='SA', exch_type='IKE_SA_INIT', flags='Initiator') / sa_payload / ke_payload / ni_payload
    raw_bytes = bytes(ike_pkt)
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(8.0)
        sock.sendto(raw_bytes, (target_ip, target_port))
        resp_bytes, _ = sock.recvfrom(65535)
    except socket.timeout:
        raise ValueError(f"Target unreachable or did not respond to IKEv2 SA_INIT on port {target_port}.")
    finally:
        sock.close()
        
    # Reconstruct packets for PCAP writing so the parser can read them identically
    fake_req_pkt = IP(src="10.0.0.1", dst=target_ip) / UDP(sport=500, dport=target_port) / ike_pkt
    fake_res_pkt = IP(src=target_ip, dst="10.0.0.1") / UDP(sport=target_port, dport=500) / ikev2.IKEv2(resp_bytes)
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pcap") as tmp:
        wrpcap(tmp.name, [fake_req_pkt, fake_res_pkt])
        return tmp.name


@router.post("/probe/active")
async def probe_active(req: ActiveProbeRequest, request: Request):
    import socket
    check_rate_limit(request, limit=1, window=10)
    
    # 1. Mandatory Authorization Gate
    if req.auth_confirmation != "I AM AUTHORIZED":
        log_audit_attempt(req.target_ip, req.auth_confirmation, False, "Invalid authorization confirmation phrase.")
        raise HTTPException(status_code=403, detail="Unauthorized: You must explicitly confirm authorization.")
        
    # Parse potential host:port format from Playit.gg
    target_host = req.target_ip
    target_port = 500
    if ":" in target_host and not target_host.startswith("[") and target_host.count(":") == 1:
        parts = target_host.split(":")
        target_host = parts[0]
        try:
            target_port = int(parts[1])
        except ValueError:
            pass

    # 2. RFC1918 Default Restriction
    try:
        resolved_ip = socket.gethostbyname(target_host)
        ip_obj = ipaddress.ip_address(resolved_ip)
    except (socket.gaierror, ValueError):
        log_audit_attempt(req.target_ip, req.auth_confirmation, False, "Invalid IP address or unresolvable domain.")
        raise HTTPException(status_code=400, detail="Invalid IP address or unresolvable domain.")
        
    if not (ip_obj.is_private or ip_obj.is_loopback):
        if not req.override_rfc1918:
            log_audit_attempt(req.target_ip, req.auth_confirmation, False, "Blocked by RFC1918 restriction.")
            raise HTTPException(status_code=403, detail="Safety restriction: Target is not a private RFC1918 or loopback IP. Override flag required for external scanning.")
            
    log_audit_attempt(req.target_ip, req.auth_confirmation, True, "Probe initiated.")
    
    try:
        pcap_path = await run_in_threadpool(craft_and_send_probe, resolved_ip, target_port)
    except Exception as e:
        raise HTTPException(status_code=504, detail=str(e))
        
    try:
        parsed_data = await run_in_threadpool(parse_ike_negotiation, pcap_path)
    except Exception as e:
        if os.path.exists(pcap_path): os.unlink(pcap_path)
        raise HTTPException(status_code=500, detail=f"Failed to parse target response: {str(e)}")
        
    if os.path.exists(pcap_path): os.unlink(pcap_path)
    return parsed_data
