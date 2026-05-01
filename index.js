'use strict';

const { addonBuilder } = require('stremio-addon-sdk');
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 7860;
// path.resolve garantisce il percorso assoluto corretto anche su Render
const PUBLIC_DIR = path.resolve(__dirname, 'public');

// ─── Vavoo helpers ────────────────────────────────────────────────────────────

function generateVavooToken() {
  const now = Math.floor(Date.now() / 1000);
  const base = `${now}vavoo_is_great`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash + base.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16);
}

async function fetchVavooChannels() {
  const bundleUrl = 'https://vavoo.to/channels';
  const token = generateVavooToken();
  try {
    const res = await fetch(bundleUrl, {
      headers: { 'User-Agent': 'VAVOO/2.6', 'Authorization': `Bearer ${token}` },
      timeout: 12000,
    });
    if (!res.ok) throw new Error(`Vavoo HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch (e) {
    console.error('[Vavoo] fetchChannels error:', e.message);
    return [];
  }
}

async function resolveVavooStream(channelId, proxyUrl, proxyPassword) {
  const streamUrl = `https://vavoo.to/play/${channelId}/index.m3u8`;
  if (!proxyUrl) {
    return {
      url: streamUrl,
      behaviorHints: { notWebReady: false, headers: { 'User-Agent': 'VAVOO/2.6' } },
    };
  }
  const base = proxyUrl.replace(/\/$/, '');
  const token = generateVavooToken();
  const proxied = `${base}/proxy/manifest.m3u8?url=${encodeURIComponent(streamUrl)}`
    + `&h_User-Agent=VAVOO%2F2.6`
    + `&h_Authorization=Bearer%20${token}`
    + `&password=${encodeURIComponent(proxyPassword || '')}`;
  return { url: proxied };
}

// ─── DLStreams helpers ────────────────────────────────────────────────────────

async function fetchDLChannels(apiKey) {
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `https://dlstreams.com/daddyapi.php?key=${encodeURIComponent(apiKey)}&endpoint=channels`,
      { timeout: 12000 }
    );
    if (!res.ok) throw new Error(`DLStreams HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data;
    if (Array.isArray(json)) return json;
    return [];
  } catch (e) {
    console.error('[DLStreams] fetchChannels error:', e.message);
    return [];
  }
}

async function resolveDLStream(channelId, proxyUrl, proxyPassword) {
  const pageUrl = `https://dlstreams.com/stream/stream-${channelId}.php`;
  if (!proxyUrl) return null;
  const base = proxyUrl.replace(/\/$/, '');
  const proxied = `${base}/extractor/video?d=${encodeURIComponent(pageUrl)}`
    + `&redirect_stream=true`
    + `&password=${encodeURIComponent(proxyPassword || '')}`;
  return { url: proxied };
}

// ─── Cache in-memory ──────────────────────────────────────────────────────────

const cache = { vavoo: { data: [], ts: 0 }, dl: {} };
const CACHE_TTL = 10 * 60 * 1000;

async function getCachedVavoo() {
  if (Date.now() - cache.vavoo.ts < CACHE_TTL) return cache.vavoo.data;
  const ch = await fetchVavooChannels();
  cache.vavoo = { data: ch, ts: Date.now() };
  return ch;
}

async function getCachedDL(apiKey) {
  if (!apiKey) return [];
  const c = cache.dl[apiKey];
  if (c && Date.now() - c.ts < CACHE_TTL) return c.data;
  const ch = await fetchDLChannels(apiKey);
  cache.dl[apiKey] = { data: ch, ts: Date.now() };
  return ch;
}

// ─── Config parsing ───────────────────────────────────────────────────────────

function parseConfig(configB64) {
  if (!configB64 || configB64 === 'default') {
    return { proxyUrl: '', proxyPassword: '', dlApiKey: '', vavooEnabled: true, dlEnabled: false };
  }
  try {
    return JSON.parse(Buffer.from(configB64, 'base64').toString('utf8'));
  } catch {
    return { proxyUrl: '', proxyPassword: '', dlApiKey: '', vavooEnabled: true, dlEnabled: false };
  }
}

// ─── Stremio Addon ────────────────────────────────────────────────────────────

const manifest = {
  id: 'community.lellotv',
  version: '1.1.0',
  name: 'LelloTV',
  description: 'Live TV da Vavoo e DLStreams tramite EasyProxy.',
  resources: ['catalog', 'meta', 'stream'],
  types: ['tv'],
  catalogs: [
    { type: 'tv', id: 'lellotv-vavoo', name: 'LelloTV – Vavoo',
      extra: [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }] },
    { type: 'tv', id: 'lellotv-dl', name: 'LelloTV – DLStreams',
      extra: [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }] },
  ],
  idPrefixes: ['lellotv-vavoo-', 'lellotv-dl-'],
  behaviorHints: { configurable: true, configurationRequired: false },
};

