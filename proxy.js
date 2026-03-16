const axios = require("axios");

/**
 * Risolve l'URL finale di uno stream HLS seguendo i redirect.
 * Se è configurato un proxy, le richieste vengono instradate attraverso di esso.
 */
async function resolveStream(streamUrl, clientIp, proxyUrl = null) {
  try {
    const config = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "X-Forwarded-For": clientIp,
        "X-Real-IP": clientIp,
      },
      maxRedirects: 10,
      timeout: 10000,
    };

    // Se è configurato un proxy HTTP/HTTPS
    if (proxyUrl) {
      const url = new URL(proxyUrl);
      config.proxy = {
        host: url.hostname,
        port: parseInt(url.port) || 80,
        protocol: url.protocol.replace(":", ""),
      };
      // Se il proxy richiede autenticazione (formato: http://user:pass@host:port)
      if (url.username && url.password) {
        config.proxy.auth = {
          username: url.username,
          password: url.password,
        };
      }
    }

    // Segui i redirect per ottenere l'URL finale
    const response = await axios.get(streamUrl, config);
    return response.request.res.responseUrl || streamUrl;
  } catch (err) {
    console.error(`Errore nella risoluzione dello stream: ${err.message}`);
    // In caso di errore restituisce l'URL originale
    return streamUrl;
  }
}

module.exports = { resolveStream };
