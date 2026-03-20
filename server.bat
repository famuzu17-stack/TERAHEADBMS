@echo off
setlocal enabledelayedexpansion
title TERAHEADBMS v2.0 — Server
color 0A

echo.
echo  =====================================================
echo        TERAHEADBMS v2.0  ^|  Local Network Server
echo  =====================================================
echo.

REM ── Step 1: Check Node.js ─────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
  color 0C
  echo  [ERROR] Node.js is NOT installed.
  echo.
  echo  Please install Node.js first:
  echo.
  echo    1. Open your browser and go to:
  echo       https://nodejs.org
  echo.
  echo    2. Download the LTS version (e.g. 20.x LTS)
  echo.
  echo    3. Run the installer, click Next through all steps
  echo       Make sure "Add to PATH" is checked
  echo.
  echo    4. Close this window and run server.bat again
  echo.
  echo  Opening nodejs.org in your browser...
  start https://nodejs.org
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v 2^>nul') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER% found
echo.

REM ── Step 2: Check npm ─────────────────────────────────
where npm >nul 2>&1
if %errorlevel% neq 0 (
  color 0C
  echo  [ERROR] npm not found. Reinstall Node.js from nodejs.org
  pause
  exit /b 1
)

REM ── Step 3: Install dependencies ──────────────────────
if not exist node_modules (
  echo  [SETUP] Installing server dependencies (first run only)...
  echo  This requires internet access and takes ~30 seconds.
  echo.
  call npm install
  if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] npm install failed.
    echo  Make sure you have an internet connection for first run.
    echo  If behind a proxy, configure npm proxy settings.
    pause
    exit /b 1
  )
  echo.
  echo  [OK] Dependencies installed successfully.
  echo.
) else (
  echo  [OK] Dependencies already installed.
  echo.
)

REM ── Step 4: Check port availability ───────────────────
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
  echo  [WARN] Port 3000 is already in use.
  echo  Another instance may already be running.
  echo  Check your taskbar or try closing other server windows.
  echo.
  echo  If you want to use a different port, edit server.js
  echo  and change: const PORT = 3000;
  echo.
  set /p CONT="Continue anyway? (Y/N): "
  if /i "!CONT!" neq "Y" exit /b 0
)

REM ── Step 5: Show network addresses ────────────────────
echo  =====================================================
echo   SERVER STARTING...
echo  =====================================================
echo.
echo  Access the app from THIS computer at:
echo    http://localhost:3000
echo.
echo  Access from OTHER devices on the same Wi-Fi:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4 Address"') do (
  set RAW=%%a
  set RAW=!RAW: =!
  REM Skip loopback
  echo !RAW! | findstr "127.0.0.1" >nul || echo    http://!RAW!:3000
)
echo.
echo  =====================================================
echo   Keep this window OPEN while using the app.
echo   Press Ctrl+C to stop the server.
echo  =====================================================
echo.

REM ── Step 6: Open browser then start server ────────────
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
node server.js

REM ── If server exits ────────────────────────────────────
echo.
color 0E
echo  Server stopped.
pause