const builder = new addonBuilder(manifest);
const PAGE = 100;

builder.defineCatalogHandler(async ({ type, id, extra, config: configRaw }) => {
  const config = parseConfig(configRaw);
  const search = (extra && extra.search || '').toLowerCase();
  const skip = parseInt(extra && extra.skip || '0', 10);

  if (id === 'lellotv-vavoo') {
    const channels = await getCachedVavoo();
    let list = search ? channels.filter(c => (c.name || '').toLowerCase().includes(search)) : channels;
    return {
      metas: list.slice(skip, skip + PAGE).map(ch => ({
        id: `lellotv-vavoo-${ch.id}`,
        type: 'tv',
        name: ch.name || `Ch ${ch.id}`,
        poster: ch.logo || undefined,
        logo: ch.logo || undefined,
        genres: ch.group ? [ch.group] : [],
        description: `Vavoo – ${ch.group || 'Live TV'}`,
      })),
    };
  }

  if (id === 'lellotv-dl') {
    const channels = await getCachedDL(config.dlApiKey);
    let list = search ? channels.filter(c => (c.channel_name || '').toLowerCase().includes(search)) : channels;
    return {
      metas: list.slice(skip, skip + PAGE).map(ch => {
        const logo = ch.logo_url
          ? (ch.logo_url.startsWith('http') ? ch.logo_url : `https://dlstreams.com/${ch.logo_url}`)
          : undefined;
        return { id: `lellotv-dl-${ch.channel_id}`, type: 'tv', name: ch.channel_name, poster: logo, logo, description: 'DLStreams – Live TV' };
      }),
    };
  }

  return { metas: [] };
});

builder.defineMetaHandler(async ({ type, id, config: configRaw }) => {
  if (id.startsWith('lellotv-vavoo-')) {
    const chId = id.replace('lellotv-vavoo-', '');
    const channels = await getCachedVavoo();
    const ch = channels.find(c => String(c.id) === chId);
    if (!ch) return { meta: null };
    return { meta: { id, type: 'tv', name: ch.name, poster: ch.logo, logo: ch.logo, genres: ch.group ? [ch.group] : [], description: `Vavoo – ${ch.group || 'Live TV'}` } };
  }
  if (id.startsWith('lellotv-dl-')) {
    const chId = id.replace('lellotv-dl-', '');
    const config = parseConfig(configRaw);
    const channels = await getCachedDL(config.dlApiKey);
    const ch = channels.find(c => String(c.channel_id) === chId);
    if (!ch) return { meta: null };
    const logo = ch.logo_url ? (ch.logo_url.startsWith('http') ? ch.logo_url : `https://dlstreams.com/${ch.logo_url}`) : undefined;
    return { meta: { id, type: 'tv', name: ch.channel_name, poster: logo, logo, description: 'DLStreams – Live TV' } };
  }
  return { meta: null };
});

