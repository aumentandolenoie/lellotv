const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const PORT = process.env.PORT || 7860;

// ─── Vavoo helpers ────────────────────────────────────────────────────────────

// Generates a Vavoo-compatible signature/auth_token using a timestamp-based hash.
// This replicates the approach used by open-source Vavoo proxy projects.
function generateVavooToken() {
  const now = Math.floor(Date.now() / 1000);
  // Simple reproducible token format used by Vavoo bundles
  const base = `${now}vavoo_is_great`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash + base.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16);
}

async function fetchVavooChannels() {
  // Vavoo bundle URL — this is a well-known public M3U endpoint
  const bundleUrl = 'https://vavoo.to/channels';
  const token = generateVavooToken();
  try {
    const res = await fetch(bundleUrl, {
      headers: {
        'User-Agent': 'VAVOO/2.6',
        'Authorization': `Bearer ${token}`,
      },
      timeout: 10000,
    });
    if (!res.ok) throw new Error(`Vavoo HTTP ${res.status}`);
    const json = await res.json();
    // Vavoo returns: [{ id, name, group, logo, url }, ...]
    return Array.isArray(json) ? json : [];
  } catch (e) {
    console.error('[Vavoo] fetchChannels error:', e.message);
    return [];
  }
}

async function resolveVavooStream(channelId, proxyUrl, proxyPassword) {
  // EasyProxy extractor endpoint for Vavoo
  // Format: <proxy>/extractor/video?d=https://vavoo.to/play/<id>/index.m3u8&redirect_stream=true
  const streamUrl = `https://vavoo.to/play/${channelId}/index.m3u8`;
  if (!proxyUrl) {
    // No proxy: return direct URL with required headers hint
    return {
      url: streamUrl,
      behaviorHints: { notWebReady: false, headers: { 'User-Agent': 'VAVOO/2.6' } },
    };
  }
  const base = proxyUrl.replace(/\/$/, '');
  const token = generateVavooToken();
  // Route through EasyProxy: /proxy/manifest.m3u8?url=<>&h_User-Agent=VAVOO/2.6&h_Authorization=Bearer <token>
  const proxied = `${base}/proxy/manifest.m3u8?url=${encodeURIComponent(streamUrl)}&h_User-Agent=VAVOO%2F2.6&h_Authorization=Bearer%20${token}&password=${encodeURIComponent(proxyPassword || '')}`;
  return { url: proxied };
}

// ─── DLStreams helpers ────────────────────────────────────────────────────────

async function fetchDLChannels(apiKey) {
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `https://dlstreams.com/daddyapi.php?key=${encodeURIComponent(apiKey)}&endpoint=channels`,
      { timeout: 10000 }
    );
    if (!res.ok) throw new Error(`DLStreams HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data;
    // Some API versions return array directly
    if (Array.isArray(json)) return json;
    return [];
  } catch (e) {
    console.error('[DLStreams] fetchChannels error:', e.message);
    return [];
  }
}

async function resolveDLStream(channelId, proxyUrl, proxyPassword) {
  // DLStreams player page URL (the page EasyProxy extractor will scrape)
  const pageUrl = `https://dlstreams.com/stream/stream-${channelId}.php`;
  if (!proxyUrl) {
    // No proxy: return the iframe embed page (Stremio can't play this directly)
    return null;
  }
  const base = proxyUrl.replace(/\/$/, '');
  // Use EasyProxy extractor to resolve the actual HLS stream from the page
  const proxied = `${base}/extractor/video?d=${encodeURIComponent(pageUrl)}&redirect_stream=true&password=${encodeURIComponent(proxyPassword || '')}`;
  return { url: proxied };
}

// ─── In-memory cache ──────────────────────────────────────────────────────────

const cache = {
  vavoo: { data: [], ts: 0 },
  dl: {},            // keyed by apiKey
};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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
    const json = Buffer.from(configB64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return { proxyUrl: '', proxyPassword: '', dlApiKey: '', vavooEnabled: true, dlEnabled: false };
  }
}

