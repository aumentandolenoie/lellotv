const { addonBuilder } = require("stremio-addon-sdk");
const express = require("express");
const channels = require("./channels");
const { resolveStream } = require("./proxy");

const PORT = process.env.PORT || 3000;

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
      name: "LelloTv",
      extra: [{ name: "genre", isRequired: false }],
    },
  ],
  behaviorHints: {
    configurable: true,
    configurationRequired: false,
  },
};

function handleCatalog(type, id, extra) {
  if (type !== "tv" || id !== "lellotv-free") {
    return Promise.resolve({ metas: [] });
  }
  var list = channels;
  if (extra && extra.genre) {
    list = channels.filter(function(ch) { return ch.genre === extra.genre; });
  }
  var metas = list.map(function(ch) {
    return {
      id: "lellotv:" + ch.id,
      type: "tv",
      name: ch.name,
      poster: ch.logo,
      logo: ch.logo,
      description: ch.name + " | " + ch.genre,
      genres: [ch.genre],
    };
  });
  return Promise.resolve({ metas: metas });
}

function handleMeta(type, id) {
  if (type !== "tv" || id.indexOf("lellotv:") !== 0) {
    return Promise.resolve({ meta: null });
  }
  var channelId = id.replace("lellotv:", "");
  var ch = channels.find(function(c) { return c.id === channelId; });
  if (!ch) return Promise.resolve({ meta: null });
  return Promise.resolve({
    meta: {
      id: "lellotv:" + ch.id,
      type: "tv",
      name: ch.name,
      poster: ch.logo,
      logo: ch.logo,
      description: ch.name + " - Canale free italiano",
      genres: [ch.genre],
    },
  });
}

async function handleStream(type, id, clientIp, proxyUrl) {
  if (type !== "tv" || id.indexOf("lellotv:") !== 0) {
    return Promise.resolve({ streams: [] });
  }
  var channelId = id.replace("lellotv:", "");
  var ch = channels.find(function(c) { return c.id === channelId; });
  if (!ch) return Promise.resolve({ streams: [] });

  console.log("Stream: " + ch.name + " | IP: " + clientIp + " | Proxy: " + (proxyUrl || "nessuno"));

  var resolvedUrl = await resolveStream(ch, clientIp, proxyUrl);

  return Promise.resolve({
    streams: [
      {
        name: "LelloTv",
        title: "📺 " + ch.name + "\n" + (proxyUrl ? "🌐 Via Proxy" : "🔗 Diretto"),
        url: resolvedUrl,
        behaviorHints: { notWebReady: false },
      },
    ],
  });
}

