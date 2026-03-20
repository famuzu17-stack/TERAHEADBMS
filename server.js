// =========================================================
//  TERAHEADBMS — Local Network Server  v2.0
//  Node.js / Express — no database needed, JSON file store
//  Run:  node server.js
//  Then open http://localhost:3000 on any device on the LAN
// =========================================================
'use strict';

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const http    = require('http');
const os      = require('os');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── File paths ────────────────────────────────────────────
const DATA_FILE   = path.join(__dirname, 'thbms_data.json');
const PUBLIC_DIR  = path.join(__dirname, 'public');

// ── In-memory state ───────────────────────────────────────
let _appData   = null;   // cached app data object
let _sseClients = {};    // clientId → res (SSE connections)
let _p2pPeers  = {};     // peerId  → { clientId, signals:[] }
let _dirty     = false;
let _saveTimer = null;

// ── Middleware ────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.static(PUBLIC_DIR));

// CORS for LAN access from other origins
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Client-ID');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Data helpers ──────────────────────────────────────────
function loadAppData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      if (raw.trim()) {
        _appData = JSON.parse(raw);
        console.log('[DB] Loaded', DATA_FILE);
        return;
      }
    }
  } catch (e) {
    console.error('[DB] Load error:', e.message);
  }
  _appData = null; // null = no data yet (client will migrate from local)
  console.log('[DB] No data file yet — waiting for first save from client');
}

function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(flushToDisk, 800); // debounce 800 ms
}

function flushToDisk() {
  if (!_appData) return;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(_appData), 'utf8');
    _dirty = false;
  } catch (e) {
    console.error('[DB] Save error:', e.message);
  }
}

// ── SSE helpers ───────────────────────────────────────────
function broadcastDataChange(exceptClientId) {
  Object.entries(_sseClients).forEach(([cid, res]) => {
    if (cid === exceptClientId) return;
    try {
      res.write(`event: datachange\ndata: 1\n\n`);
    } catch (e) {
      delete _sseClients[cid];
    }
  });
}

// ── API routes ────────────────────────────────────────────

// Health check / server detection
app.get('/api/ping', (req, res) => {
  res.json({ server: true, version: '2.0', uptime: process.uptime() });
});

// Load data
app.get('/api/load', (req, res) => {
  res.json({ data: _appData });
});

// Save data
app.post('/api/save', (req, res) => {
  const clientId = req.headers['x-client-id'] || 'unknown';
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  _appData = req.body;
  scheduleSave();
  broadcastDataChange(clientId);
  res.json({ ok: true });
});

// Connected clients count
app.get('/api/clients', (req, res) => {
  const count = Object.keys(_sseClients).length;
  res.json({ count, clients: Object.keys(_sseClients) });
});

// SSE — live sync stream
app.get('/api/events', (req, res) => {
  const clientId = req.query.cid || ('sse_' + Date.now());
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  _sseClients[clientId] = res;
  console.log(`[SSE] Client connected: ${clientId}  (total: ${Object.keys(_sseClients).length})`);

  // Heartbeat every 25 s to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (e) { clearInterval(heartbeat); }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    delete _sseClients[clientId];
    console.log(`[SSE] Client disconnected: ${clientId}  (total: ${Object.keys(_sseClients).length})`);
  });
});

// ── P2P Signalling ────────────────────────────────────────
app.post('/api/p2p/announce', (req, res) => {
  const { peerId, clientId } = req.body || {};
  if (!peerId) return res.status(400).json({ error: 'peerId required' });
  if (!_p2pPeers[peerId]) _p2pPeers[peerId] = { clientId, signals: [] };
  else _p2pPeers[peerId].clientId = clientId;
  // Return list of other known peers
  const others = Object.keys(_p2pPeers).filter(p => p !== peerId);
  res.json({ ok: true, peers: others });
});

app.get('/api/p2p/signals', (req, res) => {
  const peerId = req.query.peerId;
  if (!peerId || !_p2pPeers[peerId]) return res.json({ signals: [] });
  const signals = _p2pPeers[peerId].signals.splice(0);
  res.json({ signals });
});

app.post('/api/p2p/signal', (req, res) => {
  const { to, signal } = req.body || {};
  if (!to || !signal) return res.status(400).json({ error: 'Missing to/signal' });
  if (!_p2pPeers[to]) _p2pPeers[to] = { signals: [] };
  _p2pPeers[to].signals.push(signal);
  // Clean up stale peers (no signals fetched in 2 minutes)
  // (simple approach — rely on re-announce on reconnect)
  res.json({ ok: true });
});

// ── Serve app HTML ────────────────────────────────────────
// Any non-API route → serve the SPA (index.html)
app.get('*', (req, res) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found in public/ folder. See README.txt for setup instructions.');
  }
});

// ── Start server ──────────────────────────────────────────
loadAppData();

const server = http.createServer(app);
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║         TERAHEADBMS Server v2.0                  ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Local:    http://localhost:${PORT}                  ║`);
  // Print all LAN IPs
  const nets = os.networkInterfaces();
  Object.values(nets).flat().filter(n => n.family === 'IPv4' && !n.internal).forEach(n => {
    const url = `http://${n.address}:${PORT}`;
    const padded = url.padEnd(41);
    console.log(`║  Network:  ${padded}  ║`);
  });
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Data file: thbms_data.json                       ║`);
  console.log('║  Press Ctrl+C to stop                             ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
});

// Flush on shutdown
process.on('SIGINT',  () => { flushToDisk(); console.log('\n[DB] Saved. Bye!'); process.exit(0); });
process.on('SIGTERM', () => { flushToDisk(); process.exit(0); });
