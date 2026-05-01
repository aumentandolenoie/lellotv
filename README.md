# 📺 LelloTV – Stremio Addon

Addon Stremio/Nuvio per canali live da **Vavoo** e **DLStreams (DaddyLive)**, con supporto a **EasyProxy** per la risoluzione degli stream.

## ✨ Funzionalità

- 🎯 **Vavoo** – migliaia di canali live da tutto il mondo (gratuito, nessuna chiave)
- ⚡ **DLStreams** – sport live e canali internazionali (richiede API key da dlstreams.com)
- 🔐 **EasyProxy** – tutti gli stream vengono risolti tramite la tua istanza EasyProxy personale
- ⚙️ **Pagina di configurazione** – interfaccia web per inserire proxy e chiavi API
- 🪶 **Leggero** – ottimizzato per Render free tier, cache in memoria, nessun database

## 🚀 Deploy su Render

1. **Fork** questo repository sul tuo GitHub
2. Vai su [render.com](https://render.com) → **New Web Service**
3. Collega il repository
4. Impostazioni:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
   - **Plan:** Free
5. Clicca **Deploy**
6. Una volta online, apri `https://tuo-servizio.onrender.com` per configurare l'addon

## ⚙️ Configurazione

Apri la pagina web dell'addon e inserisci:

| Campo | Descrizione |
|---|---|
| **Indirizzo EasyProxy** | URL della tua istanza EasyProxy (es. `https://mia-proxy.onrender.com`) |
| **Password EasyProxy** | Password impostata nella tua EasyProxy (`API_PASSWORD`) |
| **DLStreams API Key** | Chiave API ricevuta da dlstreams.com (solo se vuoi DLStreams) |

Poi clicca **"Genera link di installazione"** e installa direttamente su Stremio o copia l'URL per Nuvio.

## 🔗 Come funziona

```
Stremio/Nuvio → LelloTV → EasyProxy → Vavoo/DLStreams → Stream HLS
```

- **Vavoo:** LelloTV recupera il catalogo canali e instrada ogni stream attraverso l'endpoint `/proxy/manifest.m3u8` di EasyProxy con gli header `User-Agent: VAVOO/2.6` necessari
- **DLStreams:** LelloTV usa l'API ufficiale per il catalogo, poi usa l'endpoint `/extractor/video` di EasyProxy per estrarre il vero URL HLS dalla pagina player

## 📁 Struttura

```
lellotv/
├── index.js          # Server principale + handler Stremio
├── public/
│   └── configure.html  # Pagina di configurazione
├── package.json
└── README.md
```

## 🛠️ Sviluppo locale

```bash
git clone https://github.com/TUO_USERNAME/lellotv
cd lellotv
npm install
npm start
# Apri http://localhost:7860
```

## 📄 Licenza

MIT – Nessun dato viene raccolto o trasmesso.
