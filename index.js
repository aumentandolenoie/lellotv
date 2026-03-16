const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const express = require("express");
const channels = require("./channels");
const { resolveStream } = require("./proxy");

// ─── CONFIGURAZIONE ────────────────────────────────────────────────────────────
// Imposta qui il tuo proxy se ne hai uno (es: "http://user:pass@host:port")
// Lascia null per non usare proxy
const PROXY_URL = process.env.PROXY_URL || null;

const PORT = process.env.PORT || 3000;
// ───────────────────────────────────────────────────────────────────────────────

const manifest = {
  id: "org.stremio.iptv.italia",
  version: "1.0.0",
  name: "📺 IPTV Italia Free",
  description:
    "Canali italiani gratuiti: Rai e canali free-to-air. Supporto proxy integrato.",
  logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Flag_of_Italy.svg/200px-Flag_of_Italy.svg.png",
  resources: ["catalog", "stream", "meta"],
  types: ["tv"],
  catalogs: [
    {
      type: "tv",
      id: "iptv-italia-free",
      name: "📺 Italia Free",
      extra: [{ name: "genre", isRequired: false }],
    },
  ],
  behaviorHints: {
    configurable: true,
    configurationRequired: false,
  },
};

const builder = new addonBuilder(manifest);

// ─── CATALOG ───────────────────────────────────────────────────────────────────
// Restituisce la lista dei canali
builder.defineCatalogHandler(({ type, id, extra }) => {
  if (type !== "tv" || id !== "iptv-italia-free") {
    return Promise.resolve({ metas: [] });
  }

  let filteredChannels = channels;

  // Filtra per genere se richiesto
  if (extra && extra.genre) {
    filteredChannels = channels.filter((ch) => ch.genre === extra.genre);
  }

  const metas = filteredChannels.map((ch) => ({
    id: `iptv:${ch.id}`,
    type: "tv",
    name: ch.name,
    poster: ch.logo,
    logo: ch.logo,
    background: ch.logo,
    description: `Canale: ${ch.name} | Genere: ${ch.genre}`,
    genres: [ch.genre],
  }));

  return Promise.resolve({ metas });
});

// ─── META ──────────────────────────────────────────────────────────────────────
builder.defineMetaHandler(({ type, id }) => {
  if (type !== "tv" || !id.startsWith("iptv:")) {
    return Promise.resolve({ meta: null });
  }

  const channelId = id.replace("iptv:", "");
  const channel = channels.find((ch) => ch.id === channelId);

  if (!channel) return Promise.resolve({ meta: null });

  return Promise.resolve({
    meta: {
      id: `iptv:${channel.id}`,
      type: "tv",
      name: channel.name,
      poster: channel.logo,
      logo: channel.logo,
      description: `${channel.name} - Canale free italiano`,
      genres: [channel.genre],
    },
  });
});

// ─── STREAM ────────────────────────────────────────────────────────────────────
builder.defineStreamHandler(async ({ type, id }, req) => {
  if (type !== "tv" || !id.startsWith("iptv:")) {
    return Promise.resolve({ streams: [] });
  }

  const channelId = id.replace("iptv:", "");
  const channel = channels.find((ch) => ch.id === channelId);

  if (!channel) return Promise.resolve({ streams: [] });

  // Recupera l'IP del client
  const clientIp =
    (req && req.headers && req.headers["x-forwarded-for"]) ||
    (req && req.socket && req.socket.remoteAddress) ||
    "127.0.0.1";

  console.log(`▶ Richiesta stream: ${channel.name} | IP client: ${clientIp}`);

  // Risolvi l'URL finale dello stream
  const resolvedUrl = await resolveStream(channel.stream, clientIp, PROXY_URL);

  console.log(`✅ Stream risolto: ${resolvedUrl}`);

  return Promise.resolve({
    streams: [
      {
        name: channel.name,
        title: `📺 ${channel.name}\n🌐 Stream HLS`,
        url: resolvedUrl,
        behaviorHints: {
          notWebReady: false,
        },
      },
    ],
  });
});

// ─── AVVIO SERVER ──────────────────────────────────────────────────────────────
const addonInterface = builder.getInterface();

const app = express();

// Endpoint principale dell'addon
app.use("/", (req, res, next) => {
  // Aggiungi CORS per Stremio
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

// Pagina di benvenuto
app.get("/", (req, res) => {
  const installUrl = `stremio://${req.headers.host}/manifest.json`;
  res.send(`
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <title>IPTV Italia Free - Stremio Addon</title>
      <style>
        body { font-family: Arial, sans-serif; background: #1a1a2e; color: #eee; 
               display: flex; flex-direction: column; align-items: center; 
               justify-content: center; min-height: 100vh; margin: 0; }
        h1 { color: #e94560; }
        .btn { background: #e94560; color: white; padding: 15px 30px; 
               text-decoration: none; border-radius: 8px; font-size: 18px; 
               margin-top: 20px; display: inline-block; }
        .btn:hover { background: #c73652; }
        .info { background: #16213e; padding: 20px; border-radius: 10px; 
                margin-top: 20px; max-width: 500px; }
        code { background: #0f3460; padding: 5px 10px; border-radius: 4px; 
               font-size: 13px; word-break: break-all; }
      </style>
    </head>
    <body>
      <h1>📺 IPTV Italia Free</h1>
      <p>Addon Stremio per canali italiani gratuiti</p>
      <a class="btn" href="${installUrl}">🚀 Installa su Stremio</a>
      <div class="info">
        <p><strong>URL Manifest:</strong><br>
        <code>https://${req.headers.host}/manifest.json</code></p>
        <p><strong>Canali disponibili:</strong> ${channels.length}</p>
        <p><strong>Proxy configurato:</strong> ${PROXY_URL ? "✅ Sì" : "❌ No"}</p>
      </div>
    </body>
    </html>
  `);
});

serveHTTP(addonInterface, { app, port: PORT });

console.log(`🚀 Addon avviato su http://localhost:${PORT}`);
console.log(`📋 Manifest: http://localhost:${PORT}/manifest.json`);
if (PROXY_URL) console.log(`🌐 Proxy attivo: ${PROXY_URL}`);
