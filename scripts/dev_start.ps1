# Start FRC Motion Coach in development mode on Windows

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host "Starting FRC Motion Coach..." -ForegroundColor Green
Write-Host "Root directory: $RootDir"

# Start backend
Push-Location "$RootDir\backend"
Write-Host "Starting backend server on http://localhost:8000" -ForegroundColor Cyan
$backend = Start-Process -NoNewWindow -PassThru -FilePath "python" -ArgumentList "-m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

# Start frontend
Push-Location "$RootDir\frontend"
Write-Host "Starting frontend dev server on http://localhost:5173" -ForegroundColor Cyan
$frontend = Start-Process -NoNewWindow -PassThru -FilePath "npm" -ArgumentList "run dev"

Pop-Location
Pop-Location

Write-Host ""
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Yellow
Write-Host "API docs: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to stop both servers"

$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
