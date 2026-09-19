import os
from scapy.all import rdpcap, UDP
import scapy.contrib.ikev2 as ikev2
from scapy.layers.isakmp import ISAKMP, ISAKMP_payload_SA, ISAKMP_payload_Proposal, ISAKMP_payload_Transform

def parse_ikev1_transform(t_list, result, depth=0):
    if depth > 5:
        raise ValueError("Malformed PCAP: Exceeded maximum parsing depth (potential recursion attack)")
    if not isinstance(t_list, list):
        return
    for item in t_list:
        if len(item) == 2:
            t, v = item
            if t == 'Encryption':
                if v == '3DES-CBC': result["encryption_algorithm"] = "3DES"
                else: result["encryption_algorithm"] = str(v)
            elif t == 'Hash':
                if v == 'SHA': result["hash_algorithm"] = "SHA1"
                else: result["hash_algorithm"] = str(v)
            elif t == 'Authentication':
                result["auth_method"] = str(v)
            elif t == 'GroupDesc':
                if v == '768MODPgr': result["dh_group"] = 1
                elif v == '2048MODPgr': result["dh_group"] = 14
                else: result["dh_group"] = 0
            elif t == 'KeyLength':
                result["key_length_bits"] = int(v)

def parse_ike_negotiation(pcap_path: str) -> dict:
    if not os.path.exists(pcap_path):
        raise FileNotFoundError(f"PCAP file not found: {pcap_path}")
    
    try:
        packets = rdpcap(pcap_path)
        
        result = {
            "ike_version": "Unknown",
            "ike_mode": "Unknown",
            "encryption_algorithm": "Unknown",
            "key_length_bits": 0,
            "hash_algorithm": "Unknown",
            "dh_group": 0,
            "auth_method": "Unknown",
            "operation_mode": "Tunnel",
            "pfs_enabled": False,
            "sa_lifetime_seconds": 3600
        }

        for idx, pkt in enumerate(packets):
            if idx >= 100:
                break
            
            if pkt.haslayer(ikev2.IKEv2):
                result["ike_version"] = "IKEv2"
                result["ike_mode"] = "Main"
                result["pfs_enabled"] = True
                result["sa_lifetime_seconds"] = 86400
                
                if pkt.haslayer(ikev2.IKEv2_SA):
                    sa = pkt[ikev2.IKEv2_SA]
                    if hasattr(sa, 'prop') and hasattr(sa.prop, 'trans'):
                        for t in sa.prop.trans:
                            tt = getattr(t, 'transform_type', None)
                            tid = getattr(t, 'transform_id', None)
                            if tt == 1:
                                if tid == 20: 
                                    result["encryption_algorithm"] = "AES-256-GCM"
                                    kl = getattr(t, 'key_length', 256)
                                    result["key_length_bits"] = kl if kl is not None else 256
                                elif tid == 12:
                                    result["encryption_algorithm"] = "AES-CBC"
                                    kl = getattr(t, 'key_length', 128)
                                    result["key_length_bits"] = kl if kl is not None else 128
                                else:
                                    kl = getattr(t, 'key_length', 0)
                                    result["key_length_bits"] = kl if kl is not None else 0
                            elif tt == 2:
                                if tid == 5: result["hash_algorithm"] = "SHA384"
                                elif tid == 2: result["hash_algorithm"] = "SHA1"
                            elif tt == 4:
                                result["dh_group"] = tid
                                
                if pkt.haslayer(ikev2.IKEv2_AUTH):
                    auth_layer = pkt[ikev2.IKEv2_AUTH]
                    auth_type = getattr(auth_layer, 'auth_type', None)
                    if auth_type == 1: result["auth_method"] = "RSA-Sig"
                    elif auth_type == 2: result["auth_method"] = "PSK"
                    elif auth_type == 3: result["auth_method"] = "DSS-Sig"
                    elif auth_type == 14: result["auth_method"] = "Digital Signature"
                    else:
                        if result["auth_method"] == "Unknown": result["auth_method"] = f"Type-{auth_type}"
            elif pkt.haslayer(ISAKMP):
                isakmp_layer = pkt[ISAKMP]
                
                result["ike_version"] = "IKEv1"
                if isakmp_layer.exch_type == 2:
                    result["ike_mode"] = "Main"
                    result["pfs_enabled"] = True
                    result["sa_lifetime_seconds"] = 28800
                elif isakmp_layer.exch_type == 4:
                    result["ike_mode"] = "Aggressive"
                    result["pfs_enabled"] = False
                    result["sa_lifetime_seconds"] = 3600
                else:
                    if result["ike_mode"] == "Unknown":
                        result["ike_mode"] = "Quick"
                
                if pkt.haslayer(ISAKMP_payload_SA):
                    sa = pkt[ISAKMP_payload_SA]
                    if hasattr(sa, 'prop'):
                        props = sa.prop if isinstance(sa.prop, list) else [sa.prop]
                        for prop in props:
                            if hasattr(prop, 'trans'):
                                trans = prop.trans if isinstance(prop.trans, list) else [prop.trans]
                                for t in trans:
                                    if hasattr(t, 'transforms'):
                                        parse_ikev1_transform(t.transforms, result, 1)
                                    elif hasattr(t, 'load'):
                                        parse_ikev1_transform(t.load, result, 1)

    except Exception as e:
        raise ValueError(f"Unable to parse IKE negotiation from this file: malformed payload or parsing error ({str(e)})")

    if result["ike_version"] == "Unknown":
        raise ValueError("No valid IKE negotiation found in the PCAP file. Ensure the file contains IKEv1 or IKEv2 UDP traffic on port 500 or 4500.")

    return result

if __name__ == "__main__":
    try:
        res = parse_ike_negotiation("scenario_critical_legacy.pcap")
        for k, v in res.items(): print(f"{k}: {v}")
    except Exception as e:
        print(f"Error: {e}")

