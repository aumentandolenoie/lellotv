const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const fetch = require("node-fetch");

// Configurazione - Modifica questi valori se necessario
const PROXY_URL = "http://192.168.1.192:20000"; // L'indirizzo del tuo server Python
const API_PWD = "admin";

const manifest = {
    id: "org.daddylive.vavoo.italy",
    version: "1.1.0",
    name: "DaddyLive & Vavoo Proxy",
    description: "Canali TV da DaddyLive e Vavoo tramite HLS Proxy",
    resources: ["stream", "catalog"],
    types: ["tv"],
    catalogs: [
        { type: "tv", id: "daddylive_italy", name: "DaddyLive Italy" }
    ]
};

const builder = new addonBuilder(manifest);

// Logica per caricare i canali (Catalogo)
builder.defineCatalogHandler(async (args) => {
    // Qui solitamente carichi la lista canali dal tuo server Python
    try {
        const resp = await fetch(`${PROXY_URL}/channels?api_password=${API_PWD}`);
        const channels = await resp.json();
        return { metas: channels };
    } catch (e) {
        return { metas: [] };
    }
});

// Logica per generare i link quando clicchi su un canale (Stream)
builder.defineStreamHandler(async (args) => {
    const [type, id] = args.id.split(":");
    try {
        // Chiede al server Python i link disponibili (Vavoo, Daddy, ecc)
        const resp = await fetch(`${PROXY_URL}/streams/${id}?api_password=${API_PWD}`);
        const data = await resp.json();
        
        const streams = await Promise.all(data.streams.map(async (s) => {
            return {
                name: s.name,
                title: s.title,
                url: await resolveStreamUrl(s.url, s.extractor, s.name, "", PROXY_URL)
            };
        }));

        return { streams };
    } catch (e) {
        return { streams: [] };
    }
});

/**
 * LA NOSTRA FUNZIONE MODIFICATA
 */
async function resolveStreamUrl(streamUrl, extractor, name, clientIp, proxyUrl) {
    if (!proxyUrl) return streamUrl;
    const base = proxyUrl.replace(/\/$/, "");
    const API_PWD = "admin"; 

    const isDaddy = streamUrl.includes("dlhd") || 
                    streamUrl.includes("daddylive") || 
                    streamUrl.includes("dlstreams") || 
                    streamUrl.includes("lovecdn") || 
                    streamUrl.includes("lovetier") ||
                    streamUrl.includes("ksohls");

    if (isDaddy) {
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

    return `${base}/extractor/video?url=${encodeURIComponent(streamUrl)}&api_password=${API_PWD}&redirect_stream=true`;
}

// Avvia il server dell'addon sulla porta 7000 (o quella che usi di solito)
serveHTTP(builder.getInterface(), { port: 7000 });
