$ErrorActionPreference = 'Stop'
.\scripts\generate_real.ps1 "strong-profile" "dataset/real_captures/real_strong_http.pcap" "HTTP"
.\scripts\generate_real.ps1 "weak-profile" "dataset/real_captures/real_weak_http.pcap" "HTTP"
.\scripts\generate_real.ps1 "strong-profile" "dataset/real_captures/real_strong_dns.pcap" "DNS"
.\scripts\generate_real.ps1 "weak-profile" "dataset/real_captures/real_weak_dns.pcap" "DNS"
