const axios = require("axios");

/**
 * Se il canale ha extractor: true e c'è una proxyUrl (EasyProxy),
 * usa l'endpoint /extractor/video di EasyProxy per risolvere il link Vavoo
 * e poi passa lo stream risolto attraverso /proxy/manifest.m3u8.
 *
 * Se non c'è proxyUrl ma il canale ha extractor: true,
 * restituisce l'URL originale sperando che il player lo gestisca.
 *
 * Per i canali normali (extractor: false) segue i redirect come prima.
 */
async function resolveStream(channel, clientIp, proxyUrl) {
  const streamUrl = channel.stream;
  const needsExtractor = channel.extractor === true;

  // Canale Vavoo (o simile) CON EasyProxy disponibile
  if (needsExtractor && proxyUrl) {
    try {
      const extractorUrl =
        proxyUrl.replace(/\/$/, "") +
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
      console.log("Risposta extractor:", JSON.stringify(data).substring(0, 300));

      // EasyProxy restituisce destination_url con lo stream risolto
      if (data && data.destination_url) {
        // Passa lo stream risolto attraverso il proxy HLS di EasyProxy
        const proxiedUrl =
          proxyUrl.replace(/\/$/, "") +
          "/proxy/manifest.m3u8?url=" +
          encodeURIComponent(data.destination_url);

        // Aggiungi eventuali header richiesti
        if (data.request_headers) {
          Object.entries(data.request_headers).forEach(function([key, value]) {
            if (value) {
              proxiedUrl_final =
                proxiedUrl + "&h_" + key.toLowerCase() + "=" + encodeURIComponent(value);
            }
          });
        }

        console.log("Stream risolto via EasyProxy: " + proxiedUrl);
        return proxiedUrl;
      }

      // Fallback: usa destination_url direttamente se presente
      if (data && data.url) {
        return data.url;
      }

      console.warn("Extractor non ha restituito destination_url, uso URL originale");
      return streamUrl;

    } catch (err) {
      console.error("Errore extractor EasyProxy: " + err.message);
      return streamUrl;
    }
  }

  // Canale Vavoo SENZA EasyProxy: passa direttamente (potrebbe non funzionare)
  if (needsExtractor && !proxyUrl) {
    console.warn("Canale " + channel.name + " richiede EasyProxy ma nessun proxy configurato.");
    return streamUrl;
  }

  // Canale normale: segui i redirect per ottenere l'URL finale
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
