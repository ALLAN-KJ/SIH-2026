import time
import os
import tempfile
import ipaddress
import socket
import random
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from scapy.all import IP, UDP, wrpcap
import scapy.contrib.ikev2 as ikev2

app = FastAPI(title="IPsec Sentinel - Standalone Probe Node")

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

def _make_proposal(prop_num: int, enc_id, enc_keylen: int, integ_id, prf_id, dh_id) -> "ikev2.IKEv2_Proposal":
    enc = ikev2.IKEv2_Transform(transform_type='Encryption', transform_id=enc_id)
    if enc_keylen:
        enc.key_length = enc_keylen  
    integ = ikev2.IKEv2_Transform(transform_type='Integrity', transform_id=integ_id)
    prf = ikev2.IKEv2_Transform(transform_type='PRF', transform_id=prf_id)
    dh = ikev2.IKEv2_Transform(transform_type='GroupDesc', transform_id=dh_id)
    prop = ikev2.IKEv2_Proposal(proposal=prop_num, proto='IKE', trans_nb=4, trans=enc/integ/prf/dh)
    return prop

def craft_and_send_probe(target_ip: str, target_port: int) -> str:
    prop1 = _make_proposal(1, 'AES-CBC', 256, 'SHA2-256-128', 'PRF_HMAC_SHA2_256', '2048MODPgr')
    prop2 = _make_proposal(2, 'AES-CBC', 128, 'HMAC-SHA1-96', 'PRF_HMAC_SHA1', '1536MODPgr')
    prop3 = _make_proposal(3, '3DES', 0, 'HMAC-MD5-96', 'PRF_HMAC_MD5', '1024MODPgr')
    
    props = [prop1, prop2, prop3]
    random.shuffle(props)
    
    for i, p in enumerate(props):
        p.proposal = i + 1
        
    chained_props = props[0]
    for p in props[1:]:
        chained_props = chained_props / p
        
    sa_payload = ikev2.IKEv2_SA(prop=chained_props)
    sa_payload.next_payload = 'KE'
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
        
    fake_req_pkt = IP(src="10.0.0.1", dst=target_ip) / UDP(sport=500, dport=target_port) / ike_pkt
    fake_res_pkt = IP(src=target_ip, dst="10.0.0.1") / UDP(sport=target_port, dport=500) / ikev2.IKEv2(resp_bytes)
    
    fd, path = tempfile.mkstemp(suffix=".pcap")
    os.close(fd)
    wrpcap(path, [fake_req_pkt, fake_res_pkt])
    return path

@app.post("/probe/raw")
async def probe_raw(req: ActiveProbeRequest, request: Request):
    check_rate_limit(request, limit=1, window=10)
    
    if req.auth_confirmation != "I AM AUTHORIZED":
        raise HTTPException(status_code=403, detail="Unauthorized: You must explicitly confirm authorization.")
        
    target_host = req.target_ip
    target_port = 500
    if ":" in target_host and not target_host.startswith("[") and target_host.count(":") == 1:
        parts = target_host.split(":")
        target_host = parts[0]
        try: target_port = int(parts[1])
        except ValueError: pass

    try:
        resolved_ip = socket.gethostbyname(target_host)
        ip_obj = ipaddress.ip_address(resolved_ip)
    except (socket.gaierror, ValueError):
        raise HTTPException(status_code=400, detail="Invalid IP address or unresolvable domain.")
        
    if not (ip_obj.is_private or ip_obj.is_loopback):
        if not req.override_rfc1918:
            raise HTTPException(status_code=403, detail="Safety restriction: Target is not a private RFC1918 or loopback IP. Override flag required for external scanning.")
    
    try:
        # We don't use threadpool here to keep it simple, it's blocking for up to 8 seconds.
        # But this is a dedicated probe microservice, so standard async def is okay or we can def probe_raw without async.
        pcap_path = craft_and_send_probe(resolved_ip, target_port)
    except Exception as e:
        raise HTTPException(status_code=504, detail=str(e))
        
    # Return the file, ensuring it gets deleted after response
    from starlette.background import BackgroundTask
    return FileResponse(pcap_path, media_type="application/vnd.tcpdump.pcap", background=BackgroundTask(os.remove, pcap_path))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080)
