$root = "C:\Users\bsope\OneDrive\Documents\Scripts\frc-motion-coach"

$bp = Start-Process -WindowStyle Hidden -PassThru -FilePath "python" -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000" -WorkingDirectory "$root\backend"
$fp = Start-Process -WindowStyle Hidden -PassThru -FilePath "npx" -ArgumentList "vite --host 0.0.0.0 --port 5173" -WorkingDirectory "$root\frontend"

@"
BACKEND_PID=$($bp.Id)
FRONTEND_PID=$($fp.Id)
"@ | Out-File "$root\.server-pids.ps1"

Write-Host "FRC Motion Coach servers started:"
Write-Host "  Backend  PID $($bp.Id)  http://localhost:8000"
Write-Host "  Frontend PID $($fp.Id)  http://localhost:5173"
Write-Host ""
Write-Host "To stop: & '$root\scripts\stop-servers.ps1'"
