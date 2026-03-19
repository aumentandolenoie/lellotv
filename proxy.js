const axios = require("axios");

/**
 * Risolve l'URL dello stream utilizzando il server proxy (Protettore-OK).
 * @param {string} streamUrl - L'URL originale della sorgente (es. daddylive).
 * @param {boolean} extractor - Se l'estrazione è richiesta.
 * @param {string} name - Nome del canale.
 * @param {string} clientIp - IP del client.
 * @param {string} proxyUrl - URL base del tuo server proxy (es. http://tuo-ip:8080).
 */
async function resolveStreamUrl(streamUrl, extractor, name, clientIp, proxyUrl) {
  if (!proxyUrl) return streamUrl;

  // Pulizia URL base del proxy
  const base = proxyUrl.replace(/\/$/, "");
  
  // Rilevamento DaddyLive/DLHD
  const isDaddyLive = streamUrl.includes("daddylive") || 
                      streamUrl.includes("dlhd") || 
                      streamUrl.includes("dagro") || 
                      streamUrl.includes("aliez");

  if (isDaddyLive) {
    /**
     * LOGICA PER DADDYLIVE (TUNNELING)
     * Usiamo l'endpoint /extractor/video del tuo server.
     * redirect_stream=true forza il server a fare da proxy per il manifest e i segmenti .ts
     */
    const finalUrl = base + "/extractor/video" +
                     "?url=" + encodeURIComponent(streamUrl) +
                     "&redirect_stream=true" +
                     "&api_password=admin"; // Assicurati che la password coincida con config.py

    console.log("🛡️ [PROXY] DaddyLive incapsulato via extractor: " + name);
    return finalUrl;
  }

  // LOGICA PER ALTRE SORGENTI (Es. Vavoo)
  if (extractor) {
    const finalUrl = base + "/extractor/video" +
                     "?url=" + encodeURIComponent(streamUrl) +
                     "&api_password=admin" +
                     "&redirect_stream=true";
    return finalUrl;
  }

  // Ritorno URL originale se non serve proxy
  return streamUrl;
}

/**
 * Gestisce la risoluzione di uno o più stream per un canale.
 */
async function resolveStream(channel, clientIp, proxyUrl) {
  if (channel.streams && Array.isArray(channel.streams)) {
    var results = [];
    for (var i = 0; i < channel.streams.length; i++) {
      var s = channel.streams[i];
      var resolved = await resolveStreamUrl(
        s.url, 
        s.extractor || channel.extractor, 
        s.name || channel.name, 
        clientIp, 
        proxyUrl
      );
      results.push({ 
        url: resolved, 
        name: s.name || channel.name 
      });
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
  
  return [{ 
    url: resolved, 
    name: channel.name 
  }];
}

module.exports = { resolveStream };
