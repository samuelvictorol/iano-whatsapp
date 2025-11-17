// server.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const { EventEmitter } = require('events');
const { MongoClient } = require('mongodb');

const { getClient, bus: wbus } = require('./whatsapp');
const { callAI, botPrefix, BOT_RX } = require('./src/services/ai');
const { transcribeAudioLocal } = require('./src/services/transcribe');
const { getRecentContext } = require('./src/utils/context');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = Number(process.env.PORT || 10000);
const TOKEN = process.env.DASH_TOKEN || '';
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_CONNECTION_STRING;
const DB_NAME = 'iano_whatsapp';
const COL_NAME = 'messages';
const MSG_TTL_DAYS = Number(process.env.MSG_TTL_DAYS || 0);
const HUMAN_HOLD_MS = Math.max(60_000, Number(process.env.HUMAN_HOLD_MS || 300_000));
const BOT_NAME = process.env.BOT_NAME || 'Bot';

let mongoClient, mongoDb, mongoCol;
async function ensureMongo() {
  if (!mongoClient) {
    mongoClient = await MongoClient.connect(MONGO_URI, { ignoreUndefined: true });
    mongoDb = mongoClient.db(DB_NAME);
    mongoCol = mongoDb.collection(COL_NAME);
    await mongoCol.createIndex({ chatId: 1, fromMe: 1, timestamp: -1 });
    if (MSG_TTL_DAYS > 0) await mongoCol.createIndex({ createdAt: 1 }, { expireAfterSeconds: MSG_TTL_DAYS * 86400 });
  }
}

const bus = new EventEmitter();

// Estado por chat

// Rastreador de mensagens enviadas pela IA (para não disparar hold)
const aiOutbox = new Set(); // guarda IDs das mensagens que NÓS enviamos como IA
const aiOutboxDraft = new Map(); // key: chatId|sha1(normText(text)) -> expireTs (2min)
function markAiMessage(msg) {
  try {
    const id = msg?.id?._serialized || msg?.id || null;
    if (!id) return;
    aiOutbox.add(id);
    setTimeout(() => aiOutbox.delete(id), 10 * 60 * 1000); // expira em 10min
  } catch {}
}
function isAiOutboxId(doc) {
  const id = doc?._id || doc?.id || null;
  return id ? aiOutbox.has(id) : false;
}
function normText(s){ return String(s||'').replace(/\s+/g,' ').replace(/[\u2000-\u200F]/g,'').trim(); }
function sha1(s){ return crypto.createHash('sha1').update(String(s||'' )).digest('hex'); }
function markAiDraft(chatId, text) {
  try {
    const key = `${chatId}|${sha1(normText(text))}`;
    aiOutboxDraft.set(key, Date.now() + 2 * 60 * 1000);
    setTimeout(() => aiOutboxDraft.delete(key), 2 * 60 * 1000 + 5000);
  } catch {}
}
function isAiDraft(chatId, text) {
  const key = `${chatId}|${sha1(normText(text))}`;
  const exp = aiOutboxDraft.get(key);
  return !!(exp && exp > Date.now());
}

function sha1(s){ return crypto.createHash('sha1').update(String(s||'' )).digest('hex'); }
function markAiDraft(chatId, text) {
  try {
    const key = `${chatId}|${sha1(text)}`;
    aiOutboxDraft.set(key, Date.now() + 60 * 1000);
    setTimeout(() => aiOutboxDraft.delete(key), 61 * 1000);
  } catch {}
}
function isAiDraft(chatId, text) {
  const key = `${chatId}|${sha1(text)}`;
  const exp = aiOutboxDraft.get(key);
  return !!(exp && exp > Date.now());
}

