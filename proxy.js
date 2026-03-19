const axios = require("axios");

async function resolveStreamUrl(streamUrl, extractor, name, clientIp, proxyUrl) {
  if (!proxyUrl) return streamUrl;

  const base = proxyUrl.replace(/\/$/, "");
  
  // Rileviamo se è un link della famiglia DaddyLive
  const isDaddyLive = streamUrl.includes("daddylive") || 
                      streamUrl.includes("dlhd") || 
                      streamUrl.includes("dagro") ||
                      streamUrl.includes("aliez");

  // PASSWORD: Cambiala se diversa da "admin"
  const API_PWD = "admin"; 

  if (isDaddyLive) {
    // 🔍 DINAMISMO: Estraiamo il dominio esatto dall'URL (es: https://dlhd.sx)
    const urlObj = new URL(streamUrl);
    const origin = urlObj.origin; // Prende "https://dlhd.sx" o quello che serve
    const referer = streamUrl;    // Il referer esatto della pagina dello stream

    const params = new URLSearchParams({
      url: streamUrl,
      h_Referer: referer,
      h_Origin: origin,
      h_User_Agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      redirect_stream: "true",
      api_password: API_PWD
    });

    // Usiamo l'endpoint /extractor/video
    const finalUrl = `${base}/extractor/video?${params.toString()}`;

    console.log(`🛡️ [TUNNEL] ${name} -> Origin: ${origin}`);
    return finalUrl;
  }

  // Fallback per altri (Vavoo, etc)
  if (extractor) {
    return `${base}/extractor/video?url=${encodeURIComponent(streamUrl)}&api_password=${API_PWD}&redirect_stream=true`;
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
