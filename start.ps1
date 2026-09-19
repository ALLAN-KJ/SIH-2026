$ROOT_DIR = $PSScriptRoot

Write-Host "Starting IPsec Sentinel..." -ForegroundColor Cyan

$port = if ($env:PORT) { $env:PORT } else { 8000 }
$portInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "❌ ERROR: Port $port is already in use by PID $($portInUse.OwningProcess[0])." -ForegroundColor Red
    Write-Host "Please free the port or specify a different PORT before starting." -ForegroundColor Yellow
    exit 1
}

Write-Host "Launching Backend (FastAPI)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$ROOT_DIR`"; `$env:PORT=$port; .\venv\Scripts\activate; python -m backend.main"

Write-Host "Waiting for backend to initialize..."
Start-Sleep -Seconds 3

Write-Host "Launching Frontend (Vite+React)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$ROOT_DIR\frontend`"; `$env:VITE_API_BASE_URL='http://localhost:'+$port; npm run dev"

Write-Host ""
Write-Host "✅ Services have been launched in separate windows!" -ForegroundColor Green
Write-Host "Backend API: http://localhost:$port"
Write-Host "Frontend UI: http://localhost:5173"


