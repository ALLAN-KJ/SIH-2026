import socket
import os
import random
import scapy.contrib.ikev2 as ikev2

def _make_proposal(prop_num: int, enc_id, enc_keylen: int, integ_id, prf_id, dh_id) -> "ikev2.IKEv2_Proposal":
    enc = ikev2.IKEv2_Transform(transform_type='Encryption', transform_id=enc_id)
    if enc_keylen:
        enc.key_length = enc_keylen  
    
    integ = ikev2.IKEv2_Transform(transform_type='Integrity', transform_id=integ_id)
    prf = ikev2.IKEv2_Transform(transform_type='PRF', transform_id=prf_id)
    dh = ikev2.IKEv2_Transform(transform_type='GroupDesc', transform_id=dh_id)
    
    prop = ikev2.IKEv2_Proposal(proposal=prop_num, proto='IKE', trans_nb=4, trans=enc/integ/prf/dh)
    return prop

def start_dummy_responder(port=5000):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    # Bind to 5000 instead of 500 to avoid needing Administrator/Root privileges
    sock.bind(("0.0.0.0", port))
    print(f"[*] Dummy IKEv2 Responder listening on UDP {port}...")
    print(f"[*] Map your Playit.gg UDP tunnel to local port {port}!")
    print(f"[*] Waiting for incoming Active Probes...\n")
    
    # Define our three mock configurations
    strong = _make_proposal(1, 'AES-CBC', 256, 'SHA2-256-128', 'PRF_HMAC_SHA2_256', '2048MODPgr')
    moderate = _make_proposal(1, 'AES-CBC', 128, 'HMAC-SHA1-96', 'PRF_HMAC_SHA1', '1536MODPgr')
    weak = _make_proposal(1, '3DES', 0, 'HMAC-MD5-96', 'PRF_HMAC_MD5', '1024MODPgr')
    
    profiles = [
        ("Strong (Low Risk)", strong), 
        ("Moderate (Medium Risk)", moderate), 
        ("Weak (Critical Risk)", weak)
    ]
    
    while True:
        data, addr = sock.recvfrom(65535)
        try:
            pkt = ikev2.IKEv2(data)
            # 34 is the exchange type for IKE_SA_INIT
            if pkt.exch_type == 34: 
                # Pick a random security profile to return to the probe!
                name, chosen_prop = random.choice(profiles)
                print(f"[+] Received Active Probe from {addr[0]}:{addr[1]}")
                print(f"    -> Faking a '{name}' response...")
                
                # Construct response
                sa_payload = ikev2.IKEv2_SA(prop=chosen_prop)
                sa_payload.next_payload = 'KE'
                
                ke_payload = ikev2.IKEv2_KE(next_payload='Nonce', group=14, ke=os.urandom(256))
                ni_payload = ikev2.IKEv2_Nonce(next_payload='None', nonce=os.urandom(32))
                
                # Build the IKEv2 response packet (flags='Response')
                resp_pkt = ikev2.IKEv2(
                    init_SPI=pkt.init_SPI, 
                    resp_SPI=os.urandom(8), 
                    next_payload='SA', 
                    exch_type='IKE_SA_INIT', 
                    flags='Response'
                ) / sa_payload / ke_payload / ni_payload
                
                # Send it back to the active probe script
                sock.sendto(bytes(resp_pkt), addr)
                print(f"    -> Response sent!\n")
        except Exception as e:
            # Ignore unrelated UDP packets
            pass

if __name__ == "__main__":
    start_dummy_responder(port=5000)
