@echo off
start /B "" python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
cd /d "C:\Users\bsope\OneDrive\Documents\Scripts\frc-motion-coach\frontend"
start /B "" npx vite --host 0.0.0.0 --port 5173
echo FRC Motion Coach servers started.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