const holdMap = new Map();
const queueMap = new Map();
const seenMap = new Map();
const aiState = new Map(); // chatId -> { version:number }
const processedInbounds = new Set(); // msgId -> TTL
const lastAISendAt = new Map(); // chatId -> ts do último envio da IA
function getVersion(chatId){ return (aiState.get(chatId) || {version:0}).version; }
function bumpVersion(chatId){ const s = aiState.get(chatId) || {version:0}; s.version++; aiState.set(chatId, s); return s.version; }
function setHold(chatId, msFromNow) { const holdUntil = Date.now() + msFromNow; holdMap.set(chatId, holdUntil); emitStatusOne(chatId); }
function getHold(chatId) { return holdMap.get(chatId) || 0; }
function aiAllowed(chatId) { const h = getHold(chatId); return !(h && h > Date.now()); }
function enqueueChat(chatId, fn) { const prev = queueMap.get(chatId) || Promise.resolve(); const next = prev.then(() => fn()).catch(() => {}).finally(() => {}); queueMap.set(chatId, next); return next; }

// === TÍTULO DO CHAT (nome/telefone) ===
const chatTitleCache = new Map(); // chatId -> title
function extractPhone(chatId = '') { return String(chatId).split('@')[0].replace(/\D/g, ''); }
function formatMsisdn(digits = '') {
  if (!digits) return '';
  if (digits.startsWith('55')) {
    const rest = digits.slice(2);
    if (rest.length === 11) { const ddd = rest.slice(0,2); const p1 = rest.slice(2,7); const p2 = rest.slice(7); return `+55 (${ddd}) ${p1}-${p2}`; }
    if (rest.length === 10) { const ddd = rest.slice(0,2); const p1 = rest.slice(2,6); const p2 = rest.slice(6); return `+55 (${ddd}) ${p1}-${p2}`; }
  }
  return digits ? `+${digits}` : '';
}
async function getContactTitle(chatId) {
  try {
    const client = await getClient();
    const chat = await client.getChatById(chatId).catch(() => null);
    if (chat) {
      if (chat.isGroup && chat.name) return String(chat.name).trim();
      const c = await chat.getContact().catch(() => null);
      const name = c?.pushname || c?.name || c?.shortName || c?.verifiedName;
      const number = c?.number || c?.id?.user || extractPhone(chatId);
      if (name && String(name).trim()) return String(name).trim();
      if (number) return formatMsisdn(String(number));
    }
    const contact = await client.getContactById(chatId).catch(() => null);
    const name2 = contact?.pushname || contact?.name || contact?.shortName || contact?.verifiedName;
    if (name2 && String(name2).trim()) return String(name2).trim();
    const number2 = contact?.number || contact?.id?.user || extractPhone(chatId);
    if (number2) return formatMsisdn(String(number2));
  } catch(_) {}
  const msisdn = extractPhone(chatId);
  return formatMsisdn(msisdn) || chatId;
}
async function ensureChatTitle(chatId) {
  if (chatTitleCache.has(chatId)) return chatTitleCache.get(chatId);
  const title = await getContactTitle(chatId);
  chatTitleCache.set(chatId, title);
  return title;
}
async function touchChat(chatId, ts = Date.now()) { seenMap.set(chatId, ts); await ensureChatTitle(chatId); emitStatusOne(chatId); }

// Typing helpers
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function estimateTypingMs(text){ const len = String(text||'').length; return Math.max(900, Math.min(6000, Math.round(len*40))); }
async function withTyping(chatId, versionAtStart, work){
  const client = await getClient();
  const chat = await client.getChatById(chatId);
  const ping = async () => { try { await chat.sendStateTyping(); } catch(_){} };
  await ping();
  const keep = setInterval(ping, 4500);
  try {
    return await work({ client, chat, versionAtStart });
  } finally {
    clearInterval(keep);
    try { await chat.clearState(); } catch(_) {}
  }
}

// SSE + logs + QR
const sseClients = new Set();
let lastQrDataUrl = null;
const logBuffer = [];
function pushLog(msg){ const item = { ts: Date.now(), msg: String(msg) }; logBuffer.push(item); if (logBuffer.length > 200) logBuffer.shift(); for (const c of sseClients) c.write(`data: ${JSON.stringify({ type: 'log', item })}\n\n`); }

