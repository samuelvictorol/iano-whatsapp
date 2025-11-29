// whatsapp.js
const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const bus = new EventEmitter();

const CLIENT_ID = process.env.WWEBJS_CLIENT_ID || 'whatsapp-bot';

// diretórios padrão internos
const STORE_DIR = process.env.WWEBJS_STORE || path.join(__dirname, 'data', 'wwebjs');
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(__dirname, 'data', 'media');

// diretórios na RAIZ que você quer limpar no reset
// (no Docker vira algo como /app/data e /app/.wwebjs_cache)
const ROOT_DATA_DIR = path.join(__dirname, 'data');
const ROOT_CACHE_DIR = path.join(__dirname, '.wwebjs_cache');

function ensureDirs () {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
}
ensureDirs();

let clientPromise = null;
let client = null;

function getClient () {
  if (clientPromise) return clientPromise;

  clientPromise = new Promise((resolve, reject) => {
    bus.emit('log', '[WAPP] Inicializando cliente...');

    client = new Client({
      authStrategy: new LocalAuth({ clientId: CLIENT_ID, dataPath: STORE_DIR }),
      puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    client.on('loading_screen', (percent, message) => {
      bus.emit('log', `[WAPP] loading_screen ${percent}% - ${message || ''}`);
    });

    client.on('qr', async (qr) => {
      bus.emit('log', '[WAPP] QR gerado — abra o painel para escanear.');
      try {
        const pngPath = path.join(STORE_DIR, 'last-qr.png');
        await QRCode.toFile(pngPath, qr);
        const dataUrl = await QRCode.toDataURL(qr);
        bus.emit('qr', { dataUrl, file: pngPath });
      } catch (e) {
        bus.emit('log', `[WAPP] QR error: ${e?.message || e}`);
      }
    });

    client.on('authenticated', () => bus.emit('log', '[WAPP] authenticated'));
    client.on('auth_failure', (m) => bus.emit('log', `[WAPP] auth_failure: ${m}`));
    client.on('ready', () => {
      bus.emit('log', '[WAPP] Ready — conectado.');
      resolve(client);
    });
    client.on('disconnected', (reason) => {
      bus.emit('log', `[WAPP] disconnected: ${reason}`);
    });

    async function toRec (msg) {
      const hasMedia = msg.hasMedia;
      let mediaInfo = null;
      const type = msg.type || 'chat';

      if (hasMedia) {
        const media = await msg.downloadMedia().catch(() => null);
        if (media && media.data) {
          const buffer = Buffer.from(media.data, 'base64');
          const ext = mime.extension(media.mimetype) || 'bin';
          const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const filePath = path.join(MEDIA_DIR, filename);
          fs.writeFileSync(filePath, buffer);
          mediaInfo = { file: filePath, mimetype: media.mimetype, size: buffer.length };
        }
      }

      const chatId = msg.fromMe ? (msg.to || msg.from) : msg.from;

      return {
        id: msg.id?._serialized || msg.id || `${chatId}_${Date.now()}`,
        chatId,
        from: msg.from,
        to: msg.to || null,
        fromMe: !!msg.fromMe,
        type,
        body: msg.body || null,
        hasMedia: !!hasMedia,
        media: mediaInfo,
        ack: msg.ack,
        isStatus: false,
        timestamp: (msg.timestamp ? msg.timestamp * 1000 : Date.now())
      };
    }

    client.on('message', async (msg) => {
      try {
        const rec = await toRec(msg);
        bus.emit('message', rec);
      } catch (err) {
        bus.emit('log', `[WAPP message error] ${err?.message || err}`);
      }
    });

    client.on('message_create', async (msg) => {
      try {
        const rec = await toRec(msg);
        bus.emit('message', rec);
      } catch (err) {
        bus.emit('log', `[WAPP message_create error] ${err?.message || err}`);
      }
    });

    client.initialize().catch((err) => {
      bus.emit('log', `[WAPP] erro ao inicializar: ${err?.message || err}`);
      clientPromise = null;
      reject(err);
    });
  });

  return clientPromise;
}

async function resetSession () {
  bus.emit('log', '[WAPP] Reset de sessão solicitado via painel.');

  try {
    if (client) {
      try {
        await client.destroy();
        bus.emit('log', '[WAPP] Client destruído com sucesso.');
      } catch (e) {
        bus.emit('log', `[WAPP] erro ao destruir client: ${e?.message || e}`);
      }
    }

    client = null;
    clientPromise = null;

    // Diretórios raiz a limpar (/data e /.wwebjs_cache)
    const dirs = [
      ROOT_DATA_DIR,
      ROOT_CACHE_DIR
    ];

    for (const dir of dirs) {
      try {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
          bus.emit('log', `[WAPP] Diretório removido: ${dir}`);
        } else {
          bus.emit('log', `[WAPP] Diretório não existe, ignorando: ${dir}`);
        }
      } catch (e) {
        bus.emit('log', `[WAPP] erro ao limpar diretório ${dir}: ${e?.message || e}`);
      }
    }

    // recria estrutura mínima (data/wwebjs, data/media)
    ensureDirs();

    // reinicializa client para gerar novo QR
    getClient().catch((e) => {
      bus.emit('log', `[WAPP] erro ao reinicializar após reset: ${e?.message || e}`);
    });
  } catch (err) {
    bus.emit('log', `[WAPP] erro inesperado no resetSession: ${err?.message || err}`);
    throw err;
  }
}

module.exports = { getClient, bus, MEDIA_DIR, resetSession };
