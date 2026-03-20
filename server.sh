#!/bin/bash
# TERAHEADBMS v2.0 — Server Launcher (macOS / Linux)

set -e

echo ""
echo "====================================================="
echo "      TERAHEADBMS v2.0  |  Local Network Server"
echo "====================================================="
echo ""

# ── Check Node.js ─────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "[ERROR] Node.js is not installed."
  echo ""
  echo "Install options:"
  echo ""
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  Homebrew:  brew install node"
    echo "  Or download from: https://nodejs.org"
    if command -v brew &>/dev/null; then
      read -p "  Install via Homebrew now? (y/n): " yn
      if [[ "$yn" == "y" ]]; then brew install node; fi
    fi
  else
    echo "  Ubuntu/Debian:  sudo apt install nodejs npm"
    echo "  Fedora/RHEL:    sudo dnf install nodejs"
    echo "  Or download from: https://nodejs.org"
  fi
  echo ""
  exit 1
fi

NODE_VER=$(node -v)
echo "[OK] Node.js $NODE_VER"
echo ""

# ── Install dependencies ───────────────────────────────
if [ ! -d "node_modules" ]; then
  echo "[SETUP] Installing dependencies (first run only)..."
  npm install
  echo "[OK] Done."
  echo ""
else
  echo "[OK] Dependencies ready."
  echo ""
fi

# ── Show addresses ─────────────────────────────────────
echo "====================================================="
echo " Access the app at:"
echo "   http://localhost:3000"
echo ""
echo " From other devices on your Wi-Fi:"
if [[ "$OSTYPE" == "darwin"* ]]; then
  ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print "   http://" $2 ":3000"}'
else
  hostname -I 2>/dev/null | tr ' ' '\n' | grep -v '^$' | grep -v '^127' | awk '{print "   http://" $1 ":3000"}'
fi
echo ""
echo " Keep this terminal open. Ctrl+C to stop."
echo "====================================================="
echo ""

# ── Open browser ───────────────────────────────────────
sleep 1
if [[ "$OSTYPE" == "darwin"* ]]; then
  open "http://localhost:3000" 2>/dev/null &
elif command -v xdg-open &>/dev/null; then
  xdg-open "http://localhost:3000" 2>/dev/null &
fi

# ── Start server ───────────────────────────────────────
node server.js
