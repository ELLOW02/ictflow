const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const NTFY_CHANNEL = process.env.NTFY_CHANNEL || process.argv[2] || 'ictflow_eurusd_vanep_2026';

let latestData = null;
let clients = [];
let lastMsgId = null;

function broadcast(data) {
  const out = `data: ${JSON.stringify(data)}\n\n`;
  clients = clients.filter(c => {
    try { c.write(out); return true; } catch(e) { return false; }
  });
}

// Poll ntfy.sh every 3 seconds for new messages
function pollNtfy() {
  const path = lastMsgId
    ? `/${NTFY_CHANNEL}/json?poll=1&since=${lastMsgId}`
    : `/${NTFY_CHANNEL}/json?poll=1&since=all`;

  const opts = {
    hostname: 'ntfy.sh',
    path,
    method: 'GET',
    headers: { 'Accept': 'application/x-ndjson' }
  };

  const req = https.request(opts, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      const lines = body.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.id) lastMsgId = msg.id;
          if (msg.event !== 'message') continue;

          let payload = msg.message || '';
          // Unescape if needed
          if (payload.startsWith('"')) {
            try { payload = JSON.parse(payload); } catch(e) {}
          }
          // Extract JSON object
          const jsonStart = payload.indexOf('{');
          if (jsonStart >= 0) payload = payload.slice(jsonStart);

          const data = JSON.parse(payload);
          if (data.type === 'tick' || data.symbol) {
            data.type = 'tick';
            data.receivedAt = Date.now();
            latestData = data;
            broadcast(data);
            console.log(`[TICK] ${new Date().toLocaleTimeString()} | ${data.signal || '?'} | score:${data.score || '?'} | close:${data.close || '?'}`);
          }
        } catch(e) {
          // not JSON or not a tick, ignore
        }
      }
    });
  });
  req.on('error', e => console.error('[ntfy error]', e.message));
  req.end();
}

setInterval(pollNtfy, 3000);
setTimeout(pollNtfy, 500);

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // SSE stream
  if (req.method === 'GET' && req.url === '/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write(`data: {"type":"connected","channel":"${NTFY_CHANNEL}"}\n\n`);
    clients.push(res);
    if (latestData) res.write(`data: ${JSON.stringify(latestData)}\n\n`);
    req.on('close', () => { clients = clients.filter(c => c !== res); });
    return;
  }

  // Also accept direct webhooks from TradingView (fallback)
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        data.type = 'tick';
        data.receivedAt = Date.now();
        latestData = data;
        broadcast(data);
        console.log(`[WEBHOOK] ${new Date().toLocaleTimeString()} | ${data.signal || '?'} | score:${data.score || '?'}`);
        res.writeHead(200); res.end('ok');
      } catch(e) {
        res.writeHead(400); res.end('bad json');
      }
    });
    return;
  }

  // Latest data endpoint
  if (req.method === 'GET' && req.url === '/latest') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(latestData || { type: 'empty' }));
    return;
  }

  // Serve index.html
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const fs = require('fs'), path = require('path');
    const file = path.join(__dirname, 'index.html');
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(file));
    } else {
      res.writeHead(404); res.end('index.html not found');
    }
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║  ICTFLOW v2                                        ║`);
  console.log(`║  ntfy canal : https://ntfy.sh/${NTFY_CHANNEL.padEnd(19)}║`);
  console.log(`║  App        : http://localhost:${PORT}                ║`);
  console.log(`║  Webhook    : POST http://localhost:${PORT}/webhook    ║`);
  console.log('╚══════════════════════════════════════════════════╝\n');
  console.log('Esperando datos de TradingView...\n');
});
