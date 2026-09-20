from scapy.all import wrpcap, Ether, IP, UDP
from scapy.layers.isakmp import ISAKMP, ISAKMP_payload_SA, ISAKMP_payload_Proposal, ISAKMP_payload_Transform
import scapy.contrib.ikev2 as ikev2

def generate_ike_pcap(filename, version, exch_type, trans_load=None, ikev2_payloads=None):
    pkt = Ether()/IP(dst="192.168.1.100", src="192.168.1.50")/UDP(sport=500, dport=500)
    
    if version == 0x10:
        isakmp = ISAKMP(
            init_cookie=b'\x01\x02\x03\x04\x05\x06\x07\x08',
            resp_cookie=b'\x00\x00\x00\x00\x00\x00\x00\x00',
            next_payload=1, # SA for IKEv1
            version=version, 
            exch_type=exch_type,
            flags=8
        )
        t = ISAKMP_payload_Transform(id=1)
        if trans_load:
            t.transforms = trans_load
        sa_payload = ISAKMP_payload_SA(
            next_payload=0,
            prop=ISAKMP_payload_Proposal(trans=t)
        )
        final_pkt = pkt / isakmp / sa_payload
    else:
        # IKEv2
        isakmp = ikev2.IKEv2(
            init_SPI=b'\x01\x02\x03\x04\x05\x06\x07\x08',
            next_payload=33, # SA
            exch_type=exch_type,
            flags=8
        )
        final_pkt = pkt / isakmp
        if ikev2_payloads:
            final_pkt = final_pkt / ikev2_payloads
            
    wrpcap(filename, [final_pkt])
    print(f"Generated {filename}")

if __name__ == "__main__":
    # CRITICAL: 3DES(5), KeyLen(56), MD5(1), PSK(1), DH1(1)
    load_crit = [(1, 5), (14, 56), (2, 1), (3, 1), (4, 1)]
    generate_ike_pcap("scenario_critical_legacy.pcap", version=0x10, exch_type=4, trans_load=load_crit)
    
    # MODERATE: AES-CBC(7), KeyLen(128), SHA1(2), PSK(1), DH14(14)
    load_mod = [(1, 7), (14, 128), (2, 2), (3, 1), (4, 14)]
    generate_ike_pcap("scenario_moderate_transition.pcap", version=0x10, exch_type=2, trans_load=load_mod)
    
    # STRONG: IKEv2, AES-GCM(20), KeyLen(256), SHA384(5), DH19(19), RSA-Sig (handled via Auth but we'll put in transform for parsing ease or just rely on defaults)
    t1 = ikev2.IKEv2_Transform(transform_type=1, transform_id=20, length=12, key_length=256)
    t2 = ikev2.IKEv2_Transform(transform_type=2, transform_id=5) # PRF SHA384
    t3 = ikev2.IKEv2_Transform(transform_type=4, transform_id=19) # DH 19
    prop = ikev2.IKEv2_Proposal(trans=[t1, t2, t3])
    sa = ikev2.IKEv2_SA(prop=prop)
    generate_ike_pcap("scenario_strong_modern.pcap", version=0x20, exch_type=34, ikev2_payloads=sa)
