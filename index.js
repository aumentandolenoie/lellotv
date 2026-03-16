const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
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

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

app.get("/configure", (req, res) => {
  const existingProxy = req.query.proxy ? decodeURIComponent(req.query.proxy) : "";
  res.send(`<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LelloTv - Configurazione</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#0d0d1a;color:#eee;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
.card{background:#16213e;border-radius:16px;padding:40px;max-width:480px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.4)}
.logo{font-size:48px;text-align:center;margin-bottom:10px}
h1{text-align:center;color:#e94560;font-size:28px;margin-bottom:6px}
.subtitle{text-align:center;color:#888;font-size:14px;margin-bottom:30px}
label{display:block;font-size:13px;color:#aaa;margin-bottom:6px;margin-top:20px;text-transform:uppercase;letter-spacing:.5px}
input{width:100%;padding:12px 16px;background:#0f3460;border:1px solid #1a4a7a;border-radius:8px;color:#fff;font-size:15px;outline:none;transition:border .2s}
input:focus{border-color:#e94560}
input::placeholder{color:#555}
.hint{font-size:12px;color:#666;margin-top:6px;line-height:1.5}
.hint code{background:#0a2540;padding:2px 6px;border-radius:4px;color:#7ec8e3;font-size:11px}
.divider{border:none;border-top:1px solid #1e2d4a;margin:28px 0}
.btn{display:block;width:100%;padding:14px;background:#e94560;color:white;border:none;border-radius:10px;font-size:17px;font-weight:bold;cursor:pointer;text-align:center;text-decoration:none;margin-top:12px;transition:background .2s}
.btn:hover{background:#c73652}
.btn-secondary{background:#1a3a6a;font-size:14px;font-weight:normal}
.btn-secondary:hover{background:#1e4a8a}
.badge{display:inline-block;background:#1a4a2a;color:#4caf50;border-radius:20px;padding:3px 10px;font-size:12px;margin-left:8px;vertical-align:middle}
.badge.off{background:#3a1a1a;color:#e94560}
#proxyStatus{margin-top:16px;font-size:13px;color:#888;text-align:center;min-height:20px}
</style>
</head>
<body>
<div class="card">
<div class="logo">📺</div>
<h1>LelloTv</h1>
<p class="subtitle">LelloTv - Tv in Diretta</p>
<label>URL Proxy <span id="proxyBadge" class="badge off">Non attivo</span></label>
<input type="text" id="proxyInput" placeholder="http://utente:password@host:porta" value="${existingProxy}" oninput="updateStatus()"/>
<p class="hint">Facoltativo. Formato: <code>http://host:porta</code> oppure <code>http://utente:password@host:porta</code></p>
<div id="proxyStatus"></div>
<hr class="divider">
<button class="btn" onclick="install()">🚀 Installa su Stremio</button>
<button class="btn btn-secondary" onclick="copyManifest()">📋 Copia URL Manifest</button>
</div>
<script>
function getProxy(){return document.getElementById('proxyInput').value.trim()}
function updateStatus(){
  var proxy=getProxy();
  var badge=document.getElementById('proxyBadge');
  var status=document.getElementById('proxyStatus');
  if(!proxy){badge.textContent='Non attivo';badge.className='badge off';status.textContent='Nessun proxy — connessione diretta.';return}
  try{var u=new URL(proxy);badge.textContent='Attivo';badge.className='badge';status.textContent='Proxy: '+u.host}
  catch(e){badge.textContent='Formato non valido';badge.className='badge off';status.textContent='Inserisci un URL valido (es: http://host:8080)'}
}
function buildManifestUrl(){
  var proxy=getProxy();
  var base=window.location.origin;
  return proxy ? base+'/'+encodeURIComponent(proxy)+'/manifest.json' : base+'/manifest.json';
}
function install(){
  var proxy=getProxy();
  if(proxy){try{new URL(proxy)}catch(e){alert('URL proxy non valido');return}}
  var manifestUrl=buildManifestUrl();
  window.location.href='stremio://'+manifestUrl.replace(/^https?:\/\//,'');
}
function copyManifest(){
  var url=buildManifestUrl();
  navigator.clipboard.writeText(url).then(function(){
    var btn=document.querySelector('.btn-secondary');
    btn.textContent='Copiato!';
    setTimeout(function(){btn.textContent='Copia URL Manifest'},2000);
  });
}
updateStatus();
</script>
</body>
</html>`);
});

app.get("/", (req, res) => {
  res.redirect("/configure");
});

function buildAddonRouter(proxyUrl) {
  const addonInstance = new addonBuilder({ ...manifest });

  addonInstance.defineCatalogHandler(function({ type, id, extra }) {
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
  });

  addonInstance.defineMetaHandler(function({ type, id }) {
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
  });

  addonInstance.defineStreamHandler(async function({ type, id }, req) {
    if (type !== "tv" || id.indexOf("lellotv:") !== 0) {
      return Promise.resolve({ streams: [] });
    }
    var channelId = id.replace("lellotv:", "");
    var ch = channels.find(function(c) { return c.id === channelId; });
    if (!ch) return Promise.resolve({ streams: [] });

    var clientIp = "127.0.0.1";
    if (req && req.headers && req.headers["x-forwarded-for"]) {
      clientIp = req.headers["x-forwarded-for"];
    } else if (req && req.socket && req.socket.remoteAddress) {
      clientIp = req.socket.remoteAddress;
    }

    console.log("Stream: " + ch.name + " | IP: " + clientIp + " | Proxy: " + (proxyUrl || "nessuno"));

    var resolvedUrl = await resolveStream(ch.stream, clientIp, proxyUrl);

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
  });

  return addonInstance.getInterface();
}

serveHTTP(buildAddonRouter(null), { app: app, port: PORT, path: "/" });

app.use("/:proxyEncoded", function(req, res, next) {
  var raw = req.params.proxyEncoded;
  var skip = ["manifest.json", "configure", "catalog", "meta", "stream", "addon"];
  if (skip.indexOf(raw) !== -1) return next();

  var proxyUrl;
  try {
    proxyUrl = decodeURIComponent(raw);
    new URL(proxyUrl);
  } catch (e) {
    return next();
  }

  var subApp = express();
  subApp.use(function(r, s, n) { s.setHeader("Access-Control-Allow-Origin", "*"); n(); });
  serveHTTP(buildAddonRouter(proxyUrl), { app: subApp, port: PORT, path: "/" });
  subApp(req, res, next);
});

console.log("LelloTv avviato su http://localhost:" + PORT);
console.log("Configurazione: http://localhost:" + PORT + "/configure");
