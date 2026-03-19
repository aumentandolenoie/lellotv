async function resolveStreamUrl(streamUrl, extractor, name, clientIp, proxyUrl) {
    if (!proxyUrl) return streamUrl;
    const base = proxyUrl.replace(/\/$/, "");
    const API_PWD = "admin"; 

    // Forza il riconoscimento DaddyLive se l'URL contiene questi termini
    const isDaddy = streamUrl.includes("dlhd") || 
                    streamUrl.includes("daddylive") || 
                    streamUrl.includes("dlstreams") || 
                    streamUrl.includes("lovecdn") || 
                    streamUrl.includes("lovetier") ||
                    streamUrl.includes("ksohls");

    if (isDaddy) {
        // Se l'URL è già un manifest .m3u8, dobbiamo assicurarci di passare i referer al proxy HLS
        const targetReferer = "https://dlstreams.top/";
        
        const params = new URLSearchParams({
            url: streamUrl,
            h_Referer: targetReferer,
            h_Origin: "https://dlstreams.top",
            h_User_Agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            redirect_stream: "true",
            api_password: API_PWD
        });

        return `${base}/extractor/video?${params.toString()}`;
    }

    // Default per Vavoo e altri
    return `${base}/extractor/video?url=${encodeURIComponent(streamUrl)}&api_password=${API_PWD}&redirect_stream=true`;
}
