'use strict';
// =========================================================
//  TERAHEADBMS — Electron Main Process
//  Starts the Express server internally, then opens a
//  BrowserWindow pointing to http://localhost:3000
// =========================================================

const { app, BrowserWindow, shell, Menu, Tray, nativeImage } = require('electron');
const path   = require('path');
const http   = require('http');

// ── Keep a global reference to prevent GC ────────────────
let mainWindow = null;
let tray       = null;
let serverProc = null;

// ── Start embedded Express server ────────────────────────
function startServer() {
  // Load and run server.js in this same Node process
  // so we don't need a child process
  require('./server.js');
  console.log('[Electron] Embedded server started');
}

// ── Wait for server to be ready ──────────────────────────
function waitForServer(url, retries, cb) {
  http.get(url, (res) => {
    if (res.statusCode === 200) return cb();
    retry();
  }).on('error', retry);

  function retry() {
    if (retries <= 0) return cb(new Error('Server did not start'));
    setTimeout(() => waitForServer(url, retries - 1, cb), 500);
  }
}

// ── Create the BrowserWindow ─────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'TERAHEADBMS v2.0',
    icon: path.join(__dirname, 'public', 'icon-512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false, // show after load
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in the default browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Remove default menu bar (optional — comment out to keep it)
  Menu.setApplicationMenu(null);
}

// ── App lifecycle ─────────────────────────────────────────
app.whenReady().then(() => {
  startServer();
  waitForServer('http://localhost:3000/api/ping', 20, (err) => {
    if (err) {
      console.error('[Electron] Server failed to start:', err.message);
      app.quit();
      return;
    }
    createWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
