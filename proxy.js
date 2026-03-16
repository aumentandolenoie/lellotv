const axios = require("axios");

async function resolveStreamUrl(streamUrl, extractor, name, clientIp, proxyUrl) {
  if (extractor && proxyUrl) {
    const base = proxyUrl.replace(/\/$/, "");

    try {
      // Usa sempre /extractor/video che gestisce sia Vavoo che DaddyLive internamente
      const extractorUrl =
        base +
        "/extractor/video?url=" +
        encodeURIComponent(streamUrl) +
        "&api_password=admin";

      console.log("Chiamata extractor per " + name + ": " + extractorUrl);

      const response = await axios.get(extractorUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "X-Forwarded-For": clientIp,
          "X-Real-IP": clientIp,
        },
        timeout: 20000,
      });

      const data = response.data;
      console.log("Risposta extractor " + name + ": " + JSON.stringify(data).substring(0, 200));

      if (!data || !data.destination_url) {
        console.warn("Nessun destination_url per " + name + ", uso URL originale");
        return streamUrl;
      }

      const destUrl = data.destination_url;
      const reqHeaders = data.request_headers || {};
      const endpoint = data.mediaflow_endpoint || "hls_manifest_proxy";

      // Scegli endpoint corretto in base a quello suggerito da EasyProxy
      var proxyEndpoint;
      if (endpoint === "hls_manifest_proxy") {
        proxyEndpoint = base + "/proxy/hls/manifest.m3u8";
      } else if (endpoint === "proxy_stream_endpoint") {
        proxyEndpoint = base + "/proxy/hls/manifest.m3u8";
      } else {
        proxyEndpoint = base + "/proxy/hls/manifest.m3u8";
      }

      // Costruisci URL finale con ?d= (formato EasyProxy)
      var finalUrl = proxyEndpoint + "?d=" + encodeURIComponent(destUrl) + "&api_password=admin";

      // Aggiungi tutti gli header richiesti come h_<nome>=<valore>
      Object.keys(reqHeaders).forEach(function(key) {
        var value = reqHeaders[key];
        if (value) {
          finalUrl += "&h_" + key.toLowerCase() + "=" + encodeURIComponent(value);
        }
      });

      // Aggiungi secret_key se presente (necessario per DaddyLive nonce)
      if (data.secret_key) {
        finalUrl += "&secret_key=" + encodeURIComponent(data.secret_key);
      }

      console.log("Stream finale " + name + ": " + finalUrl.substring(0, 200));
      return finalUrl;

    } catch (err) {
      console.error("Errore extractor " + name + ": " + err.message);
      return streamUrl;
    }
  }

  // Senza proxy: stream diretto
  if (extractor && !proxyUrl) {
    console.warn("Stream " + name + " richiede EasyProxy ma nessun proxy configurato.");
    return streamUrl;
  }

  // Canale normale senza extractor
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

  // Canale con sorgente singola
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
