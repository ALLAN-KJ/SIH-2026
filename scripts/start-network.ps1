$ROOT_DIR = "$PSScriptRoot\.."

Write-Host "Starting IPsec Sentinel in LOCAL NETWORK MODE..." -ForegroundColor Cyan

$port = if ($env:PORT) { $env:PORT } else { 8000 }
$portInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "❌ ERROR: Port $port is already in use by PID $($portInUse.OwningProcess[0])." -ForegroundColor Red
    Write-Host "Please free the port or specify a different PORT before starting." -ForegroundColor Yellow
    exit 1
}

# Automatically find local IPv4 address
$ip = (Test-Connection -ComputerName $env:COMPUTERNAME -Count 1 -ErrorAction SilentlyContinue).IPV4Address.IPAddressToString
if (-not $ip) {
    # Fallback if Test-Connection fails
    $ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias Wi-Fi -ErrorAction SilentlyContinue).IPAddress
    if (-not $ip) {
        $ip = "localhost"
    }
}
# Select the first IP if multiple are returned
if ($ip -is [array]) { $ip = $ip[0] }

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "IPSEC SENTINEL - LOCAL NETWORK TESTING MODE" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Your Local IP Address is: " -NoNewline; Write-Host $ip -ForegroundColor Green
Write-Host "Frontend reachable at:    " -NoNewline; Write-Host "http://${ip}:5173" -ForegroundColor Green
Write-Host "Share this URL with teammates on the same WiFi!"
Write-Host ""
Write-Host "NOTE: If teammates cannot connect, Windows Firewall may be blocking it." -ForegroundColor Yellow
Write-Host "      Fix: Allow Node.js and Python through Windows Defender Firewall." -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "Launching Backend (FastAPI)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$ROOT_DIR`"; `$env:PORT=$port; `$env:HOST='0.0.0.0'; `$env:CORS_ORIGIN='http://${ip}:5173'; .\venv\Scripts\activate; python -m backend.main"

Write-Host "Waiting for backend to initialize..."
Start-Sleep -Seconds 3

Write-Host "Launching Frontend (Vite+React)..." -ForegroundColor Yellow
# Using --host to expose Vite to local network
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$ROOT_DIR\frontend`"; `$env:VITE_API_BASE_URL='http://${ip}:'+$port; npm run dev -- --host"

Write-Host ""
Write-Host "✅ Network Services have been launched in separate windows!" -ForegroundColor Green



