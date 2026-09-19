#!/usr/bin/env node

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.ANALYTICS_PORT || 3000);
const DATA_FILE = process.env.ANALYTICS_DATA_FILE || '/data/analytics.json';
const MAX_BODY_BYTES = 4096;
const GEO_TIMEOUT_MS = 2500;
const geoCache = new Map();
let writeQueue = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function loadState() {
  try {
    const state = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (state && state.visitors && state.salt) return state;
  } catch (_) {
    // The first request creates the data file.
  }
  return { version: 1, salt: crypto.randomBytes(32).toString('hex'), visitors: {} };
}

const state = loadState();

function persist() {
  const snapshot = JSON.stringify(state, null, 2) + '\n';
  writeQueue = writeQueue
    .then(async () => {
      await fs.promises.mkdir(path.dirname(DATA_FILE), { recursive: true });
      const temporary = `${DATA_FILE}.${process.pid}.tmp`;
      await fs.promises.writeFile(temporary, snapshot, 'utf8');
      await fs.promises.rename(temporary, DATA_FILE);
    })
    .catch((error) => console.error('[analytics] no se pudo guardar el estado:', error.message));
  return writeQueue;
}

function sendJson(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(payload);
}

function sendEmpty(response, status) {
  response.writeHead(status, { 'Cache-Control': 'no-store' });
  response.end();
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (_) {
        reject(new Error('invalid json'));
      }
    });
    request.on('error', reject);
  });
}

function clientIp(request) {
  const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  let value = forwarded || String(request.headers['x-real-ip'] || request.socket.remoteAddress || '').trim();
  if (value.startsWith('::ffff:')) value = value.slice(7);
  return value;
}

function isPrivateIp(value) {
  if (!value || value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:')) return true;
  const parts = value.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 169 && parts[1] === 254 ||
    parts[0] === 192 && parts[1] === 168 || parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
}

async function countryForIp(ip) {
  if (isPrivateIp(ip)) return 'XX';
  const cacheKey = crypto.createHash('sha256').update(ip).digest('hex');
  if (geoCache.has(cacheKey)) return geoCache.get(cacheKey);
  let country = 'XX';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code`, { signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) {
      const payload = await response.json();
      if (payload.success !== false && /^[A-Z]{2}$/i.test(payload.country_code || '')) country = payload.country_code.toUpperCase();
    }
  } catch (_) {
    // A failed lookup is intentionally shown as an unknown country.
  }
  geoCache.set(cacheKey, country);
  return country;
}

function visitorKey(visitorId) {
  return crypto.createHash('sha256').update(`${state.salt}:${visitorId}`).digest('hex');
}

function validVisitorId(value) {
  return typeof value === 'string' && value.length >= 16 && value.length <= 128 && /^[a-zA-Z0-9._:-]+$/.test(value);
}

function stats() {
  const countries = new Map();
  const visitors = Object.values(state.visitors);
  visitors.forEach((visitor) => {
    const code = /^[A-Z]{2}$/.test(visitor.country || '') ? visitor.country : 'XX';
    countries.set(code, (countries.get(code) || 0) + 1);
  });
  return {
    uniqueVisitors: visitors.length,
    countries: [...countries.entries()]
      .map(([code, visitorsCount]) => ({ code, visitors: visitorsCount }))
      .sort((a, b) => b.visitors - a.visitors || a.code.localeCompare(b.code)),
    since: visitors.reduce((oldest, visitor) => !oldest || visitor.firstSeen < oldest ? visitor.firstSeen : oldest, ''),
    updatedAt: nowIso(),
  };
}

async function collect(request, response) {
  try {
    const payload = await readJson(request);
    if (!validVisitorId(payload.visitorId)) {
      sendJson(response, 400, { error: 'visitorId inválido' });
      return;
    }
    const key = visitorKey(payload.visitorId);
    const timestamp = nowIso();
    const current = state.visitors[key];
    if (current) {
      current.lastSeen = timestamp;
    } else {
      state.visitors[key] = {
        firstSeen: timestamp,
        lastSeen: timestamp,
        country: await countryForIp(clientIp(request)),
      };
    }
    await persist();
    sendEmpty(response, 204);
  } catch (error) {
    sendJson(response, error.message === 'body too large' ? 413 : 400, { error: 'No se pudo registrar la visita' });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'OPTIONS') {
    sendEmpty(response, 204);
    return;
  }
  if (request.method === 'POST' && url.pathname === '/collect') {
    await collect(request, response);
    return;
  }
  if (request.method === 'GET' && url.pathname === '/stats') {
    sendJson(response, 200, stats());
    return;
  }
  sendJson(response, 404, { error: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => console.log(`[analytics] escuchando en ${PORT}`));
