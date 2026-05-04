'use strict';

const { addonBuilder } = require('stremio-addon-sdk');
const express = require('express');
const fetch = require('node-fetch');

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

// Cache del guest token
var vavooGuestToken = null;
var vavooGuestTokenTs = 0;
var GUEST_TOKEN_TTL = 30 * 60 * 1000; // 30 minuti (token dura ~60 min)

async function getVavooGuestToken() {
  if (vavooGuestToken && Date.now() - vavooGuestTokenTs < GUEST_TOKEN_TTL) {
    return vavooGuestToken;
  }
  try {
    var res = await fetch('https://www.vavoo.tv/api/box/guest', {
      method: 'POST',
      headers: {
        'User-Agent': VAVOO_UA,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform: 'Windows NT x86 32-bit',
        version: '2.6',
        service_version: '1.2.24',
        branch: 'master',
      }),
      timeout: 10000,
    });
    if (!res.ok) throw new Error('guest HTTP ' + res.status);
    var json = await res.json();
    // La risposta ha: { response: { signed: "TOKEN..." } }
    var token = (json.response && json.response.signed) || json.signed || null;
    if (!token) throw new Error('signed non trovato: ' + JSON.stringify(json).slice(0, 200));
    vavooGuestToken = token;
    vavooGuestTokenTs = Date.now();
    console.log('[Vavoo] Guest token ottenuto, lunghezza: ' + token.length);
    return token;
  } catch (e) {
    console.error('[Vavoo] getVavooGuestToken error:', e.message);
    return null;
  }
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

async function resolveVavooStream(channelId, proxyUrl, proxyPassword) {
  // 1. Ottieni il guest token da vavoo.tv/api/box/guest
  // 2. Costruisci URL: https://vavoo.to/vavoo-iptv/play/<id><token>
  //    (questo è il formato corretto usato da TvVoo e altri addon funzionanti)
  // 3. Passa a EasyProxy come proxy/manifest.m3u8?d=<url>
  var token = await getVavooGuestToken();
  var base = (proxyUrl || '').replace(/\/$/, '');
  var pwd = encodeURIComponent(proxyPassword || '');

  // URL stream nel formato corretto con token autenticato
  var streamUrl = token
    ? 'https://vavoo.to/vavoo-iptv/play/' + channelId + token
    : 'https://vavoo.to/play/' + channelId + '/index.m3u8';

  if (!base) {
    return {
      url: streamUrl,
      behaviorHints: { notWebReady: false, headers: { 'User-Agent': VAVOO_UA } },
    };
  }

  // EasyProxy proxia il manifest con User-Agent VAVOO/2.6
  var url = base + '/proxy/manifest.m3u8'
    + '?d=' + encodeURIComponent(streamUrl)
    + '&h_User-Agent=VAVOO%2F2.6'
    + '&api_password=' + pwd;

  return { url: url };
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
    var chId = id.replace('lellotv-vavoo-', '');
    var stream = await resolveVavooStream(chId, config.proxyUrl, config.proxyPassword);
    return { streams: [Object.assign({}, stream, { name: 'LelloTV', description: 'Vavoo Italia' })] };
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
        var stream = await resolveVavooStream(chId, config.proxyUrl, config.proxyPassword);
        result = { streams: [Object.assign({}, stream, { name: 'LelloTV', description: 'Vavoo Italia' })] };
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
