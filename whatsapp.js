// whatsapp.js
const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const bus = new EventEmitter();

const CLIENT_ID = process.env.WWEBJS_CLIENT_ID || 'whatsapp-bot';
const STORE_DIR = process.env.WWEBJS_STORE || path.join(__dirname, 'data', 'wwebjs');
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(__dirname, 'data', 'media');

if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

let clientPromise;
let client;

function getClient() {
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
    client.on('ready', () => { bus.emit('log', '[WAPP] Ready — conectado.'); resolve(client); });
    client.on('disconnected', (reason) => bus.emit('log', `[WAPP] disconnected: ${reason}`));

    async function toRec(msg) {
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

      // chatId correto: se foi a gente que enviou (fromMe), usar msg.to; senão, msg.from
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
      try { bus.emit('message', await toRec(msg)); }
      catch (err) { bus.emit('log', `[WAPP message error] ${err?.message || err}`); }
    });

    // ESSENCIAL: captura mensagens enviadas pelo próprio número (humano)
    client.on('message_create', async (msg) => {
      try { bus.emit('message', await toRec(msg)); }
      catch (err) { bus.emit('log', `[WAPP message_create error] ${err?.message || err}`); }
    });

    client.initialize().catch(reject);
  });
  return clientPromise;
}

module.exports = { getClient, bus, MEDIA_DIR };
