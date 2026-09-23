import os
import csv
from scapy.all import wrpcap, Ether, IP, TCP, UDP, ICMP, DNS, DNSQR, Raw

def generate_normal_baseline():
    print("Generating Normal Communication Baseline Dataset...")
    dataset_dir = os.path.join(os.path.dirname(__file__), '..', 'dataset')
    baseline_dir = os.path.join(dataset_dir, 'baseline_normal')
    os.makedirs(baseline_dir, exist_ok=True)
    
    labels_file = os.path.join(dataset_dir, 'labels_baseline.csv')
    labels = []
    
    # 1. Generate HTTP Traffic
    http_pkts = []
    for i in range(10):
        req = Ether()/IP(src="192.168.1.10", dst="93.184.216.34")/TCP(sport=12345+i, dport=80, flags="S")
        resp = Ether()/IP(src="93.184.216.34", dst="192.168.1.10")/TCP(sport=80, dport=12345+i, flags="SA")
        data = Ether()/IP(src="192.168.1.10", dst="93.184.216.34")/TCP(sport=12345+i, dport=80, flags="PA")/Raw(b"GET / HTTP/1.1\r\nHost: example.com\r\n\r\n")
        http_pkts.extend([req, resp, data])
    
    http_file = "baseline_normal_http.pcap"
    wrpcap(os.path.join(baseline_dir, http_file), http_pkts)
    labels.append({'pcap_file': f'baseline_normal/{http_file}', 'traffic_type': 'Normal_HTTP', 'is_ipsec': False})

    # 2. Generate DNS Traffic
    dns_pkts = []
    for i in range(10):
        req = Ether()/IP(src="192.168.1.10", dst="8.8.8.8")/UDP(sport=43210+i, dport=53)/DNS(rd=1, qd=DNSQR(qname="www.google.com"))
        dns_pkts.append(req)
        
    dns_file = "baseline_normal_dns.pcap"
    wrpcap(os.path.join(baseline_dir, dns_file), dns_pkts)
    labels.append({'pcap_file': f'baseline_normal/{dns_file}', 'traffic_type': 'Normal_DNS', 'is_ipsec': False})

    # 3. Generate ICMP Traffic
    icmp_pkts = []
    for i in range(10):
        req = Ether()/IP(src="192.168.1.10", dst="8.8.8.8")/ICMP(type=8, id=100, seq=i)
        resp = Ether()/IP(src="8.8.8.8", dst="192.168.1.10")/ICMP(type=0, id=100, seq=i)
        icmp_pkts.extend([req, resp])
        
    icmp_file = "baseline_normal_icmp.pcap"
    wrpcap(os.path.join(baseline_dir, icmp_file), icmp_pkts)
    labels.append({'pcap_file': f'baseline_normal/{icmp_file}', 'traffic_type': 'Normal_ICMP', 'is_ipsec': False})

    # Write labels
    with open(labels_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['pcap_file', 'traffic_type', 'is_ipsec'])
        writer.writeheader()
        writer.writerows(labels)
        
    print(f"Generated {len(labels)} baseline files in {baseline_dir}.")
    print(f"Labels written to {labels_file}.")

if __name__ == '__main__':
    generate_normal_baseline()
