const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const express = require("express");
const channels = require("./channels");
const { resolveStream } = require("./proxy");

const PORT = process.env.PORT || 3000;

// ─── MANIFEST ──────────────────────────────────────────────────────────────────
const manifest = {
  id: "org.stremio.lellotv",
  version: "1.0.0",
  name: "LelloTv",
  description: "LelloTv - Tv in Diretta",
  logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Flag_of_Italy.svg/200px-Flag_of_Italy.svg.png",
  resources: ["catalog", "stream", "meta"],
  types: ["tv"],
  catalogs: [
    {
      type: "tv",
      id: "lellotv-free",
      name: "📺 LelloTv",
      extra: [{ name: "genre", isRequired: false }],
    },
  ],
  behaviorHints: {
    configurable: true,
    configurationRequired: false,
  },
};

// ─── APP EXPRESS ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS per Stremio
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

// ─── PAGINA DI CONFIGURAZIONE ──────────────────────────────────────────────────
app.get("/configure", (req, res) => {
  // Leggi proxy già configurato se presente nell'URL
  const existingProxy = req.query.proxy ? decodeURIComponent(req.query.proxy) : "";

  res.send(`
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LelloTv - Configurazione</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background: #0d0d1a;
          color: #eee;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .card {
          background: #16213e;
          border-radius: 16px;
          padding: 40px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .logo { font-size: 48px; text-align: center; margin-bottom: 10px; }
        h1 { text-align: center; color: #e94560; font-size: 28px; margin-bottom: 6px; }
        .subtitle { text-align: center; color: #888; font-size: 14px; margin-bottom: 30px; }
        label {
          display: block;
          font-size: 13px;
          color: #aaa;
          margin-bottom: 6px;
          margin-top: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        input {
          width: 100%;
          padding: 12px 16px;
          background: #0f3460;
          border: 1px solid #1a4a7a;
          border-radius: 8px;
          color: #fff;
          font-size: 15px;
          outline: none;
          transition: border 0.2s;
        }
        input:focus { border-color: #e94560; }
        input::placeholder { color: #555; }
        .hint {
          font-size: 12px;
          color: #666;
          margin-top: 6px;
          line-height: 1.5;
        }
        .hint code {
          background: #0a2540;
          padding: 2px 6px;
          border-radius: 4px;
          color: #7ec8e3;
          font-size: 11px;
        }
        .divider {
          border: none;
          border-top: 1px solid #1e2d4a;
          margin: 28px 0;
        }
        .btn {
          display: block;
          width: 100%;
          padding: 14px;
          background: #e94560;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 17px;
          font-weight: bold;
          cursor: pointer;
          text-align: center;
          text-decoration: none;
          margin-top: 24px;
          transition: background 0.2s, transform 0.1s;
        }
        .btn:hover { background: #c73652; transform: translateY(-1px); }
        .btn-secondary {
          background: #1a3a6a;
          margin-top: 10px;
          font-size: 14px;
          font-weight: normal;
        }
        .btn-secondary:hover { background: #1e4a8a; }
        .badge {
          display: inline-block;
          background: #1a4a2a;
          color: #4caf50;
          border-radius: 20px;
          padding: 3px 10px;
          font-size: 12px;
          margin-left: 8px;
          vertical-align: middle;
        }
        .badge.off {
          background: #3a1a1a;
          color: #e94560;
        }
        #proxyStatus { margin-top: 16px; font-size: 13px; color: #888; text-align: center; min-height: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">📺</div>
        <h1>LelloTv</h1>
        <p class="subtitle">LelloTv - Tv in Diretta</p>

        <label>
          URL Proxy
          <span id="proxyBadge" class="badge off">Non a
