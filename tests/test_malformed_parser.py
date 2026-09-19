import pytest
from backend.ike_parser import parse_ike_negotiation
from scapy.all import wrpcap, Ether, IP, UDP, Raw
import os

def test_malformed_pcap():
    # Create a garbage PCAP
    pkt = Ether()/IP(dst='10.0.0.1')/UDP(dport=500)/Raw(load=b'\x00'*100)
    wrpcap('malformed_test.pcap', [pkt])
    
    try:
        # Should raise ValueError now, not a generic Exception or IndexError
        parse_ike_negotiation('malformed_test.pcap')
    except ValueError as e:
        assert 'Unable to parse' in str(e) or 'No valid IKE' in str(e)
    finally:
        os.remove('malformed_test.pcap')

if __name__ == '__main__':
    test_malformed_pcap()
    print('Malformed PCAP test passed.')


