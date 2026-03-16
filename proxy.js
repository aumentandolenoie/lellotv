const axios = require("axios");

async function resolveStream(channel, clientIp, proxyUrl) {
  const streamUrl = channel.stream;
  const needsExtractor = channel.extractor === true;

  // Canale Vavoo CON EasyProxy
  if (needsExtractor && proxyUrl) {
    const base = proxyUrl.replace(/\/$/, "");

    // Costruisci direttamente l'URL per EasyProxy
    // usando /proxy/hls/manifest.m3u8 con ?d= e api_password
    var finalUrl =
      base +
      "/proxy/hls/manifest.m3u8?d=" +
      encodeURIComponent(streamUrl) +
      "&api_password=admin";

    console.log("Stream Vavoo via EasyProxy: " + finalUrl);
    return finalUrl;
  }

  // Canale Vavoo SENZA EasyProxy
  if (needsExtractor && !proxyUrl) {
    console.warn("Canale " + channel.name + " richiede EasyProxy ma nessun proxy configurato.");
    return streamUrl;
  }

  // Canale normale: segui i redirect
  try {
    const config = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "X-Forwarded-For": clientIp,
        "X-Real-IP": clientIp,
      },
      maxRedirects: 10,
      timeout: 10000,
    };
    const response = await axios.get(streamUrl, config);
    return response.request.res.responseUrl || streamUrl;
  } catch (err) {
    console.error("Errore risoluzione stream: " + err.message);
    return streamUrl;
  }
}

module.exports = { resolveStream };
