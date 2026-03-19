const axios = require("axios");

/**
 * Risolve l'URL finale passando attraverso il proxy HLS
 */
async function resolveStreamUrl(streamUrl, extractor, name, clientIp, proxyUrl) {
    if (!proxyUrl || !streamUrl) return streamUrl;

    const base = proxyUrl.replace(/\/$/, "");
    const API_PWD = "admin"; // Deve coincidere con quella nel servizio .service

    // Verifica se è un link DaddyLive o simili
    const isDaddy = streamUrl.includes("dlhd") || 
                    streamUrl.includes("daddylive") || 
                    streamUrl.includes("dlstreams") || 
                    streamUrl.includes("lovecdn") || 
                    streamUrl.includes("lovetier") ||
                    streamUrl.includes("ksohls");

    if (isDaddy) {
        // Per DaddyLive, mandiamo l'URL all'estrattore Python
        // Sarà il file dlhd.py a gestire referer e cookie correttamente
        return `${base}/extractor/video?url=${encodeURIComponent(streamUrl)}&api_password=${API_PWD}&redirect_stream=true`;
    }

    // Default per Vavoo e altri (es. m3u8 diretti)
    return `${base}/extractor/video?url=${encodeURIComponent(streamUrl)}&api_password=${API_PWD}&redirect_stream=true`;
}

/**
 * Funzione principale chiamata da Stremio per ottenere i link
 */
async function resolveStream(channel, clientIp, proxyUrl) {
    var results = [];

    // 1. Se il canale ha già una lista di streams (es. da un JSON esterno)
    if (channel.streams && Array.isArray(channel.streams)) {
        for (var i = 0; i < channel.streams.length; i++) {
            var s = channel.streams[i];
            var resolved = await resolveStreamUrl(s.url, s.extractor || channel.extractor, s.name || s.title || channel.name, clientIp, proxyUrl);
            results.push({ 
                url: resolved, 
                name: s.name || s.title || `Stream ${i+1}` 
            });
        }
    } 
    // 2. Se ha un singolo stream principale (solitamente Vavoo)
    else if (channel.stream) {
        var resolvedVavoo = await resolveStreamUrl(channel.stream, channel.extractor, "Vavoo", clientIp, proxyUrl);
        results.push({ 
            url: resolvedVavoo, 
            name: "Vavoo (HLS)" 
        });
    }

    // 3. LOGICA AGGIUNTIVA: Se è un canale Sky/DAZN e non ha DaddyLive tra i risultati, 
    // proviamo a generarlo forzatamente se abbiamo un ID
    const daddyId = channel.daddy_id || channel.id;
    if (daddyId && !results.some(r => r.name.includes("Daddy"))) {
        // Generiamo il link DaddyLive basandoci sull'ID del canale
        const daddyUrl = `https://daddylive.sx/stream/stream-${daddyId}.php`;
        var resolvedDaddy = await resolveStreamUrl(daddyUrl, "dlhd", "DaddyLive", clientIp, proxyUrl);
        results.push({ 
            url: resolvedDaddy, 
            name: "DaddyLive (HD)" 
        });
    }

    return results;
}

module.exports = { resolveStream };
