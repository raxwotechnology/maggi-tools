@echo off
TITLE Raxwo Rent A Car System - Launcher
COLOR 0B

echo ===================================================
echo   RAXWO RENT A CAR MANAGEMENT SYSTEM
echo ===================================================
echo.
echo [1/2] Launching Backend Server (Node.js) on port 5001...
start "Raxwo-Backend" cmd /k "cd backend && npm run dev"

echo [2/2] Launching Frontend Interface (Vite)...
start "Raxwo-Frontend" cmd /k "cd frontend && npm start"

echo.
echo ===================================================
echo   System is starting up!
echo ===================================================
echo - Backend: http://localhost:5001
echo - Frontend: http://localhost:5173 (Wait for Vite to assign port if 5173 is in use)
echo.
echo Keep this window open if you want to see the status.
echo Close the separate windows to stop the servers.
echo.
pause
