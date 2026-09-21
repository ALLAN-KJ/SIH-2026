$ErrorActionPreference = 'Stop'

if (-not (Test-Path "dataset/real_captures")) {
    New-Item -ItemType Directory -Path "dataset/real_captures" | Out-Null
}

Write-Host "Running Strong Profile Capture..."
.\scripts\generate_real.ps1 "strong-profile" "dataset/real_captures/real_strong.pcap"

Write-Host "Running Weak Profile Capture..."
.\scripts\generate_real.ps1 "weak-profile" "dataset/real_captures/real_weak.pcap"

Write-Host "Evaluating Model..."
.\venv\Scripts\python.exe tests\test_real_captures.py
