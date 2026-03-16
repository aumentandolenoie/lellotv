const axios = require("axios");

async function resolveStream(channel, clientIp, proxyUrl) {
  const streamUrl = channel.stream;
  const needsExtractor = channel.extractor === true;

  // Canale Vavoo CON EasyProxy
  if (needsExtractor && proxyUrl) {
    try {
      const base = proxyUrl.replace(/\/$/, "");
      const extractorUrl =
        base +
        "/extractor/video?url=" +
        encodeURIComponent(streamUrl) +
        "&redirect_stream=false";

      console.log("Estrazione con EasyProxy: " + extractorUrl);

      const response = await axios.get(extractorUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "X-Forwarded-For": clientIp,
          "X-Real-IP": clientIp,
        },
        timeout: 15000,
      });

      const data = response.data;
      console.log("Risposta extractor: " + JSON.stringify(data).substring(0, 300));

      if (!data || !data.destination_url) {
        console.warn("Nessun destination_url, uso URL originale");
        return streamUrl;
      }

      const destUrl = data.destination_url;
      const reqHeaders = data.request_headers || {};

      // Usa /proxy/hls/manifest.m3u8 con parametro ?d= come indicato da /api/info
      var finalUrl = base + "/proxy/hls/manifest.m3u8?d=" + encodeURIComponent(destUrl);

      // Aggiungi gli header richiesti come h_<nome>=<valore>
      Object.keys(reqHeaders).forEach(function(key) {
        var value = reqHeaders[key];
        if (value) {
          finalUrl += "&h_" + key.toLowerCase() + "=" + encodeURIComponent(value);
        }
      });

      console.log("Stream finale: " + finalUrl);
      return finalUrl;

    } catch (err) {
      console.error("Errore extractor EasyProxy: " + err.message);
      return streamUrl;
    }
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
