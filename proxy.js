const axios = require("axios");

async function resolveStreamUrl(streamUrl, extractor, name, clientIp, proxyUrl) {
  if (extractor && proxyUrl) {
    const base = proxyUrl.replace(/\/$/, "");
    const finalUrl =
      base +
      "/proxy/hls/manifest.m3u8?d=" +
      encodeURIComponent(streamUrl) +
      "&api_password=admin";
    console.log("Stream " + name + " via EasyProxy: " + finalUrl);
    return finalUrl;
  }

  if (extractor && !proxyUrl) {
    console.warn("Stream " + name + " richiede EasyProxy ma nessun proxy configurato.");
    return streamUrl;
  }

  // Stream diretto: segui i redirect
  try {
    const response = await axios.get(streamUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "X-Forwarded-For": clientIp,
        "X-Real-IP": clientIp,
      },
      maxRedirects: 10,
      timeout: 10000,
    });
    return response.request.res.responseUrl || streamUrl;
  } catch (err) {
    console.error("Errore risoluzione stream " + name + ": " + err.message);
    return streamUrl;
  }
}

async function resolveStream(channel, clientIp, proxyUrl) {
  // Canale con sorgenti multiple
  if (channel.streams && Array.isArray(channel.streams)) {
    var results = [];
    for (var i = 0; i < channel.streams.length; i++) {
      var s = channel.streams[i];
      var resolved = await resolveStreamUrl(s.url, s.extractor, s.name, clientIp, proxyUrl);
      results.push({ url: resolved, name: s.name });
    }
    return results;
  }

  // Canale con sorgente singola (retrocompatibile)
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