function buildRouter(proxyUrl) {
  var router = express.Router();

  router.get("/manifest.json", function(req, res) {
    res.setHeader("Content-Type", "application/json");
    res.json(manifest);
  });

  router.get("/catalog/:type/:id.json", function(req, res) {
    var type = req.params.type;
    var id = req.params.id;
    var extra = req.query || {};
    handleCatalog(type, id, extra)
      .then(function(resp) {
        res.setHeader("Content-Type", "application/json");
        res.json(resp);
      })
      .catch(function(err) {
        console.error("Catalog error:", err);
        res.status(500).json({ error: err.message });
      });
  });

  router.get("/catalog/:type/:id/:extra.json", function(req, res) {
    var type = req.params.type;
    var id = req.params.id;
    var extraStr = req.params.extra;
    var extra = {};
    if (extraStr) {
      extraStr.split("&").forEach(function(part) {
        var kv = part.split("=");
        if (kv.length === 2) extra[kv[0]] = decodeURIComponent(kv[1]);
      });
    }
    handleCatalog(type, id, extra)
      .then(function(resp) {
        res.setHeader("Content-Type", "application/json");
        res.json(resp);
      })
      .catch(function(err) {
        console.error("Catalog error:", err);
        res.status(500).json({ error: err.message });
      });
  });

  router.get("/meta/:type/:id.json", function(req, res) {
    var type = req.params.type;
    var id = req.params.id;
    handleMeta(type, id)
      .then(function(resp) {
        res.setHeader("Content-Type", "application/json");
        res.json(resp);
      })
      .catch(function(err) {
        console.error("Meta error:", err);
        res.status(500).json({ error: err.message });
      });
  });

  router.get("/stream/:type/:id.json", function(req, res) {
    var type = req.params.type;
    var id = req.params.id;
    var clientIp = "127.0.0.1";
    if (req.headers["x-forwarded-for"]) {
      clientIp = req.headers["x-forwarded-for"].split(",")[0].trim();
    } else if (req.socket && req.socket.remoteAddress) {
      clientIp = req.socket.remoteAddress;
    }
    handleStream(type, id, clientIp, proxyUrl)
      .then(function(resp) {
        res.setHeader("Content-Type", "application/json");
        res.json(resp);
      })
      .catch(function(err) {
        console.error("Stream error:", err);
        res.status(500).json({ error: err.message });
      });
  });

  return router;
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(function(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

app.get("/configure", function(req, res) {
  res.send(`<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LelloTv - Configurazione</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#0d0d1a;color:#eee;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
.card{background:#16213e;border-radius:16px;padding:40px;max-width:500px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.4)}
.logo{font-size:48px;text-align:center;margin-bottom:10px}
h1{text-align:center;color:#e94560;font-size:28px;margin-bottom:6px}
.subtitle{text-align:center;color:#888;font-size:14px;margin-bottom:30px}
label{display:block;font-size:13px;color:#aaa;margin-bottom:8px;margin-top:20px;text-transform:uppercase;letter-spacing:.5px}
input{width:100%;padding:12px 16px;background:#0f3460;border:2px solid #1a4a7a;border-radius:8px;color:#fff;font-size:14px;outline:none}
input:focus{border-color:#e94560}
input::placeholder{color:#444}
.hint{font-size:12px;color:#555;margin-top:8px;line-height:1.6}
.hint code{background:#0a2540;padding:2px 6px;border-radius:4px;color:#7ec8e3}
.status{margin-top:12px;padding:10px 14px;border-radius:8px;font-size:13px;text-align:center;min-height:40px;display:flex;align-items:center;justify-content:center;gap:8px}
.status.empty{background:#111;color:#555}
.status.ok{background:#0d2e0d;color:#4caf50;border:1px solid #1a4a1a}
.status.err{background:#2e0d0d;color:#e94560;border:1px solid #4a1a1a}
.divider{border:none;border-top:1px solid #1e2d4a;margin:28px 0}
.btn{display:block;width:100%;padding:14px;border:none;border-radius:10px;font-size:16px;font-weight:bold;cursor:pointer;margin-top:12px;transition:opacity .2s}
.btn:hover{opacity:.85}
.btn-primary{background:#e94560;color:white}
.btn-copy{background:#1a3a6a;color:white;font-size:14px;font-weight:normal}
.manifest-box{margin-top:16px;background:#0a1628;border:1px solid #1a3a6a;border-radius:8px;padding:12px;word-break:break-all;font-size:12px;color:#7ec8e3;font-family:monospace;min-height:36px}
</style>
</head>
<body>
<div class="card">
  <div class="logo">📺</div>
  <h1>LelloTv</h1>
  <p class="subtitle">LelloTv - Tv in Diretta</p>
  <label>URL EasyProxy (facoltativo)</label>
  <input type="text" id="proxyInput" placeholder="https://protettore.onrender.com" oninput="onProxyChange()" />
  <p class="hint">
    Inserisci l'URL della tua istanza EasyProxy per abilitare i canali Vavoo.<br>
    Esempio: <code>https://protettore.onrender.com</code>
  </p>
  <div class="status empty" id="statusBox">Nessun proxy inserito — solo canali diretti disponibili.</div>
  <hr class="divider">
  <div style="font-size:13px;color:#aaa;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">URL Manifest generato</div>
  <div class="manifest-box" id="manifestBox"></div>
  <button class="btn btn-copy" onclick="copyManifest()">📋 Copia URL Manifest</button>
  <button class="btn btn-primary" onclick="installAddon()">🚀 Installa su Stremio</button>
</div>
<script>
var currentProxy = '';
function onProxyChange() {
  currentProxy = document.getElementById('proxyInput').value.trim();
  var statusBox = document.getElementById('statusBox');
  if (!currentProxy) {
    statusBox.className = 'status empty';
    statusBox.textContent = 'Nessun proxy inserito — solo canali diretti disponibili.';
  } else {
    var valid = false;
    try { var u = new URL(currentProxy); valid = (u.protocol === 'http:' || u.protocol === 'https:'); } catch(e) {}
    if (valid) {
      statusBox.className = 'status ok';
      statusBox.innerHTML = '✅ EasyProxy: <strong>' + new URL(currentProxy).host + '</strong> — canali Vavoo abilitati';
    } else {
      statusBox.className = 'status err';
      statusBox.textContent = '⚠️ URL non valido. Esempio: https://protettore.onrender.com';
    }
  }
  updateManifestBox();
}
function getManifestUrl() {
  var base = window.location.origin;
  if (currentProxy) return base + '/' + encodeURIComponent(currentProxy) + '/manifest.json';
  return base + '/manifest.json';
}
function updateManifestBox() {
  document.getElementById('manifestBox').textContent = getManifestUrl();
}
function copyManifest() {
  var url = getManifestUrl();
  var btn = document.querySelector('.btn-copy');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function() {
      btn.textContent = '✅ Copiato!';
      setTimeout(function(){ btn.textContent = '📋 Copia URL Manifest'; }, 2000);
    }).catch(function() { fallbackCopy(url); });
  } else { fallbackCopy(url); }
}
function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try {
    document.execCommand('copy');
    var btn = document.querySelector('.btn-copy');
    btn.textContent = '✅ Copiato!';
    setTimeout(function(){ btn.textContent = '📋 Copia URL Manifest'; }, 2000);
  } catch(e) { alert('Copia manuale:\\n' + text); }
  document.body.removeChild(ta);
}
function installAddon() {
  var manifestUrl = getManifestUrl();
  window.location.href = 'stremio://' + manifestUrl.replace(/^https?:\\/\\//, '');
}
updateManifestBox();
</script>
</body>
</html>`);
});

app.get("/", function(req, res) {
  res.redirect("/configure");
});

app.get("/manifest.json", function(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.json(manifest);
});

app.use("/", buildRouter(null));

app.use("/:proxyEncoded", function(req, res, next) {
  var raw = req.params.proxyEncoded;
  var skip = ["manifest.json", "configure", "catalog", "meta", "stream", "addon", "favicon.ico"];
  if (skip.indexOf(raw) !== -1) return next();
  var proxyUrl;
  try {
    proxyUrl = decodeURIComponent(raw);
    new URL(proxyUrl);
  } catch(e) {
    return next();
  }
  buildRouter(proxyUrl)(req, res, next);
});

app.listen(PORT, function() {
  console.log("LelloTv avviato su http://localhost:" + PORT);
  console.log("Configurazione: http://localhost:" + PORT + "/configure");
  console.log("Manifest: http://localhost:" + PORT + "/manifest.json");
});
