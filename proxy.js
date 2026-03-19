const axios = require("axios");

async function resolveStreamUrl(streamUrl, extractor, name, clientIp, proxyUrl) {
    if (!proxyUrl || !streamUrl) return streamUrl;
    const base = proxyUrl.replace(/\/$/, "");
    const API_PWD = "admin"; 

    // Se è DaddyLive o simili, mandalo alla proxy Python sul tuo PC
    const isDaddy = streamUrl.includes("dlhd") || streamUrl.includes("daddylive") || 
                    streamUrl.includes("dlstreams") || streamUrl.includes("lovecdn") || 
                    streamUrl.includes("lovetier") || streamUrl.includes("ksohls");

    if (isDaddy) {
        return `${base}/extractor/video?url=${encodeURIComponent(streamUrl)}&api_password=${API_PWD}&redirect_stream=true`;
    }

    // Default per gli altri
    return `${base}/extractor/video?url=${encodeURIComponent(streamUrl)}&api_password=${API_PWD}&redirect_stream=true`;
}

async function resolveStream(channel, clientIp, proxyUrl) {
    let results = [];

    // Se il canale ha già degli stream definiti
    if (channel.streams && Array.isArray(channel.streams)) {
        for (let s of channel.streams) {
            let resolved = await resolveStreamUrl(s.url, s.extractor || channel.extractor, s.name || channel.name, clientIp, proxyUrl);
            results.push({ url: resolved, name: s.name || "Stream" });
        }
    } 
    // Se ha uno stream singolo (Vavoo)
    else if (channel.stream) {
        let resolved = await resolveStreamUrl(channel.stream, channel.extractor, "Vavoo", clientIp, proxyUrl);
        results.push({ url: resolved, name: "Vavoo" });
    }

    // AGGIUNTA AUTOMATICA DADDY: Se conosciamo l'ID, creiamo il link anche se non c'è nel database
    const daddyId = channel.daddy_id || channel.id;
    if (daddyId && !results.some(r => r.name.toLowerCase().includes("daddy"))) {
        const daddyUrl = `https://daddylive.sx/stream/stream-${daddyId}.php`;
        let resolvedDaddy = await resolveStreamUrl(daddyUrl, "dlhd", "DaddyLive", clientIp, proxyUrl);
        results.push({ url: resolvedDaddy, name: "DaddyLive (HD)" });
    }

    return results;
}

module.exports = { resolveStream };
