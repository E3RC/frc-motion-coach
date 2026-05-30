$pidFile = "C:\Users\bsope\OneDrive\Documents\Scripts\frc-motion-coach\.server-pids.ps1"
if (Test-Path $pidFile) {
    $pids = Get-Content $pidFile
    foreach ($line in $pids) {
        if ($line -match 'BACKEND_PID=(\d+)') { Stop-Process -Id ([int]$matches[1]) -Force -ErrorAction SilentlyContinue }
        if ($line -match 'FRONTEND_PID=(\d+)') { Stop-Process -Id ([int]$matches[1]) -Force -ErrorAction SilentlyContinue }
    }
    Remove-Item $pidFile
    Write-Host "Servers stopped."
}