// ─── Stremio Addon Builder ────────────────────────────────────────────────────

const manifest = {
  id: 'community.lellotv',
  version: '1.0.0',
  name: 'LelloTV',
  description: 'Live TV channels from Vavoo and DLStreams (DaddyLive), routed through your EasyProxy.',
  logo: 'https://i.imgur.com/hCZsKyX.png',
  resources: ['catalog', 'meta', 'stream'],
  types: ['tv'],
  catalogs: [
    {
      type: 'tv',
      id: 'lellotv-vavoo',
      name: 'LelloTV – Vavoo',
      extra: [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }],
    },
    {
      type: 'tv',
      id: 'lellotv-dl',
      name: 'LelloTV – DLStreams',
      extra: [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }],
    },
  ],
  idPrefixes: ['lellotv-vavoo-', 'lellotv-dl-'],
  behaviorHints: { configurable: true, configurationRequired: false },
  config: [],
};

const builder = new addonBuilder(manifest);

// CATALOG handler
builder.defineCatalogHandler(async ({ type, id, extra, config: configRaw }) => {
  const config = parseConfig(configRaw);
  const search = extra && extra.search ? extra.search.toLowerCase() : '';
  const skip = parseInt((extra && extra.skip) || '0', 10);
  const PAGE = 100;

  if (id === 'lellotv-vavoo') {
    const channels = await getCachedVavoo();
    let filtered = channels;
    if (search) filtered = channels.filter(c => c.name && c.name.toLowerCase().includes(search));
    const page = filtered.slice(skip, skip + PAGE);
    return {
      metas: page.map(ch => ({
        id: `lellotv-vavoo-${ch.id}`,
        type: 'tv',
        name: ch.name || `Channel ${ch.id}`,
        poster: ch.logo || undefined,
        background: ch.logo || undefined,
        logo: ch.logo || undefined,
        genres: ch.group ? [ch.group] : [],
        description: `Vavoo – ${ch.group || 'Live TV'}`,
      })),
    };
  }

  if (id === 'lellotv-dl') {
    const channels = await getCachedDL(config.dlApiKey);
    let filtered = channels;
    if (search) filtered = channels.filter(c => c.channel_name && c.channel_name.toLowerCase().includes(search));
    const page = filtered.slice(skip, skip + PAGE);
    return {
      metas: page.map(ch => {
        const logo = ch.logo_url
          ? ch.logo_url.startsWith('http') ? ch.logo_url : `https://dlstreams.com/${ch.logo_url}`
          : undefined;
        return {
          id: `lellotv-dl-${ch.channel_id}`,
          type: 'tv',
          name: ch.channel_name,
          poster: logo,
          logo,
          description: 'DLStreams – Live TV',
        };
      }),
    };
  }

  return { metas: [] };
});

// META handler
builder.defineMetaHandler(async ({ type, id, config: configRaw }) => {
  if (id.startsWith('lellotv-vavoo-')) {
    const chId = id.replace('lellotv-vavoo-', '');
    const channels = await getCachedVavoo();
    const ch = channels.find(c => String(c.id) === chId);
    if (!ch) return { meta: null };
    return {
      meta: {
        id,
        type: 'tv',
        name: ch.name,
        poster: ch.logo || undefined,
        logo: ch.logo || undefined,
        genres: ch.group ? [ch.group] : [],
        description: `Vavoo – ${ch.group || 'Live TV'}`,
      },
    };
  }
  if (id.startsWith('lellotv-dl-')) {
    const chId = id.replace('lellotv-dl-', '');
    const config = parseConfig(configRaw);
    const channels = await getCachedDL(config.dlApiKey);
    const ch = channels.find(c => String(c.channel_id) === chId);
    if (!ch) return { meta: null };
    const logo = ch.logo_url
      ? ch.logo_url.startsWith('http') ? ch.logo_url : `https://dlstreams.com/${ch.logo_url}`
      : undefined;
    return {
      meta: {
        id,
        type: 'tv',
        name: ch.channel_name,
        poster: logo,
        logo,
        description: 'DLStreams – Live TV',
      },
    };
  }
  return { meta: null };
});

