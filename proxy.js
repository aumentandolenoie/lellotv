const axios = require("axios");

async function resolveStreamUrl(streamUrl, extractor, name, clientIp, proxyUrl) {
    if (!proxyUrl) return streamUrl;

    const base = proxyUrl.replace(/\/$/, "");
    const API_PWD = "admin"; 

    // 1. RILEVAMENTO SORGENTE
    const isDaddyLive = streamUrl.includes("daddylive") || 
                        streamUrl.includes("dlhd") || 
                        streamUrl.includes("dlstreams") || 
                        streamUrl.includes("dagro") ||
                        streamUrl.includes("lovecdn.ru"); // Aggiunto per sicurezza dal tuo log

    if (isDaddyLive) {
        const urlObj = new URL(streamUrl);
        // Usiamo l'Origin dinamico basato sull'URL (es. https://dlstreams.top)
        const origin = urlObj.origin; 

        const params = new URLSearchParams({
            url: streamUrl,
            h_Referer: streamUrl, // Il Referer DEVE essere l'URL della pagina stream
            h_Origin: origin,
            h_User_Agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            redirect_stream: "true",
            api_password: API_PWD
        });

        const finalUrl = `${base}/extractor/video?${params.toString()}`;
        console.log(`🛡️ [DADDY-FIX] Inviando Referer corretto per: ${name}`);
        return finalUrl;
    }

    // 2. LOGICA PER VAVOO O ALTRO
    // Se è Vavoo, lasciamo che il server usi i suoi header predefiniti (quelli che vedi nel log)
    if (extractor || streamUrl.includes("vavoo")) {
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
