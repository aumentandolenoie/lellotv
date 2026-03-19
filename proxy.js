const axios = require("axios");

async function resolveStreamUrl(streamUrl, extractor, name, clientIp, proxyUrl) {
  if (!proxyUrl) return streamUrl;

  const base = proxyUrl.replace(/\/$/, "");
  const isDaddyLive = streamUrl.includes("daddylive") || streamUrl.includes("dlhd") || streamUrl.includes("dagro");

  if (isDaddyLive) {
    // 1. Definiamo i parametri di sicurezza che il TUO hls_proxy.py si aspetta
    // Usiamo il prefisso "h_" come richiesto dal tuo codice Python
    const referer = "https://daddylive.sx/";
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    
    // 2. Costruiamo l'URL per l'endpoint /extractor/video
    // Questo endpoint attiverà DLHDExtractor.py nel tuo server
    const finalUrl = base + "/extractor/video" +
                     "?url=" + encodeURIComponent(streamUrl) +
                     "&h_Referer=" + encodeURIComponent(referer) +
                     "&h_User-Agent=" + encodeURIComponent(ua) +
                     "&redirect_stream=true" + 
                     "&api_password=admin"; // <--- ASSICURATI CHE SIA "admin" NEL TUO CONFIG.PY

    console.log("🚀 [INVIO AL PROXY] Tentativo tunneling DaddyLive: " + name);
    return finalUrl;
  }

  // Fallback per altri flussi (Vavoo, ecc.)
  if (extractor) {
    return base + "/extractor/video?url=" + encodeURIComponent(streamUrl) + 
           "&api_password=admin&redirect_stream=true";
  }

  return streamUrl;
}

async function resolveStream(channel, clientIp, proxyUrl) {
  if (channel.streams && Array.isArray(channel.streams)) {
    var results = [];
    for (var i = 0; i < channel.streams.length; i++) {
      var s = channel.streams[i];
      var resolved = await resolveStreamUrl(s.url, s.extractor || channel.extractor, s.name || channel.name, clientIp, proxyUrl);
      results.push({ url: resolved, name: s.name || channel.name });
    }
    return results;
  }
  var resolved = await resolveStreamUrl(channel.stream, channel.extractor === true, channel.name, clientIp, proxyUrl);
  return [{ url: resolved, name: channel.name }];
}

module.exports = { resolveStream };
