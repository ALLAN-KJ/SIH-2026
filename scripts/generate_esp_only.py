from scapy.all import Ether, IP, UDP, wrpcap
from scapy.layers.ipsec import ESP

pkt1 = Ether()/IP(src="192.168.1.1", dst="192.168.1.2")/ESP(spi=0x12345678, seq=1)/b"fake_esp_payload"
pkt2 = Ether()/IP(src="192.168.1.2", dst="192.168.1.1")/ESP(spi=0x87654321, seq=1)/b"fake_esp_payload2"

wrpcap("dataset/esp_only.pcap", [pkt1, pkt2])
print("Generated dataset/esp_only.pcap")