builder.defineStreamHandler(async ({ type, id, config: configRaw }) => {
  const config = parseConfig(configRaw);
  if (id.startsWith('lellotv-vavoo-')) {
    const stream = await resolveVavooStream(id.replace('lellotv-vavoo-', ''), config.proxyUrl, config.proxyPassword);
    return { streams: stream ? [{ ...stream, name: 'LelloTV', description: 'Vavoo via EasyProxy' }] : [] };
  }
  if (id.startsWith('lellotv-dl-')) {
    const stream = await resolveDLStream(id.replace('lellotv-dl-', ''), config.proxyUrl, config.proxyPassword);
    return { streams: stream ? [{ ...stream, name: 'LelloTV', description: 'DLStreams via EasyProxy' }] : [] };
  }
  return { streams: [] };
});

const addonInterface = builder.getInterface();

// ─── Express ──────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});

// ── Pagina di configurazione ──
app.get('/', (req, res) => {
  const htmlPath = path.join(PUBLIC_DIR, 'configure.html');
  if (!fs.existsSync(htmlPath)) {
    console.error('configure.html non trovato in:', htmlPath);
    return res.status(500).send(
      `<h1>Errore: configure.html non trovato</h1><p>Path cercato: ${htmlPath}</p>`
    );
  }
  res.sendFile(htmlPath);
});

// ── File statici ──
app.use(express.static(PUBLIC_DIR));

// ── API encode config ──
app.post('/api/encode-config', (req, res) => {
  const { proxyUrl, proxyPassword, dlApiKey, vavooEnabled, dlEnabled } = req.body;
  const config = { proxyUrl, proxyPassword, dlApiKey, vavooEnabled: !!vavooEnabled, dlEnabled: !!dlEnabled };
  res.json({ configB64: Buffer.from(JSON.stringify(config)).toString('base64') });
});

// ── Helper per chiamare addonInterface ──
function handleAddon(resource, req, res) {
  const configRaw = req.params.config || 'default';
  const id = decodeURIComponent(req.params.id || '');
  const type = req.params.type || 'tv';
  const extra = {};
  if (req.query.search) extra.search = req.query.search;
  if (req.query.skip) extra.skip = req.query.skip;
  if (req.params.skip) extra.skip = req.params.skip;

  addonInterface.get({ resource, type, id, extra, config: configRaw })
    .then(result => res.json(result))
    .catch(e => { console.error(`[${resource}] error:`, e.message); res.status(500).json({ error: e.message }); });
}

// ── Manifest ──
app.get('/manifest.json', (req, res) => res.json(addonInterface.manifest));
app.get('/:config/manifest.json', (req, res) => res.json(addonInterface.manifest));

// ── Catalog ──
app.get('/catalog/:type/:id.json', (req, res) => handleAddon('catalog', req, res));
app.get('/:config/catalog/:type/:id.json', (req, res) => handleAddon('catalog', req, res));
app.get('/catalog/:type/:id/skip=:skip.json', (req, res) => handleAddon('catalog', req, res));
app.get('/:config/catalog/:type/:id/skip=:skip.json', (req, res) => handleAddon('catalog', req, res));

// ── Meta ──
app.get('/meta/:type/:id.json', (req, res) => handleAddon('meta', req, res));
app.get('/:config/meta/:type/:id.json', (req, res) => handleAddon('meta', req, res));

// ── Stream ──
app.get('/stream/:type/:id.json', (req, res) => handleAddon('stream', req, res));
app.get('/:config/stream/:type/:id.json', (req, res) => handleAddon('stream', req, res));

// ── 404 ──
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

// ─── Avvio ───────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎬 LelloTV v1.1 → http://0.0.0.0:${PORT}`);
  console.log(`📁 Public dir: ${PUBLIC_DIR} (esiste: ${fs.existsSync(PUBLIC_DIR)})`);
  const htmlOk = fs.existsSync(path.join(PUBLIC_DIR, 'configure.html'));
  console.log(`📄 configure.html: ${htmlOk ? '✅ trovato' : '❌ NON trovato!'}`);
});
