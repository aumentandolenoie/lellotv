const axios = require("axios");

async function resolveStreamUrl(streamUrl, extractor, name, clientIp, proxyUrl) {
  if (!proxyUrl) {
    console.warn("⚠️ Proxy non configurato per " + name);
    return streamUrl;
  }

  const base = proxyUrl.replace(/\/$/, "");
  
  // Rileviamo se il canale è DaddyLive
  const isDaddyLive = streamUrl.includes("daddylive") || streamUrl.includes("dlhd") || streamUrl.includes("dagrotv");

  if (isDaddyLive) {
    // IMPORTANTE: Per DaddyLive usiamo l'endpoint /extractor/video 
    // ma aggiungiamo i parametri che forzano il proxy a fare da "ponte" (tunnel)
    // Usiamo redirect_stream=true perché il tuo dlhd.py è fatto per questo.
    
    var finalUrl = base + "/extractor/video?url=" + encodeURIComponent(streamUrl) + 
                   "&api_password=admin" + 
                   "&redirect_stream=true" + 
                   "&include_headers=true"; // Forza il proxy a mantenere i token trovati

    console.log("🚀 [DaddyLive] Reindirizzamento verso estrattore Python: " + finalUrl);
    return finalUrl;
  }

  if (extractor) {
    // Logica per Vavoo o altri canali con estrattore generico
    var finalUrl = base + "/extractor/video?url=" + encodeURIComponent(streamUrl) + 
                   "&api_password=admin" + 
                   "&redirect_stream=true";

    console.log("📺 [Extractor] Stream per " + name + ": " + finalUrl);
    return finalUrl;
  }

  // Canale normale (fallback)
  try {
    const response = await axios.get(streamUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "X-Forwarded-For": clientIp,
      },
      maxRedirects: 10,
      timeout: 10000,
    });
    return response.request.res.responseUrl || streamUrl;
  } catch (err) {
    console.error("❌ Errore risoluzione " + name + ": " + err.message);
    return streamUrl;
  }
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

  var resolved = await resolveStreamUrl(
    channel.stream,
    channel.extractor === true,
    channel.name,
    clientIp,
    proxyUrl
  );
  return [{ url: resolved, name: channel.name }];
}

module.exports = { resolveStream };
