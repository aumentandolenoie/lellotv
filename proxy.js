const axios = require("axios");

async function resolveStreamUrl(streamUrl, extractor, name, clientIp, proxyUrl) {
  if (!proxyUrl) return streamUrl;

  const base = proxyUrl.replace(/\/$/, "");
  const isDaddyLive = streamUrl.includes("daddylive") || streamUrl.includes("dlhd") || streamUrl.includes("dagro");

  if (isDaddyLive) {
    // 🛡️ STRATEGIA TUNNEL PER DADDYLIVE
    // Non usiamo l'extractor che reindirizza, ma usiamo il proxy come "ponte" permanente.
    // Questo endpoint forza il tuo protettore-ok a gestire il flusso m3u8 e i segmenti .ts
    
    const daddyReferer = "https://daddylive.sx/";
    
    // Costruiamo un URL che obbliga il proxy a restare nel mezzo (Tunneling)
    var finalUrl = base + "/proxy/hls/manifest.m3u8" +
                   "?url=" + encodeURIComponent(streamUrl) +
                   "&referer=" + encodeURIComponent(daddyReferer) +
                   "&api_password=admin";

    console.log("🛡️ [TUNNEL ATTIVO] DaddyLive via Proxy: " + name);
    return finalUrl;
  }

  if (extractor) {
    // Per Vavoo (che è meno severo) continuiamo con l'estrattore normale
    var finalUrl = base + "/extractor/video?url=" + encodeURIComponent(streamUrl) + 
                   "&api_password=admin" + 
                   "&redirect_stream=true";
    return finalUrl;
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