app.get('/events', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  sseClients.add(res);
  if (lastQrDataUrl) res.write(`data: ${JSON.stringify({ type: 'qr', dataUrl: lastQrDataUrl })}\n\n`);
  if (logBuffer.length) res.write(`data: ${JSON.stringify({ type: 'logs', items: logBuffer.slice(-50) })}\n\n`);

  try {
    const since = Date.now() - 24*60*60*1000;
    const cursor = mongoCol.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$chatId', last: { $first: '$timestamp' } } },
      { $limit: 200 }
    ]);
    const items = [];
    for await (const r of cursor) {
      const chatId = r._id;
      seenMap.set(chatId, r.last);
      const title = await ensureChatTitle(chatId);
      items.push({ chatId, holdUntil: getHold(chatId), aiInControl: aiAllowed(chatId), title });
    }
    res.write(`data: ${JSON.stringify({ type: 'status', items })}\n\n`);
  } catch(e) {}

  req.on('close', () => sseClients.delete(res));
});
function emitStatusOne(chatId) {
  const holdUntil = getHold(chatId);
  const title = chatTitleCache.get(chatId) || extractPhone(chatId) || chatId;
  const payload = { type: 'status_one', item: { chatId, holdUntil, aiInControl: aiAllowed(chatId), title } };
  for (const c of sseClients) c.write(`data: ${JSON.stringify(payload)}\n\n`);
}
setInterval(() => {
  const items = Array.from(new Set([...seenMap.keys(), ...holdMap.keys()])).map(chatId => ({
    chatId, holdUntil: getHold(chatId), aiInControl: aiAllowed(chatId), title: chatTitleCache.get(chatId) || extractPhone(chatId) || chatId
  }));
  for (const c of sseClients) c.write(`data: ${JSON.stringify({ type: 'status', items })}\n\n`);
}, 5000);

// Helpers

function markInboundProcessed(doc){
  const id = doc?._id || doc?.id;
  if (!id) return;
  processedInbounds.add(id);
  setTimeout(() => processedInbounds.delete(id), 3 * 60 * 1000); // 3 min
}
function wasInboundProcessed(doc){
  const id = doc?._id || doc?.id;
  return id ? processedInbounds.has(id) : false;
}