// STREAM handler
builder.defineStreamHandler(async ({ type, id, config: configRaw }) => {
  const config = parseConfig(configRaw);

  if (id.startsWith('lellotv-vavoo-')) {
    const chId = id.replace('lellotv-vavoo-', '');
    const stream = await resolveVavooStream(chId, config.proxyUrl, config.proxyPassword);
    return { streams: stream ? [{ ...stream, name: 'LelloTV', description: 'Vavoo via EasyProxy' }] : [] };
  }

  if (id.startsWith('lellotv-dl-')) {
    const chId = id.replace('lellotv-dl-', '');
    const stream = await resolveDLStream(chId, config.proxyUrl, config.proxyPassword);
    return { streams: stream ? [{ ...stream, name: 'LelloTV', description: 'DLStreams via EasyProxy' }] : [] };
  }

  return { streams: [] };
});

// ─── Express server with config UI ───────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve the SDK addon interface under /:config/
const addonInterface = builder.getInterface();

// Config page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'configure.html'));
});

// API to encode config
app.post('/api/encode-config', (req, res) => {
  const { proxyUrl, proxyPassword, dlApiKey, vavooEnabled, dlEnabled } = req.body;
  const config = { proxyUrl, proxyPassword, dlApiKey, vavooEnabled: !!vavooEnabled, dlEnabled: !!dlEnabled };
  const b64 = Buffer.from(JSON.stringify(config)).toString('base64');
  res.json({ configB64: b64 });
});

// Stremio addon routes
app.get('/manifest.json', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(addonInterface.manifest);
});

// Config-aware routes: /:config/manifest.json, /:config/catalog/..., etc.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});

// Mount the addon SDK router
const sdkRouter = serveHTTP(addonInterface, { port: null });

// Handle all addon routes (with optional config prefix)
const ADDON_ROUTES = /^\/(([A-Za-z0-9+/=]+)\/)?(manifest\.json|catalog\/|meta\/|stream\/).*$/;

app.use((req, res, next) => {
  // inject config into the URL if present as a path segment
  const match = req.path.match(/^\/([A-Za-z0-9+/=]{20,})\/(manifest\.json|catalog|meta|stream)(.*)?$/);
  if (match) {
    // rewrite to pass config
    req.url = `/${match[2]}${match[3] || ''}`;
    // store config for handlers
    req.addonConfig = match[1];
  }
  next();
});

// Stremio SDK serve
app.get('/:config/manifest.json', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ ...addonInterface.manifest });
});

app.get('/:config/catalog/:type/:id.json', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const extra = {};
    if (req.query.search) extra.search = req.query.search;
    if (req.query.skip) extra.skip = req.query.skip;
    const result = await addonInterface.get({ resource: 'catalog', type: req.params.type, id: req.params.id, extra, config: req.params.config });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/:config/catalog/:type/:id/skip=:skip.json', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const result = await addonInterface.get({ resource: 'catalog', type: req.params.type, id: req.params.id, extra: { skip: req.params.skip }, config: req.params.config });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/:config/meta/:type/:id.json', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const result = await addonInterface.get({ resource: 'meta', type: req.params.type, id: req.params.id, config: req.params.config });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/:config/stream/:type/:id.json', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const result = await addonInterface.get({ resource: 'stream', type: req.params.type, id: req.params.id, config: req.params.config });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Default routes without config
app.get('/catalog/:type/:id.json', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const extra = {};
    if (req.query.search) extra.search = req.query.search;
    const result = await addonInterface.get({ resource: 'catalog', type: req.params.type, id: req.params.id, extra, config: 'default' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/stream/:type/:id.json', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const result = await addonInterface.get({ resource: 'stream', type: req.params.type, id: req.params.id, config: 'default' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
  console.log(`\n🎬 LelloTV running on http://localhost:${PORT}`);
  console.log(`📋 Configure at: http://localhost:${PORT}/`);
  console.log(`📡 Manifest:     http://localhost:${PORT}/manifest.json`);
});
