'use strict';

const { addonBuilder } = require('stremio-addon-sdk');
const express = require('express');
const fetch = require('node-fetch');
const https = require('https');

// Agent che ignora SSL scaduto/invalido (necessario per il CDN di Vavoo)
var VAVOO_AGENT = new https.Agent({ rejectUnauthorized: false });

const PORT = process.env.PORT || 7860;

// HTML configurazione (inline, nessun file esterno)
const CONFIGURE_HTML = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LelloTV - Configurazione</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0f0f13; --surface: #1a1a24; --surface2: #23233a; --border: #2e2e4a;
      --accent: #7c3aed; --accent-light: #9d5cf7; --accent-glow: rgba(124,58,237,0.25);
      --text: #e8e8f0; --text-muted: #8888aa; --radius: 12px;
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg); color: var(--text); min-height: 100vh;
      display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
    .card { width: 100%; max-width: 560px; background: var(--surface);
      border: 1px solid var(--border); border-radius: 20px; overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, var(--accent) 0%, #4f1fb8 100%);
      padding: 32px 28px 28px; text-align: center; }
    .logo { font-size: 48px; margin-bottom: 8px; }
    .header h1 { font-size: 26px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 4px; }
    .body { padding: 28px; }
    .section { background: var(--surface2); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 20px; margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1.2px; color: var(--accent-light); margin-bottom: 16px;
      display: flex; align-items: center; gap: 8px; }
    .section-title::before { content: ''; display: block; width: 3px; height: 14px;
      background: var(--accent); border-radius: 2px; }
    .field { margin-bottom: 16px; }
    .field:last-child { margin-bottom: 0; }
    label { display: block; font-size: 13px; font-weight: 600;
      color: var(--text-muted); margin-bottom: 6px; }
    input[type="text"], input[type="password"], input[type="url"] {
      width: 100%; background: var(--bg); border: 1px solid var(--border);
      border-radius: 8px; color: var(--text); font-size: 14px;
      padding: 10px 14px; outline: none; transition: border-color .2s, box-shadow .2s; }
    input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    input::placeholder { color: var(--text-muted); opacity: .6; }
    .toggle-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .toggle-label { font-size: 14px; font-weight: 500; }
    .toggle-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .toggle { position: relative; width: 44px; height: 24px; flex-shrink: 0; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; inset: 0; background: var(--border);
      border-radius: 24px; cursor: pointer; transition: background .2s; }
    .toggle-slider::before { content: ''; position: absolute; width: 18px; height: 18px;
      left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform .2s; }
    .toggle input:checked + .toggle-slider { background: var(--accent); }
    .toggle input:checked + .toggle-slider::before { transform: translateX(20px); }
    .source-sub { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
    .btn-generate { width: 100%; background: linear-gradient(135deg, var(--accent), var(--accent-light));
      color: #fff; border: none; border-radius: var(--radius); padding: 14px;
      font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity .2s; margin-top: 4px; }
    .btn-generate:hover { opacity: .9; }
    .result-box { display: none; margin-top: 20px; background: var(--surface2);
      border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
    .result-box.visible { display: block; }
    .install-url { background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
      padding: 10px 14px; font-size: 12px; color: var(--accent-light); word-break: break-all;
      font-family: monospace; margin-bottom: 12px; }
    .btn-row { display: flex; gap: 10px; }
    .btn-copy, .btn-install { flex: 1; padding: 10px; border-radius: 8px;
      font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: opacity .2s; }
    .btn-copy { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
    .btn-install { background: var(--accent); color: #fff; }
    .btn-copy:hover, .btn-install:hover { opacity: .8; }
    .note { font-size: 11px; color: var(--text-muted); text-align: center;
      margin-top: 16px; line-height: 1.5; }
    .note a { color: var(--accent-light); text-decoration: none; }
    .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 7px;
      border-radius: 20px; background: var(--accent-glow); color: var(--accent-light);
      border: 1px solid var(--accent); margin-left: 6px; vertical-align: middle; }
    .dl-hidden { display: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">TV</div>
      <h1>LelloTV</h1>
      <p>Canali live da Vavoo (Italia) &amp; DLStreams tramite EasyProxy</p>
    </div>
    <div class="body">
      <div class="section">
        <div class="section-title">EasyProxy</div>
        <div class="field">
          <label>Indirizzo EasyProxy (es. https://tua-proxy.onrender.com)</label>
          <input type="url" id="proxyUrl" placeholder="https://..." />
        </div>
        <div class="field">
          <label>Password EasyProxy (lascia vuoto se non configurata)</label>
          <input type="password" id="proxyPassword" placeholder="" />
        </div>
      </div>
      <div class="section">
        <div class="section-title">Sorgenti</div>
        <div class="toggle-row">
          <div>
            <div class="toggle-label">Vavoo Italia <span class="badge">Gratuito</span></div>
            <div class="toggle-desc">Tutti i canali italiani da Vavoo</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="vavooEnabled" checked />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="toggle-row" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
          <div>
            <div class="toggle-label">DLStreams (DaddyLive) <span class="badge">API Key</span></div>
            <div class="toggle-desc">Sport live, eventi, canali internazionali</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="dlEnabled" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="source-sub dl-hidden" id="dlSub">
          <div class="field">
            <label>DLStreams API Key</label>
            <input type="text" id="dlApiKey" placeholder="La tua chiave API dlstreams.com" />
          </div>
          <div class="note" style="text-align:left;">
            Richiedi la chiave su <a href="https://dlstreams.com/contact.php" target="_blank">dlstreams.com/contact.php</a>.
          </div>
        </div>
      </div>
      <button class="btn-generate" onclick="generate()">Genera link di installazione</button>
      <div class="result-box" id="resultBox">
        <div class="section-title">Link di installazione</div>
        <div class="install-url" id="installUrl"></div>
        <div class="btn-row">
          <button class="btn-copy" onclick="copyUrl()">Copia URL</button>
          <button class="btn-install" onclick="installAddon()">Installa su Stremio</button>
        </div>
      </div>
      <p class="note">
        Funziona anche con Nuvio - copia l'URL e aggiungilo come addon esterno.<br/>
        Nessun dato raccolto.
      </p>
    </div>
  </div>
  <script>
    document.getElementById('dlEnabled').addEventListener('change', function() {
      document.getElementById('dlSub').classList.toggle('dl-hidden', !this.checked);
    });
    async function generate() {
      var proxyUrl = document.getElementById('proxyUrl').value.trim();
      var proxyPassword = document.getElementById('proxyPassword').value.trim();
      var dlApiKey = document.getElementById('dlApiKey').value.trim();
      var vavooEnabled = document.getElementById('vavooEnabled').checked;
      var dlEnabled = document.getElementById('dlEnabled').checked;
      if (!vavooEnabled && !dlEnabled) { alert('Attiva almeno una sorgente!'); return; }
      var res = await fetch('/api/encode-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxyUrl: proxyUrl, proxyPassword: proxyPassword, dlApiKey: dlApiKey, vavooEnabled: vavooEnabled, dlEnabled: dlEnabled }),
      });
      var data = await res.json();
      var url = window.location.origin + '/' + data.configB64 + '/manifest.json';
      document.getElementById('installUrl').textContent = url;
      document.getElementById('resultBox').classList.add('visible');
      window._installUrl = url;
    }
    function copyUrl() {
      navigator.clipboard.writeText(window._installUrl).then(function() {
        var btn = document.querySelector('.btn-copy');
        btn.textContent = 'Copiato!';
        setTimeout(function() { btn.textContent = 'Copia URL'; }, 2000);
      });
    }
    function installAddon() {
      window.open('stremio://' + window._installUrl.replace(/^https?:\/\//, ''), '_blank');
    }
  </script>
</body>
</html>`;

var VAVOO_UA = 'VAVOO/2.6';

// Token hardcoded dall'app Lokke (client Vavoo-compatibile)
var LOKKE_TOKEN = 'ldCvE092e7gER0rVIajfsXIvRhwlrAzP6_1oEJ4q6HH89QHt24v6NNL_jQJO219hiLOXF2hqEfsUuEWitEIGN4EaHHEHb7Cd7gojc5SQYRFzU3XWo_kMeryAUbcwWnQrnf0-';

// Estrae l'IP reale del viewer dalla request Stremio
function getViewerIP(req) {
  var fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || '1.1.1.1';
}

// Ottieni addonSig da lokke.app con l'IP del viewer incorporato
async function getAddonSig(clientIP) {
  var now = Date.now();
  var uniqueId = Math.random().toString(16).slice(2, 18);
  var payload = {
    token: LOKKE_TOKEN,
    reason: 'app-blur', locale: 'de', theme: 'dark',
    metadata: {
      device: { type: 'Handset', brand: 'google', model: 'Nexus', name: '21081111RG', uniqueId: uniqueId },
      os: { name: 'android', version: '7.1.2', abis: ['arm64-v8a'], host: 'android' },
      app: { platform: 'android', version: '1.1.0', buildId: '97215000', engine: 'hbc85',
             signatures: ['6e8a975e3cbf07d5de823a760d4c2547f86c1403105020adee5de67ac510999e'],
             installer: 'com.android.vending' },
      version: { package: 'app.lokke.main', binary: '1.1.0', js: '1.1.0' }
    },
    appFocusTime: 0, playerActive: false, playDuration: 0,
    devMode: true, hasAddon: true, castConnected: false,
    package: 'app.lokke.main', version: '1.1.0', process: 'app',
    firstAppStart: now - 86400000, lastAppStart: now,
    ipLocation: clientIP, adblockEnabled: false,
    proxy: { supported: ['ss', 'openvpn'], engine: 'openvpn', ssVersion: 1,
             enabled: false, autoServer: true, id: 'fi-hel' },
    iap: { supported: true }
  };

  var res = await fetch('https://www.lokke.app/api/app/ping', {
    method: 'POST',
    headers: {
      'user-agent': 'okhttp/4.11.0',
      'accept': 'application/json',
      'content-type': 'application/json; charset=utf-8',
      'accept-encoding': 'gzip',
      'X-Forwarded-For': clientIP,
      'X-Real-IP': clientIP,
    },
    body: JSON.stringify(payload),
    timeout: 12000,
  });

  var lokkeText = await res.text();
  if (!res.ok) {
    console.error('[Vavoo] lokke ping error:', lokkeText.slice(0, 300));
    throw new Error('lokke ping HTTP ' + res.status);
  }
  var json = JSON.parse(lokkeText);
  console.log('[Vavoo] lokke ping OK, addonSig length:', json.addonSig ? json.addonSig.length : 'MISSING');
  if (!json.addonSig) throw new Error('addonSig mancante dalla risposta lokke: ' + lokkeText.slice(0, 200));

  // Riscrive gli IP nell'addonSig con l'IP del viewer (tecnica del Cloudflare Worker)
  var addonSig = json.addonSig;
  try {
    var decoded = Buffer.from(addonSig, 'base64').toString('utf8');
    var sigObj = JSON.parse(decoded);
    if (sigObj && sigObj.data) {
      var dataObj = JSON.parse(sigObj.data);
      var currentIps = Array.isArray(dataObj.ips) ? dataObj.ips : [];
      dataObj.ips = [clientIP].concat(currentIps.filter(function(x) { return x && x !== clientIP; }));
      if (typeof dataObj.ip === 'string') dataObj.ip = clientIP;
      sigObj.data = JSON.stringify(dataObj);
      addonSig = Buffer.from(JSON.stringify(sigObj)).toString('base64');
    }
  } catch (e) { /* mantieni sig originale */ }

  return addonSig;
}

// Risolve lo stream Vavoo tramite mediahubmx-resolve.json
async function resolveVavooStreamUrl(channelId, clientIP) {
  // MediaHubMX resolver riconosce il formato /channel/<id>
  var vavooUrl = 'https://vavoo.to/channel/' + channelId;
  var addonSig = await getAddonSig(clientIP);
  console.log('[Vavoo] resolving', channelId, 'for IP', clientIP);

  var res = await fetch('https://vavoo.to/mediahubmx-resolve.json', {
    method: 'POST',
    headers: {
      'user-agent': 'MediaHubMX/2',
      'accept': 'application/json',
      'content-type': 'application/json; charset=utf-8',
      'accept-encoding': 'gzip',
      'mediahubmx-signature': addonSig,
      'X-Forwarded-For': clientIP,
      'X-Real-IP': clientIP,
    },
    body: JSON.stringify({ language: 'de', region: 'AT', url: vavooUrl, clientVersion: '3.0.2' }),
    timeout: 12000,
  });

  var responseText = await res.text();
  if (!res.ok) {
    console.error('[Vavoo] mediahubmx-resolve error body:', responseText.slice(0, 500));
    throw new Error('mediahubmx-resolve HTTP ' + res.status);
  }
  var result = JSON.parse(responseText);

  var streamUrl;
  if (Array.isArray(result)) {
    var httpsItem = result.find(function(i) { return i.url && i.url.startsWith('https://'); });
    streamUrl = httpsItem ? httpsItem.url : (result[0] && result[0].url);
  } else {
    streamUrl = result && result.url;
  }

  if (!streamUrl) throw new Error('nessun URL stream nella risposta mediahubmx: ' + JSON.stringify(result).slice(0, 200));
  console.log('[Vavoo] resolved OK for', channelId);
  return streamUrl;
}

async function fetchVavooItaly() {
  try {
    var res = await fetch('https://vavoo.to/channels', {
      headers: { 'User-Agent': VAVOO_UA, 'Accept': '*/*' },
      timeout: 15000,
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var json = await res.json();
    if (!Array.isArray(json)) throw new Error('risposta non e un array');
    var italy = json.filter(function(ch) { return ch.country === 'Italy'; });
    italy.sort(function(a, b) { return a.p - b.p; });
    var seen = {};
    var deduped = italy.filter(function(ch) {
      var base = ch.name.replace(/\s*\(\d+\)\s*$/, '').trim().toLowerCase();
      if (seen[base]) return false;
      seen[base] = true;
      return true;
    });
    console.log('[Vavoo] Italia: ' + italy.length + ' | Deduplicati: ' + deduped.length);
    return deduped;
  } catch (e) {
    console.error('[Vavoo] fetchVavooItaly error:', e.message);
    return [];
  }
}

// DLStreams
async function fetchDLChannels(apiKey) {
  if (!apiKey) return [];
  try {
    var res = await fetch(
      'https://dlstreams.com/daddyapi.php?key=' + encodeURIComponent(apiKey) + '&endpoint=channels',
      { timeout: 12000 }
    );
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data;
    if (Array.isArray(json)) return json;
    return [];
  } catch (e) {
    console.error('[DLStreams] fetchChannels:', e.message);
    return [];
  }
}

async function resolveDLStream(channelId, proxyUrl, proxyPassword) {
  if (!proxyUrl) return null;
  var pageUrl = 'https://dlstreams.com/stream/stream-' + channelId + '.php';
  var proxied = proxyUrl.replace(/\/$/, '') + '/extractor/video'
    + '?d=' + encodeURIComponent(pageUrl)
    + '&redirect_stream=true'
    + '&api_password=' + encodeURIComponent(proxyPassword || '');
  return { url: proxied };
}

// Cache
var cache = { vavoo: { data: [], ts: 0 }, dl: {} };
var CACHE_TTL = 15 * 60 * 1000;

async function getCachedVavoo() {
  if (Date.now() - cache.vavoo.ts < CACHE_TTL && cache.vavoo.data.length > 0) return cache.vavoo.data;
  var ch = await fetchVavooItaly();
  cache.vavoo = { data: ch, ts: Date.now() };
  return ch;
}

async function getCachedDL(apiKey) {
  if (!apiKey) return [];
  var c = cache.dl[apiKey];
  if (c && Date.now() - c.ts < CACHE_TTL) return c.data;
  var ch = await fetchDLChannels(apiKey);
  cache.dl[apiKey] = { data: ch, ts: Date.now() };
  return ch;
}

// Config
function parseConfig(raw) {
  if (!raw || raw === 'default') {
    return { proxyUrl: '', proxyPassword: '', dlApiKey: '', vavooEnabled: true, dlEnabled: false };
  }
  try { return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); }
  catch (e) { return { proxyUrl: '', proxyPassword: '', dlApiKey: '', vavooEnabled: true, dlEnabled: false }; }
}

// Stremio manifest
var manifest = {
  id: 'community.lellotv',
  version: '1.4.0',
  name: 'LelloTV',
  description: 'Canali italiani Vavoo + DLStreams tramite EasyProxy.',
  resources: ['catalog', 'meta', 'stream'],
  types: ['tv'],
  catalogs: [
    { type: 'tv', id: 'lellotv-vavoo', name: 'LelloTV Vavoo Italia',
      extra: [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }] },
    { type: 'tv', id: 'lellotv-dl', name: 'LelloTV DLStreams',
      extra: [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }] },
  ],
  idPrefixes: ['lellotv-vavoo-', 'lellotv-dl-'],
  behaviorHints: { configurable: true, configurationRequired: false },
};

var builder = new addonBuilder(manifest);
var PAGE = 100;

builder.defineCatalogHandler(async function(args) {
  var type = args.type, id = args.id, extra = args.extra, configRaw = args.config;
  var config = parseConfig(configRaw);
  var search = ((extra && extra.search) || '').toLowerCase();
  var skip = parseInt((extra && extra.skip) || '0', 10);

  if (id === 'lellotv-vavoo') {
    var channels = await getCachedVavoo();
    var list = search ? channels.filter(function(c) { return (c.name || '').toLowerCase().indexOf(search) !== -1; }) : channels;
    return {
      metas: list.slice(skip, skip + PAGE).map(function(ch) {
        return { id: 'lellotv-vavoo-' + ch.id, type: 'tv', name: ch.name, genres: ['Italia'], description: 'Vavoo Italia' };
      }),
    };
  }

  if (id === 'lellotv-dl') {
    var channels = await getCachedDL(config.dlApiKey);
    var list = search ? channels.filter(function(c) { return (c.channel_name || '').toLowerCase().indexOf(search) !== -1; }) : channels;
    return {
      metas: list.slice(skip, skip + PAGE).map(function(ch) {
        var logo = ch.logo_url ? (ch.logo_url.startsWith('http') ? ch.logo_url : 'https://dlstreams.com/' + ch.logo_url) : undefined;
        return { id: 'lellotv-dl-' + ch.channel_id, type: 'tv', name: ch.channel_name, poster: logo, logo: logo, description: 'DLStreams' };
      }),
    };
  }

  return { metas: [] };
});

builder.defineMetaHandler(async function(args) {
  var id = args.id, configRaw = args.config;
  if (id.startsWith('lellotv-vavoo-')) {
    var chId = id.replace('lellotv-vavoo-', '');
    var channels = await getCachedVavoo();
    var ch = channels.find(function(c) { return String(c.id) === chId; });
    if (!ch) return { meta: null };
    return { meta: { id: id, type: 'tv', name: ch.name, genres: ['Italia'], description: 'Vavoo Italia' } };
  }
  if (id.startsWith('lellotv-dl-')) {
    var chId = id.replace('lellotv-dl-', '');
    var config = parseConfig(configRaw);
    var channels = await getCachedDL(config.dlApiKey);
    var ch = channels.find(function(c) { return String(c.channel_id) === chId; });
    if (!ch) return { meta: null };
    var logo = ch.logo_url ? (ch.logo_url.startsWith('http') ? ch.logo_url : 'https://dlstreams.com/' + ch.logo_url) : undefined;
    return { meta: { id: id, type: 'tv', name: ch.channel_name, poster: logo, logo: logo, description: 'DLStreams' } };
  }
  return { meta: null };
});

builder.defineStreamHandler(async function(args) {
  var id = args.id, configRaw = args.config;
  var config = parseConfig(configRaw);
  if (id.startsWith('lellotv-vavoo-')) {
    // Questo handler SDK non ha accesso a req per getSelfBase.
    // Il routing principale avviene nel router Express che gestisce il placeholder.
    // Restituiamo streams vuoto qui — Stremio riprova via il router diretto.
    return { streams: [] };
  }
  if (id.startsWith('lellotv-dl-')) {
    var chId = id.replace('lellotv-dl-', '');
    var stream = await resolveDLStream(chId, config.proxyUrl, config.proxyPassword);
    return { streams: stream ? [Object.assign({}, stream, { name: 'LelloTV', description: 'DLStreams' })] : [] };
  }
  return { streams: [] };
});

var addonInterface = builder.getInterface();

// Express
var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});

// Rileva il proprio URL pubblico
function getSelfBase(req) {
  var proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  var host  = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost';
  return proto + '://' + host;
}

// ── Proxy HLS interno per Vavoo ──────────────────────────────────────────────
// Il token Vavoo e IP-locked all'IP del server che lo genera.
// Facendo il proxy qui su LelloTV, token-IP == request-IP == funziona.

app.get('/vavoo-hls/:channelId', async function(req, res) {
  try {
    var token = await getVavooGuestToken();
    if (!token) return res.status(503).json({ error: 'Token Vavoo non disponibile' });

    var channelId = req.params.channelId;
    // Formato corretto con guest token: ?vavoo_auth=<token>
    // SSL ignorato perche il CDN Vavoo ha certificato scaduto
    var streamUrl = 'https://vavoo.to/play/' + channelId + '/index.m3u8?vavoo_auth=' + encodeURIComponent(token);
    console.log('[Vavoo HLS] fetching manifest for', channelId);

    var upstream = await fetch(streamUrl, {
      headers: { 'User-Agent': VAVOO_UA },
      redirect: 'follow',
      timeout: 12000,
      agent: function(parsedUrl) {
        return parsedUrl.protocol === 'https:' ? VAVOO_AGENT : undefined;
      },
    });

    if (!upstream.ok) {
      console.error('[Vavoo HLS] upstream', upstream.status, channelId);
      return res.status(upstream.status).json({ error: 'Vavoo error ' + upstream.status });
    }

    var m3u8 = await upstream.text();
    var finalUrl = upstream.url;
    var base = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
    var selfBase = getSelfBase(req);

    // Riscrive URL segmenti e nested playlist per passare per /vavoo-seg
    m3u8 = m3u8.replace(/^(?!#)(\S+)$/gm, function(line) {
      var absUrl = line.startsWith('http') ? line : base + line;
      return selfBase + '/vavoo-seg?u=' + encodeURIComponent(absUrl);
    });

    res.setHeader('Content-Type', 'application/x-mpegURL');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(m3u8);
  } catch (e) {
    console.error('[Vavoo HLS] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Proxy per segmenti TS e chiavi AES
app.get('/vavoo-seg', async function(req, res) {
  var targetUrl = req.query.u;
  if (!targetUrl) return res.status(400).send('Missing u');
  try {
    var upstream = await fetch(targetUrl, {
      headers: { 'User-Agent': VAVOO_UA },
      redirect: 'follow',
      timeout: 20000,
      agent: function(parsedUrl) {
        return parsedUrl.protocol === 'https:' ? VAVOO_AGENT : undefined;
      },
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/MP2T');
    upstream.body.pipe(res);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.get('/', function(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(CONFIGURE_HTML);
});

app.post('/api/encode-config', function(req, res) {
  var body = req.body;
  var config = {
    proxyUrl: body.proxyUrl || '',
    proxyPassword: body.proxyPassword || '',
    dlApiKey: body.dlApiKey || '',
    vavooEnabled: !!body.vavooEnabled,
    dlEnabled: !!body.dlEnabled,
  };
  res.json({ configB64: Buffer.from(JSON.stringify(config)).toString('base64') });
});

app.get('/debug/vavoo', async function(req, res) {
  try {
    var ch = await getCachedVavoo();
    var token = await getVavooToken();
    res.json({ count: ch.length, token_ok: !!token, sample: ch.slice(0, 5), cached_at: new Date(cache.vavoo.ts).toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

var RESOURCES = '(catalog|meta|stream)';

function extractFromPath(reqPath) {
  var m;
  m = reqPath.match(new RegExp('^\\/' + RESOURCES + '\\/([^/]+)\\/([^/]+)\\.json$'));
  if (m) return { config: 'default', resource: m[1], type: m[2], id: m[3] };

  m = reqPath.match(/^\/catalog\/([^/]+)\/([^/]+)\/skip=(\d+)\.json$/);
  if (m) return { config: 'default', resource: 'catalog', type: m[1], id: m[2], skip: m[3] };

  m = reqPath.match(new RegExp('^\/([^/]+)\\/' + RESOURCES + '\\/([^/]+)\\/([^/]+)\\.json$'));
  if (m) return { config: m[1], resource: m[2], type: m[3], id: m[4] };

  m = reqPath.match(/^\/([^/]+)\/catalog\/([^/]+)\/([^/]+)\/skip=(\d+)\.json$/);
  if (m) return { config: m[1], resource: 'catalog', type: m[2], id: m[3], skip: m[4] };

  return null;
}

app.get('/manifest.json', function(req, res) { res.json(addonInterface.manifest); });
app.get('/:config/manifest.json', function(req, res) { res.json(addonInterface.manifest); });

app.use(async function(req, res, next) {
  var parsed = extractFromPath(req.path);
  if (!parsed) return next();

  var config = parseConfig(parsed.config);
  var resource = parsed.resource;
  var type = parsed.type;
  var id = decodeURIComponent(parsed.id);
  var extra = {};
  if (parsed.skip) extra.skip = parsed.skip;
  if (req.query.search) extra.search = req.query.search;
  if (req.query.skip) extra.skip = req.query.skip;

  try {
    var result;

    if (resource === 'catalog') {
      if (id === 'lellotv-vavoo') {
        var channels = await getCachedVavoo();
        var search = (extra.search || '').toLowerCase();
        var skip = parseInt(extra.skip || '0', 10);
        var list = search ? channels.filter(function(c) { return (c.name || '').toLowerCase().indexOf(search) !== -1; }) : channels;
        result = {
          metas: list.slice(skip, skip + PAGE).map(function(ch) {
            return { id: 'lellotv-vavoo-' + ch.id, type: 'tv', name: ch.name, genres: ['Italia'], description: 'Vavoo Italia' };
          }),
        };
      } else if (id === 'lellotv-dl') {
        var channels = await getCachedDL(config.dlApiKey);
        var search = (extra.search || '').toLowerCase();
        var skip = parseInt(extra.skip || '0', 10);
        var list = search ? channels.filter(function(c) { return (c.channel_name || '').toLowerCase().indexOf(search) !== -1; }) : channels;
        result = {
          metas: list.slice(skip, skip + PAGE).map(function(ch) {
            var logo = ch.logo_url ? (ch.logo_url.startsWith('http') ? ch.logo_url : 'https://dlstreams.com/' + ch.logo_url) : undefined;
            return { id: 'lellotv-dl-' + ch.channel_id, type: 'tv', name: ch.channel_name, poster: logo, logo: logo, description: 'DLStreams' };
          }),
        };
      } else {
        result = { metas: [] };
      }

    } else if (resource === 'meta') {
      if (id.startsWith('lellotv-vavoo-')) {
        var chId = id.replace('lellotv-vavoo-', '');
        var channels = await getCachedVavoo();
        var ch = channels.find(function(c) { return String(c.id) === chId; });
        result = { meta: ch ? { id: id, type: 'tv', name: ch.name, genres: ['Italia'], description: 'Vavoo Italia' } : null };
      } else if (id.startsWith('lellotv-dl-')) {
        var chId = id.replace('lellotv-dl-', '');
        var channels = await getCachedDL(config.dlApiKey);
        var ch = channels.find(function(c) { return String(c.channel_id) === chId; });
        var logo = ch && ch.logo_url ? (ch.logo_url.startsWith('http') ? ch.logo_url : 'https://dlstreams.com/' + ch.logo_url) : undefined;
        result = { meta: ch ? { id: id, type: 'tv', name: ch.channel_name, poster: logo, logo: logo, description: 'DLStreams' } : null };
      } else {
        result = { meta: null };
      }

    } else if (resource === 'stream') {
      if (id.startsWith('lellotv-vavoo-')) {
        var chId = id.replace('lellotv-vavoo-', '');
        var clientIP = getViewerIP(req);
        try {
          var streamUrl = await resolveVavooStreamUrl(chId, clientIP);
          result = { streams: [{ url: streamUrl, name: 'LelloTV', description: '\ud83c\uddee\ud83c\uddf9 Vavoo Italia' }] };
        } catch (e) {
          console.error('[Vavoo] resolve error:', e.message);
          result = { streams: [] };
        }
      } else if (id.startsWith('lellotv-dl-')) {
        var chId = id.replace('lellotv-dl-', '');
        var stream = await resolveDLStream(chId, config.proxyUrl, config.proxyPassword);
        result = { streams: stream ? [Object.assign({}, stream, { name: 'LelloTV', description: 'DLStreams' })] : [] };
      } else {
        result = { streams: [] };
      }
    } else {
      return next();
    }

    res.json(result);
  } catch (e) {
    console.error('[' + resource + '] ' + id + ':', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.use(function(req, res) {
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.listen(PORT, '0.0.0.0', function() {
  console.log('LelloTV v1.4 -> http://0.0.0.0:' + PORT);
});