function isAIBody(text=''){ return BOT_RX.test(normText(String(text))); }
function isBotReply(text=''){ return BOT_RX.test(String(text)); }
function isAudioMessage(doc){ if (doc?.type && String(doc.type).toLowerCase().includes('audio')) return true; const mt = doc?.media?.mimetype || ''; return /^audio\//i.test(mt); }
function isVisualMedia(doc){ const t=(doc?.type||'').toLowerCase(); if (t==='image'||t==='video'||t==='sticker') return true; const mt=doc?.media?.mimetype||''; return /^image\//i.test(mt)||/^video\//i.test(mt); }

// send-text
app.post('/send-text', async (req, res) => {
  try {
    if (TOKEN && req.headers['x-token'] !== TOKEN) return res.status(401).json({ ok:false, error:'unauthorized' });
    const { chatId, text } = req.body || {};
    if (!chatId || !text) return res.status(400).json({ ok:false, error:'chatId/text obrigatórios' });
    const client = await getClient();
    await client.sendMessage(chatId, text);
    return res.json({ ok:true });
  } catch (err) {
    console.error('/send-text error', err);
    return res.status(500).json({ ok:false, error: err?.message || 'internal error' });
  }
});

(async () => {
  await ensureMongo();

  wbus.on('log', (msg) => pushLog(msg));
  wbus.on('qr', ({ dataUrl }) => { lastQrDataUrl = dataUrl; for (const c of sseClients) c.write(`data: ${JSON.stringify({ type:'qr', dataUrl })}\n\n`); });

  wbus.on('message', async (rec) => {
    try {
      if (!mongoCol) return;
      const doc = {
        _id: rec.id || `${rec.chatId || 'chat'}:${rec.timestamp}`,
        chatId: rec.chatId,
        from: rec.from,
        to: rec.to,
        fromMe: !!rec.fromMe,
        type: rec.type,
        body: rec.body || null,
        hasMedia: !!rec.hasMedia,
        media: rec.media && rec.media.file ? { file: rec.media.file, mimetype: rec.media.mimetype, size: rec.media.size }
             : (rec.media && rec.media.mimetype ? { mimetype: rec.media.mimetype } : null),
        ack: rec.ack, // status da mensagem (0=enviado, 1=entregue, 2=lida)
        isStatus: !!rec.isStatus,
        timestamp: rec.timestamp || Date.now(),
        createdAt: new Date(rec.timestamp || Date.now())
      };

      // transcrição de áudio
      if (!doc.fromMe && doc.hasMedia && isAudioMessage(doc)) {
        const filePath = doc.media?.file ? path.resolve(doc.media.file) : null;
        const tr = await transcribeAudioLocal(filePath, doc.media?.mimetype || '');
        if (tr && tr.trim()) doc.body = tr.trim();
      }

      await mongoCol.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
      await touchChat(doc.chatId, doc.timestamp);

      // SAÍDA (nós): humano → hold imediato e invalida IA em curso/queue
      if (doc.fromMe && doc.body && !doc.hasMedia) { if (!(isAIBody(doc.body) || isAiOutboxId(doc) || isAiDraft(doc.chatId, doc.body))) {
          const last = lastAISendAt.get(doc.chatId) || 0;
          if (Date.now() - last < 5000) { /* ignora eco imediato da IA */ }
          else {
          pushLog(`[HUMANO] takeover em ${doc.chatId} — cooldown iniciado`);
                      bumpVersion(doc.chatId);
                      setHold(doc.chatId, HUMAN_HOLD_MS);
          }
        }
      }

      // ENTRADA (cliente)
      if (!doc.fromMe && !doc.isStatus) {
        const cleanBody = (doc.body || '').trim();

        // Dedupe: evita responder duas vezes o mesmo inbound
        if (wasInboundProcessed(doc)) { bus.emit('log', `[ROUTE] inbound duplicado ignorado ${doc.chatId}`); return; }
        markInboundProcessed(doc);

        if (isVisualMedia(doc) || cleanBody === '') {
          bus.emit('log', `[ROUTE] IA ignorada (mídia visual/body vazio) chat=${doc.chatId} type=${doc.type}`);
          bus.emit('human:queue', doc);
          return;
        }

        if (!aiAllowed(doc.chatId)) {
          bus.emit('log', `[ROUTE] IA bloqueada (HUMANO cooldown) chat=${doc.chatId}`);
          bus.emit('human:queue', doc);
          return;
        }

        const ctx = await getRecentContext(mongoCol, doc.chatId);
        const versionAtStart = getVersion(doc.chatId);

        enqueueChat(doc.chatId, async () => {
          if (getVersion(doc.chatId) !== versionAtStart || !aiAllowed(doc.chatId)) return;

          await withTyping(doc.chatId, versionAtStart, async ({ client, chat }) => {
            const ai = await callAI({ chatId: doc.chatId, text: cleanBody, context_messages: ctx });

            if (getVersion(doc.chatId) !== versionAtStart || !aiAllowed(doc.chatId)) return;

            const msgs = Array.isArray(ai.ia_reply_messages) ? ai.ia_reply_messages : [];
            const preview = msgs[0] || '';
            await sleep(estimateTypingMs(preview));

            for (const m of msgs) {
              if (getVersion(doc.chatId) !== versionAtStart || !aiAllowed(doc.chatId)) return;
              await client.sendMessage(doc.chatId, botPrefix(String(m)));
              await sleep(300 + Math.random()*400);
            }

            if (ai.catalog_url && typeof ai.catalog_url === 'string' && ai.catalog_url.trim() !== '') {
              if (getVersion(doc.chatId) !== versionAtStart || !aiAllowed(doc.chatId)) return;
              const base = (process.env.CATALOGO_BASE_URL || '').replace(/\/$/, '');
              const _text2 = botPrefix(`Veja opções no catálogo: ${base}${ai.catalog_url}`);
              markAiDraft(doc.chatId, _text2);
              const _link = await client.sendMessage(doc.chatId, _text2);
              lastAISendAt.set(doc.chatId, Date.now());
              markAiMessage(_link);
            }
          });
        });
      }
    } catch (e) {
      bus.emit('log', `[MONGO SAVE ERROR] ${e?.message || e}`);
    }
  });

  app.listen(PORT, async () => {
    pushLog(`[Logger] on :${PORT}`);
    try { await getClient(); } catch (e) { pushLog(`[Logger] WhatsApp init error: ${e?.message || e}`); }
  });
})();
