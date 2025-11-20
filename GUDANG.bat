@echo off
REM ==== GANTI INI KE LOKASI PROJECT KAMU ====
cd /d "C:\Users\flip3\Documents\Repository\WMS\WMS_demo"

REM ==== START BACKEND (PYTHON) DI JENDELA SENDIRI ====
start "backend" cmd /k "cd /d backend && call venv\Scripts\activate.bat && python app.py"

REM ==== START FRONTEND (NPM) DI JENDELA SENDIRI ====
start "frontend" cmd /k "cd /d frontend && npm run dev"

REM (OPSIONAL) TUNGGU 5 DETIK LALU BUKA BROWSER OTOMATIS
timeout /t 5 >nul
start "" "http://localhost:5173"

exit
