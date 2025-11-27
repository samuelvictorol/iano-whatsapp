// server.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const { EventEmitter } = require('events');
const { MongoClient } = require('mongodb');
const { MessageMedia } = require('whatsapp-web.js');
const { callAI, botPrefix, isBotText, describeImage } = require('./src/services/ai');
const { transcribeAudioLocal } = require('./src/services/transcribe');
const { getRecentContext } = require('./src/utils/context');
const { getClient, bus: wbus, resetSession, MEDIA_DIR } = require('./whatsapp');
const {
  setRuntimeConfig,
  getRuntimeConfig,
  hasRuntimeConfig
} = require('./src/config/runtime-config');
const multer = require('multer');
// serviço que agrega uso de tokens da OpenAI (texto + visão)
const { getTokenUsageSummary } = require('./src/services/token-usage');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = Number(process.env.PORT || 10000);
const TOKEN = process.env.DASH_TOKEN || ''; // opcional
const DB_NAME = 'iano_whatsapp';
const COL_NAME = 'messages';
const MSG_TTL_DAYS = Number(process.env.MSG_TTL_DAYS || 0);

let mongoClient = null;
let mongoDb = null;
let mongoCol = null;

const upload = multer({
  dest: MEDIA_DIR,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB 
  }
});

async function connectMongo(mongoUri, dbName = DB_NAME, colName = COL_NAME) {
  if (!mongoUri) {
    throw new Error('mongoUri obrigatório');
  }

  if (mongoClient) {
    try {
      await mongoClient.close();
    } catch (_) { }
    mongoClient = null;
    mongoDb = null;
    mongoCol = null;
  }

  mongoClient = await MongoClient.connect(mongoUri, { ignoreUndefined: true });
  mongoDb = mongoClient.db(dbName);
  mongoCol = mongoDb.collection(colName);

  await mongoCol.createIndex({ chatId: 1, fromMe: 1, timestamp: -1 });
  if (MSG_TTL_DAYS > 0) {
    await mongoCol.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: MSG_TTL_DAYS * 86400 }
    );
  }

  console.log(`[🍃] Mongo conectado em ${mongoUri} | DB=${dbName} | Col=${colName}`);
}

// Event bus interno
const bus = new EventEmitter();

// === ESTADO / CONTROLES ===
const aiOutbox = new Set(); // guarda IDs das mensagens que NÓS enviamos como IA
const aiOutboxDraft = new Map(); // key: chatId|sha1(normText(text)) -> expireTs (2min)

function markAiMessage(msg) {
  try {
    const id = msg?.id?._serialized || msg?.id || null;
    if (!id) return;
    aiOutbox.add(id);
    setTimeout(() => aiOutbox.delete(id), 10 * 60 * 1000);
  } catch { }
}

function isAiOutboxId(doc) {
  const id = doc?._id || doc?.id || null;
  return id ? aiOutbox.has(id) : false;
}

function normText(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/[\u2000-\u200F]/g, '')
    .trim();
}

function sha1(s) {
  return crypto.createHash('sha1').update(String(s || '')).digest('hex');
}

function markAiDraft(chatId, text) {
  try {
    const key = `${chatId}|${sha1(normText(text))}`;
    const exp = Date.now() + 2 * 60 * 1000;
    aiOutboxDraft.set(key, exp);
    setTimeout(() => aiOutboxDraft.delete(key), 2 * 60 * 1000 + 5000);
  } catch { }
}

function isAiDraft(chatId, text) {
  const key = `${chatId}|${sha1(normText(text))}`;
  const exp = aiOutboxDraft.get(key);
  return !!(exp && exp > Date.now());
}

const holdMap = new Map();
const queueMap = new Map();
const seenMap = new Map();
const aiState = new Map(); // chatId -> { version:number }
const processedInbounds = new Set(); // msgId -> TTL
const lastAISendAt = new Map(); // chatId -> ts do último envio da IA

// imagens pendentes de instrução do usuário (visão)
const pendingVisionMap = new Map(); // chatId -> { filePath, mimeType, createdAt }

function getVersion(chatId) {
  return (aiState.get(chatId) || { version: 0 }).version;
}
function bumpVersion(chatId) {
  const s = aiState.get(chatId) || { version: 0 };
  s.version++;
  aiState.set(chatId, s);
  return s.version;
}
function setHold(chatId, msFromNow) {
  const holdUntil = Date.now() + msFromNow;
  holdMap.set(chatId, holdUntil);
  emitStatusOne(chatId);
}
function getHold(chatId) {
  return holdMap.get(chatId) || 0;
}
function aiAllowed(chatId) {
  const h = getHold(chatId);
  return !(h && h > Date.now());
}
function getHumanHoldMs() {
  try {
    const cfg = getRuntimeConfig();
    const ms = Number(cfg.ai?.HUMAN_HOLD_MS ?? 300000);
    return Math.max(60_000, ms);
  } catch {
    return 300000;
  }
}

function enqueueChat(chatId, fn) {
  const prev = queueMap.get(chatId) || Promise.resolve();

  const next = prev
    .then(() => fn())
    .catch((err) => {
      const msg = err?.stack || err?.message || String(err);
      pushLog(`[QUEUE] erro na fila do chat ${chatId}: ${msg}`);
      console.error('[QUEUE ERROR]', chatId, err);
    });

  queueMap.set(chatId, next);
  return next;
}

// === TÍTULO DO CHAT (nome/telefone) ===
const chatTitleCache = new Map(); // chatId -> title

function extractPhone(chatId = '') {
  return String(chatId).split('@')[0].replace(/\D/g, '');
}
function formatMsisdn(digits = '') {
  if (!digits) return '';
  if (digits.startsWith('55')) {
    const rest = digits.slice(2);
    if (rest.length === 11) {
      const ddd = rest.slice(0, 2);
      const p1 = rest.slice(2, 7);
      const p2 = rest.slice(7);
      return `+55 (${ddd}) ${p1}-${p2}`;
    }
    if (rest.length === 10) {
      const ddd = rest.slice(0, 2);
      const p1 = rest.slice(2, 6);
      const p2 = rest.slice(6);
      return `+55 (${ddd}) ${p1}-${p2}`;
    }
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
    const name2 =
      contact?.pushname || contact?.name || contact?.shortName || contact?.verifiedName;
    if (name2 && String(name2).trim()) return String(name2).trim();
    const number2 = contact?.number || contact?.id?.user || extractPhone(chatId);
    if (number2) return formatMsisdn(String(number2));
  } catch (_) { }
  const msisdn = extractPhone(chatId);
  return formatMsisdn(msisdn) || chatId;
}
async function ensureChatTitle(chatId) {
  if (chatTitleCache.has(chatId)) return chatTitleCache.get(chatId);
  const title = await getContactTitle(chatId);
  chatTitleCache.set(chatId, title);
  return title;
}
async function touchChat(chatId, ts = Date.now()) {
  seenMap.set(chatId, ts);
  await ensureChatTitle(chatId);
  emitStatusOne(chatId);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function estimateTypingMs(text) {
  const len = String(text || '').length;
  return Math.max(900, Math.min(6000, Math.round(len * 40)));
}
async function withTyping(chatId, versionAtStart, work) {
  const client = await getClient();
  const chat = await client.getChatById(chatId);
  const ping = async () => {
    try {
      await chat.sendStateTyping();
    } catch (_) { }
  };
  await ping();
  const keep = setInterval(ping, 4500);
  try {
    return await work({ client, chat, versionAtStart });
  } finally {
    clearInterval(keep);
    try {
      await chat.clearState();
    } catch (_) { }
  }
}

// === VISÃO pra imagem x figurinha ===
function isAudioMessage(doc) {
  if (doc?.type && String(doc.type).toLowerCase().includes('audio')) return true;
  const mt = doc?.media?.mimetype || '';
  return /^audio\//i.test(mt);
}

function isStickerMessage(doc) {
  const t = (doc?.type || '').toLowerCase();
  if (t === 'sticker') return true;
  const mt = (doc?.media?.mimetype || '').toLowerCase();
  return mt === 'image/webp';
}

function isImagePhoto(doc) {
  const t = (doc?.type || '').toLowerCase();
  const mt = (doc?.media?.mimetype || '').toLowerCase();

  if (t === 'image' && !isStickerMessage(doc)) return true;
  if (/^image\//i.test(mt) && mt !== 'image/webp') return true;

  return false;
}

// visual "não tratado" pela visão = vídeo, etc.
function isVisualMedia(doc) {
  const t = (doc?.type || '').toLowerCase();
  if (t === 'video') return true;
  const mt = (doc?.media?.mimetype || '').toLowerCase();
  return /^video\//i.test(mt);
}

// === SSE + logs + QR ===
const sseClients = new Set();
let lastQrDataUrl = null;
const logBuffer = [];

function pushLog(msg) {
  const item = { ts: Date.now(), msg: String(msg) };
  logBuffer.push(item);
  if (logBuffer.length > 200) logBuffer.shift();
  for (const c of sseClients) {
    c.write(`data: ${JSON.stringify({ type: 'log', item })}\n\n`);
  }
}

app.get('/events', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  if (lastQrDataUrl) {
    res.write(`data: ${JSON.stringify({ type: 'qr', dataUrl: lastQrDataUrl })}\n\n`);
  }
  if (logBuffer.length) {
    res.write(
      `data: ${JSON.stringify({ type: 'logs', items: logBuffer.slice(-50) })}\n\n`
    );
  }

  // status inicial (últimos chats vistos) – só se Mongo estiver configurado
  if (mongoCol) {
    try {
      const since = Date.now() - 24 * 60 * 60 * 1000;
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
        items.push({
          chatId,
          holdUntil: getHold(chatId),
          aiInControl: aiAllowed(chatId),
          title
        });
      }

      res.write(`data: ${JSON.stringify({ type: 'status', items })}\n\n`);
    } catch (e) {
      console.error('[SSE status error]', e);
    }
  }

  req.on('close', () => sseClients.delete(res));
});

function emitStatusOne(chatId) {
  const holdUntil = getHold(chatId);
  const title = chatTitleCache.get(chatId) || extractPhone(chatId) || chatId;
  const payload = {
    type: 'status_one',
    item: { chatId, holdUntil, aiInControl: aiAllowed(chatId), title }
  };
  for (const c of sseClients) c.write(`data: ${JSON.stringify(payload)}\n\n`);
}

setInterval(() => {
  const items = Array.from(new Set([...seenMap.keys(), ...holdMap.keys()])).map(
    (chatId) => ({
      chatId,
      holdUntil: getHold(chatId),
      aiInControl: aiAllowed(chatId),
      title: chatTitleCache.get(chatId) || extractPhone(chatId) || chatId
    })
  );
  for (const c of sseClients) {
    c.write(`data: ${JSON.stringify({ type: 'status', items })}\n\n`);
  }
}, 5000);
// *********** HELPERS ************
let contactGroupsCol = null;
// Normaliza número para lookup (getNumberId)
function normalizeDigitsForLookup(rawNumber) {
  if (!rawNumber) return null;

  let digits = String(rawNumber).replace(/\D/g, '');
  if (!digits) return null;

  // Garante prefixo 55 (Brasil)
  if (!digits.startsWith('55')) {
    digits = '55' + digits;
  }

  // 55 + DDD (2) + número (8 ou 9) => 12 ou 13 dígitos
  if (digits.length !== 12 && digits.length !== 13) {
    return null;
  }

  return digits;
}

// Usa getNumberId pra garantir que o número é WhatsApp e pegar o _serialized correto
async function resolveChatIdForSend(client, rawNumber) {
  const digits = normalizeDigitsForLookup(rawNumber);
  if (!digits) {
    return {
      ok: false,
      reason: 'invalid_number_format',
      chatId: null,
      digits: null
    };
  }

  let numberId = null;
  try {
    numberId = await client.getNumberId(digits);
  } catch (e) {
    console.error('[resolveChatIdForSend] getNumberId error', rawNumber, e);
  }

  if (!numberId) {
    // número não usa WhatsApp ou WA não conseguiu resolver
    return {
      ok: false,
      reason: 'not_whatsapp_user',
      chatId: null,
      digits
    };
  }

  return {
    ok: true,
    reason: 'ok',
    chatId: numberId._serialized, // ex: 5561xxxx@c.us
    digits
  };
}

// Coleção de grupos de disparo
async function getContactGroupsCollection() {
  if (!mongoDb) {
    throw new Error(
      'Mongo ainda não conectado. Use /start-session no painel para configurar mongoUri.'
    );
  }

  if (!contactGroupsCol) {
    contactGroupsCol = mongoDb.collection('contact_groups');
    await contactGroupsCol.createIndex({ label: 1 }, { unique: true });
    await contactGroupsCol.createIndex({ createdAt: 1 });
  }

  return contactGroupsCol;
}

function normalizeToChatIdOutbound(rawNumber) {
  if (!rawNumber) return null;

  let digits = String(rawNumber).replace(/\D/g, '');
  if (!digits) return null;

  // garante prefixo 55
  if (!digits.startsWith('55')) {
    digits = '55' + digits;
  }

  // +55 + DDD + número (8 ou 9 dígitos) => 12 ou 13 dígitos
  if (digits.length !== 12 && digits.length !== 13) {
    return null;
  }

  return digits + '@c.us';
}

function normalizeContactsArray(list) {
  const valid = [];
  const invalid = [];

  for (const raw of list || []) {
    const s = String(raw || '').trim();
    if (!s) continue;

    const chatId = normalizeToChatIdOutbound(s);
    if (chatId) {
      valid.push({ raw: s, chatId });
    } else {
      invalid.push(s);
    }
  }

  return { valid, invalid };
}
// Converte "+5511999999999", "5511999999999" ou "11999999999" em "5511999999999@c.us"
function normalizeToChatId(rawNumber) {
  if (!rawNumber) return null;

  // tira tudo que não for dígito
  let digits = String(rawNumber).replace(/\D/g, '');
  if (!digits) return null;

  // garante prefixo 55 (Brasil)
  if (!digits.startsWith('55')) {
    digits = '55' + digits;
  }

  // +55 + DDD (2) + número (8 ou 9) => 12 ou 13 dígitos
  if (digits.length !== 12 && digits.length !== 13) {
    return null;
  }

  return digits + '@c.us';
}
//  inbound
function markInboundProcessed(doc) {
  const id = doc?._id || doc?.id;
  if (!id) return;
  processedInbounds.add(id);
  setTimeout(() => processedInbounds.delete(id), 3 * 60 * 1000);
}
function wasInboundProcessed(doc) {
  const id = doc?._id || doc?.id;
  return id ? processedInbounds.has(id) : false;
}

function isAIBody(text = '') {
  return isBotText(normText(String(text)));
}
function isBotReply(text = '') {
  return isBotText(String(text));
}

// send-text
app.post('/send-text', async (req, res) => {
  try {
    if (TOKEN && req.headers['x-token'] !== TOKEN) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    const { chatId, text } = req.body || {};
    if (!chatId || !text) {
      return res.status(400).json({ ok: false, error: 'chatId/text obrigatórios' });
    }
    const client = await getClient();
    await client.sendMessage(chatId, text);
    return res.json({ ok: true });
  } catch (err) {
    console.error('/send-text error', err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || 'internal error' });
  }
});

// === /start-session ===
// Recebe mongoUri + config OpenAI/IA vindas do painel e inicializa tudo.
app.post('/start-session', async (req, res) => {
  try {
    if (TOKEN && req.headers['x-token'] !== TOKEN) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const { mongoUri, mongoDbName, mongoColName, openai, ai } = req.body || {};

    if (!mongoUri || !openai || !openai.OPENAI_API_KEY) {
      return res.status(400).json({
        ok: false,
        error: 'mongoUri e openai.OPENAI_API_KEY são obrigatórios'
      });
    }

    const runtimeConfig = {
      mongo: {
        uri: mongoUri,
        dbName: mongoDbName || DB_NAME,
        colName: mongoColName || COL_NAME
      },
      openai: {
        apiKey: openai.OPENAI_API_KEY,
        model: openai.OPENAI_CHAT_MODEL || 'gpt-4.1-mini',
        temperature: Number(
          openai.OPENAI_TEMPERATURE !== undefined
            ? openai.OPENAI_TEMPERATURE
            : 0.8
        ),
        maxTokens: Number(
          openai.OPENAI_MAX_TOKENS !== undefined
            ? openai.OPENAI_MAX_TOKENS
            : 900
        ),
        transcribeModel: openai.TRANSCRIBE_MODEL || 'whisper-1'
      },
      ai: {
        IA_CONTEXT_MAX_MINUTES: Number(ai?.IA_CONTEXT_MAX_MINUTES ?? 5),
        HUMAN_HOLD_MS: Number(ai?.HUMAN_HOLD_MS ?? 300000),
        AI_CONTEXT: ai?.AI_CONTEXT || '',
        AI_RULES: ai?.AI_RULES || '',
        AI_METADATA: ai?.AI_METADATA || '',
        BOT_NAME: ai?.BOT_NAME || 'IANO Bot',
        dataItems: Array.isArray(ai?.dataItems) ? ai.dataItems : [],
        // campos opcionais específicos para visão (caso o front envie)
        AI_VISION_CONTEXT: ai?.AI_VISION_CONTEXT || '',
        AI_VISION_RULES: ai?.AI_VISION_RULES || '',
        AI_VISION_METADATA: ai?.AI_VISION_METADATA || '',
        AI_VISION_MODE: ai?.AI_VISION_MODE || 'describe' // ex.: 'describe', 'ocr', etc. (livre)
      }
    };

    setRuntimeConfig(runtimeConfig);
    await connectMongo(
      runtimeConfig.mongo.uri,
      runtimeConfig.mongo.dbName,
      runtimeConfig.mongo.colName
    );

    pushLog(
      `[CONFIG] Sessão iniciada. Mongo conectado e OpenAI configurada (model=${runtimeConfig.openai.model}).`
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error('/start-session error', err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || 'internal error' });
  }
});

// Reset de sessão do WhatsApp
app.post('/reset-session', async (req, res) => {
  try {
    if (TOKEN && req.headers['x-token'] !== TOKEN) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    await resetSession();
    return res.json({ ok: true });
  } catch (err) {
    console.error('/reset-session error', err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || 'internal error' });
  }
});

// === /token-usage ===
// Retorna dados agregados de tokens da OpenAI (somente API OpenAI, nada de Mongo DB usage)
app.get('/token-usage', async (req, res) => {
  try {
    if (TOKEN && req.headers['x-token'] !== TOKEN) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    // Key da OpenAI vinda do frontend (localStorage)
    const headerKey = req.headers['x-openai-key'] || '';
    const queryKey = req.query.openaiKey || '';
    const frontendKey = String(headerKey || queryKey || '').trim();

    const range = String(req.query.range || '7d'); // '7d' | '30d' | 'month'

    // se ainda não existe runtimeConfig, não quebra: devolve zerado
    if (!hasRuntimeConfig()) {
      return res.json({
        ok: true,
        range,
        daily: [],
        summary: {
          totalTokensThisRange: 0,
          spentUsdThisRange: 0,
          availableUsd: 0,
          avgCostPer1kTokens: 0
        }
      });
    }

    const cfg = getRuntimeConfig();
    const configuredKey = cfg.openai?.apiKey;

    if (configuredKey && frontendKey && configuredKey !== frontendKey) {
      return res.status(401).json({
        ok: false,
        error: 'OPENAI_API_KEY divergente da sessão atual.'
      });
    }

    const result = await getTokenUsageSummary({ range });

    return res.json({
      ok: true,
      range,
      daily: result.daily,
      summary: result.summary
    });
  } catch (err) {
    console.error('/token-usage error', err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || 'internal error' });
  }
});

/**
 * Fluxo para descrever imagem via IA de visão
 */
async function handleDescribeImage({ doc, instruction, filePath, mimeType }) {
  const chatId = doc.chatId;
  const versionAtStart = getVersion(chatId);

  await enqueueChat(chatId, async () => {
    if (getVersion(chatId) !== versionAtStart || !aiAllowed(chatId)) return;

    await withTyping(chatId, versionAtStart, async ({ client }) => {
      let description;
      try {
        description = await describeImage({
          chatId,
          filePath,
          mimeType,
          userText: instruction
        });
      } catch (err) {
        const msg = err?.message || String(err);
        pushLog(`[VISION ERROR] chat=${chatId} ao chamar visão OpenAI: ${msg}`);

        const fallback = botPrefix(
          'Tive um problema para analisar a imagem 😅. Pode tentar novamente em alguns instantes?'
        );
        const sent = await client.sendMessage(chatId, fallback);
        lastAISendAt.set(chatId, Date.now());
        markAiMessage(sent);
        return;
      }

      const finalText = (description || '').trim();
      if (!finalText) {
        const fallback = botPrefix(
          'Não consegui extrair muitos detalhes da imagem. Você pode explicar melhor o que precisa?'
        );
        const sent = await client.sendMessage(chatId, fallback);
        lastAISendAt.set(chatId, Date.now());
        markAiMessage(sent);
        return;
      }

      const text = botPrefix(finalText);
      markAiDraft(chatId, text);
      const sent = await client.sendMessage(chatId, text);
      lastAISendAt.set(chatId, Date.now());
      markAiMessage(sent);
    });
  });
}

// Integração com WhatsApp bus
(async () => {
  wbus.on('log', (msg) => pushLog(msg));

  console.log(
    '[🍃] Mongo ainda não conectado. Use /start-session no painel para configurar mongoUri + OpenAI.'
  );

  wbus.on('qr', ({ dataUrl }) => {
    lastQrDataUrl = dataUrl;
    for (const c of sseClients) {
      c.write(`data: ${JSON.stringify({ type: 'qr', dataUrl })}\n\n`);
    }
  });

  wbus.on('message', async (rec) => {
    try {
      if (!mongoCol) return; // ainda não configurado via /start-session

      const doc = {
        _id: rec.id || `${rec.chatId || 'chat'}:${rec.timestamp}`,
        chatId: rec.chatId,
        from: rec.from,
        to: rec.to,
        fromMe: !!rec.fromMe,
        type: rec.type,
        body: rec.body || null,
        hasMedia: !!rec.hasMedia,
        media:
          rec.media && rec.media.file
            ? { file: rec.media.file, mimetype: rec.media.mimetype, size: rec.media.size }
            : rec.media && rec.media.mimetype
              ? { mimetype: rec.media.mimetype }
              : null,
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
      if (doc.fromMe && doc.body && !doc.hasMedia) {
        if (!(isAIBody(doc.body) || isAiOutboxId(doc) || isAiDraft(doc.chatId, doc.body))) {
          const last = lastAISendAt.get(doc.chatId) || 0;
          if (Date.now() - last < 5000) {
            // ignora eco imediato da IA
          } else {
            pushLog(`[HUMANO] takeover em ${doc.chatId} — cooldown iniciado`);
            bumpVersion(doc.chatId);
            setHold(doc.chatId, getHumanHoldMs());
          }
        }
      }

      // ENTRADA (cliente)
      if (!doc.fromMe && !doc.isStatus) {
        const cleanBody = (doc.body || '').trim();

        // Dedupe
        if (wasInboundProcessed(doc)) {
          bus.emit('log', `[ROUTE] inbound duplicado ignorado ${doc.chatId}`);
          return;
        }
        markInboundProcessed(doc);

        const hasImage = doc.hasMedia && isImagePhoto(doc);

        // 1) se já existe uma imagem pendente e chegou um texto explicando o que fazer
        if (!hasImage && pendingVisionMap.has(doc.chatId)) {
          const pending = pendingVisionMap.get(doc.chatId);
          const ageMs = Date.now() - (pending.createdAt || 0);

          if (cleanBody && ageMs <= 10 * 60 * 1000) {
            if (!aiAllowed(doc.chatId)) {
              bus.emit('log', `[ROUTE] visão bloqueada (HUMANO cooldown) chat=${doc.chatId}`);
              bus.emit('human:queue', doc);
              return;
            }

            pendingVisionMap.delete(doc.chatId);

            await handleDescribeImage({
              doc,
              instruction: cleanBody,
              filePath: pending.filePath,
              mimeType: pending.mimeType
            });
            return;
          } else {
            // expirou ou texto vazio: limpa pendência e segue fluxo normal
            pendingVisionMap.delete(doc.chatId);
          }
        }

        // 2) chegou uma imagem (foto) do usuário
        if (hasImage) {
          if (!aiAllowed(doc.chatId)) {
            bus.emit('log', `[ROUTE] visão bloqueada (HUMANO cooldown) chat=${doc.chatId}`);
            bus.emit('human:queue', doc);
            return;
          }

          const filePath = doc.media?.file ? path.resolve(doc.media.file) : null;
          const mimeType = doc.media?.mimetype || 'image/jpeg';

          if (!filePath) {
            bus.emit(
              'log',
              `[VISION] imagem recebida sem filePath salvo (chat=${doc.chatId}), encaminhando para humano`
            );
            bus.emit('human:queue', doc);
            return;
          }

          if (cleanBody) {
            // legenda já dizendo o que fazer
            await handleDescribeImage({
              doc,
              instruction: cleanBody,
              filePath,
              mimeType
            });
            return;
          }

          // NÃO TEM INSTRUÇÃO → pergunta pro usuário e guarda pendente
          pendingVisionMap.set(doc.chatId, {
            filePath,
            mimeType,
            createdAt: Date.now()
          });

          const client = await getClient();
          const ask = botPrefix(
            'Recebi sua imagem 😊. Como posso ajudar?'
          );
          const sent = await client.sendMessage(doc.chatId, ask);
          lastAISendAt.set(doc.chatId, Date.now());
          markAiMessage(sent);
          return;
        }

        // 3) mídia visual não suportada (vídeo, sticker) ou body vazio
        if (isVisualMedia(doc) || cleanBody === '') {
          bus.emit(
            'log',
            `[ROUTE] IA ignorada (mídia visual/body vazio) chat=${doc.chatId} type=${doc.type}`
          );
          bus.emit('human:queue', doc);
          return;
        }

        // 4) se IA está em cooldown humano
        if (!aiAllowed(doc.chatId)) {
          bus.emit('log', `[ROUTE] IA bloqueada (HUMANO cooldown) chat=${doc.chatId}`);
          bus.emit('human:queue', doc);
          return;
        }

        // 5) fluxo normal de IA (texto)
        const ctx = await getRecentContext(mongoCol, doc.chatId);
        const versionAtStart = getVersion(doc.chatId);

        enqueueChat(doc.chatId, async () => {
          if (getVersion(doc.chatId) !== versionAtStart || !aiAllowed(doc.chatId)) return;

          await withTyping(doc.chatId, versionAtStart, async ({ client }) => {
            let ai;
            try {
              ai = await callAI({
                chatId: doc.chatId,
                text: cleanBody,
                context_messages: ctx
              });
            } catch (err) {
              const msg = err?.message || String(err);
              pushLog(`[AI ERROR] chat=${doc.chatId} ao chamar OpenAI: ${msg}`);

              const fallback = botPrefix(
                'Tive um problema para responder agora 😅. Pode tentar de novo em alguns instantes?'
              );
              const sent = await client.sendMessage(doc.chatId, fallback);
              lastAISendAt.set(doc.chatId, Date.now());
              markAiMessage(sent);
              return;
            }

            const msgs = Array.isArray(ai.ia_reply_messages)
              ? ai.ia_reply_messages.filter(Boolean)
              : [];

            if (!msgs.length) {
              pushLog(
                `[AI WARN] chat=${doc.chatId} sem ia_reply_messages válidas. Enviando fallback.`
              );
              const fallback = botPrefix(
                'Não consegui entender muito bem. Pode repetir por favor?'
              );
              const sent = await client.sendMessage(doc.chatId, fallback);
              lastAISendAt.set(doc.chatId, Date.now());
              markAiMessage(sent);
              return;
            }

            if (getVersion(doc.chatId) !== versionAtStart || !aiAllowed(doc.chatId)) return;

            const preview = msgs[0];
            await sleep(estimateTypingMs(preview));

            for (const m of msgs) {
              if (getVersion(doc.chatId) !== versionAtStart || !aiAllowed(doc.chatId)) return;
              const text = botPrefix(String(m));
              markAiDraft(doc.chatId, text);
              const sent = await client.sendMessage(doc.chatId, text);
              lastAISendAt.set(doc.chatId, Date.now());
              markAiMessage(sent);
              await sleep(300 + Math.random() * 400);
            }
          });
        });
      }
    } catch (e) {
      bus.emit('log', `[MONGO SAVE/ROUTE ERROR] ${e?.message || e}`);
    }
  });

  app.listen(PORT, async () => {
    pushLog(`[Logger] on :${PORT}`);
    console.log('🟢 Server Online - http://localhost:' + PORT);
    try {
      await getClient();
    } catch (e) {
      pushLog(`[Logger] WhatsApp init error: ${e?.message || e}`);
    }
  });
  // Envio em massa: texto ou mídia para uma lista de contatos
  // Body esperado:
  // {
  //   "contacts": ["+5511999999999", "+551134567890"],
  //   "text": "Mensagem opcional",
  //   "mediaUrl": "https://meuservidor.com/imagem.jpg", // opcional
  //   "caption": "Legenda opcional para a mídia"        // opcional
  // }
  // Envio em massa: texto ou mídia para uma lista de contatos
  // Body esperado:
  // {
  //   "contacts": ["+5511999999999", "+551134567890"],
  //   "text": "Mensagem opcional",
  //   "mediaUrl": "https://meuservidor.com/imagem.jpg", // opcional
  //   "caption": "Legenda opcional para a mídia"        // opcional
  // }
  app.post('/send-bulk', async (req, res) => {
    try {
      if (TOKEN && req.headers['x-token'] !== TOKEN) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
      }

      const { contacts, text, mediaUrl, caption } = req.body || {};

      if (!Array.isArray(contacts) || !contacts.length) {
        return res.status(400).json({
          ok: false,
          error: 'contacts (array) é obrigatório'
        });
      }

      if (!text && !mediaUrl) {
        return res.status(400).json({
          ok: false,
          error: 'Informe pelo menos "text" ou "mediaUrl".'
        });
      }

      const client = await getClient();

      const results = [];
      let success = 0;

      for (const raw of contacts) {
        // 1) resolve via getNumberId
        const resolved = await resolveChatIdForSend(client, raw);

        if (!resolved.ok) {
          results.push({
            contact: raw,
            chatId: resolved.chatId,
            ok: false,
            error: resolved.reason  // 'invalid_number_format' | 'not_whatsapp_user'
          });
          continue;
        }

        const chatId = resolved.chatId;

        try {
          if (mediaUrl) {
            const media = await MessageMedia.fromUrl(mediaUrl);
            await client.sendMessage(chatId, media, {
              caption: caption || text || ''
            });
          } else {
            await client.sendMessage(chatId, text);
          }

          results.push({ contact: raw, chatId, ok: true });
          success++;
        } catch (err) {
          const msg = err?.message || '';

          let errorCode = 'send_error';
          if (msg.includes('No LID for user')) {
            errorCode = 'no_lid_for_user';
          }

          console.error('[send-bulk] erro ao enviar para', raw, err);
          results.push({
            contact: raw,
            chatId,
            ok: false,
            error: errorCode
          });
        }
      }

      return res.json({
        ok: true,
        count: results.length,
        success,
        results
      });
    } catch (err) {
      console.error('/send-bulk error', err);
      return res
        .status(500)
        .json({ ok: false, error: err?.message || 'internal error' });
    }
  });
  // Envio em massa com UPLOAD de arquivo (imagem / documento)
  app.post('/send-bulk-upload', upload.single('file'), async (req, res) => {
    try {
      if (TOKEN && req.headers['x-token'] !== TOKEN) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
      }

      if (!hasRuntimeConfig()) {
        return res.status(400).json({
          ok: false,
          error: 'Sessão ainda não configurada. Use /start-session na aba Configurar.'
        });
      }

      const file = req.file;
      const { caption, text } = req.body || {};
      let contactsField = req.body.contacts;

      if (!file) {
        return res.status(400).json({
          ok: false,
          error: 'Arquivo (file) obrigatório no multipart/form-data.'
        });
      }

      if (!contactsField) {
        return res.status(400).json({
          ok: false,
          error: 'Campo contacts obrigatório (array JSON de números).'
        });
      }

      // contacts vem como string JSON no multipart
      let contactsRaw;
      try {
        if (Array.isArray(contactsField)) {
          contactsRaw = contactsField;
        } else {
          contactsRaw = JSON.parse(String(contactsField));
        }
      } catch (e) {
        // fallback: separa por quebra de linha / vírgula / ponto-e-vírgula
        contactsRaw = String(contactsField)
          .split(/[\n,;]+/)
          .map(s => s.trim())
          .filter(Boolean);
      }

      if (!Array.isArray(contactsRaw) || !contactsRaw.length) {
        return res.status(400).json({
          ok: false,
          error: 'Nenhum contato válido informado.'
        });
      }

      const client = await getClient().catch((err) => {
        throw new Error('WhatsApp não está conectado: ' + (err?.message || err));
      });

      // monta MessageMedia a partir do arquivo salvo pelo multer
      const filePath = file.path; // exemplo: MEDIA_DIR/xxxxx.jpg
      const mimeType = file.mimetype || 'application/octet-stream';
      const originalName = file.originalname || 'arquivo';

      const buffer = fs.readFileSync(filePath);
      const base64 = buffer.toString('base64');

      const media = new MessageMedia(mimeType, base64, originalName);

      const results = [];
      let success = 0;
      let failed = 0;
      const invalidContacts = [];

      const usedCaption =
        (caption && caption.trim()) ||
        (text && text.trim()) ||
        '';

      for (const raw of contactsRaw) {
        const resolved = await resolveChatIdForSend(client, raw);

        if (!resolved.ok) {
          invalidContacts.push(raw);
          results.push({
            raw,
            chatId: resolved.chatId,
            ok: false,
            error: resolved.error
          });
          failed++;
          continue;
        }

        try {
          await client.sendMessage(resolved.chatId, media, {
            caption: usedCaption || undefined
          });
          results.push({ raw, chatId: resolved.chatId, ok: true });
          success++;
        } catch (e) {
          console.error('[send-bulk-upload] erro ao enviar para', resolved.chatId, e);
          results.push({
            raw,
            chatId: resolved.chatId,
            ok: false,
            error: e?.message || String(e)
          });
          failed++;
        }
      }

      return res.json({
        ok: true,
        count: contactsRaw.length,
        success,
        failed,
        invalidContacts,
        results
      });
    } catch (err) {
      console.error('/send-bulk-upload error', err);
      return res
        .status(500)
        .json({ ok: false, error: err?.message || 'internal error' });
    }
  });

  // === GRUPOS DE CONTATOS ===
  // Cria/atualiza grupo de contatos por label
  app.post('/contact-groups', async (req, res) => {
    try {
      if (TOKEN && req.headers['x-token'] !== TOKEN) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
      }

      if (!hasRuntimeConfig() || !mongoDb) {
        return res.status(400).json({
          ok: false,
          error: 'Escaneie o QR Code na aba INICIAR para efetuar disparos em massa.'
        });
      }

      const { label, contacts } = req.body || {};
      const lbl = String(label || '').trim();

      if (!lbl) {
        return res.status(400).json({
          ok: false,
          error: 'Campo "label" é obrigatório.'
        });
      }

      if (!Array.isArray(contacts) || !contacts.length) {
        return res.status(400).json({
          ok: false,
          error: 'Campo "contacts" (array) é obrigatório.'
        });
      }

      const normalizedContacts = [];
      const invalidContacts = [];

      for (const item of contacts) {
        if (!item) continue;

        let name;
        let phoneRaw;

        if (typeof item === 'string') {
          // permite só número sem nome
          name = '';
          phoneRaw = item;
        } else {
          name = String(item.name || '').trim();
          phoneRaw = item.phone || item.number || item.msisdn || '';
        }

        const chatId = normalizeToChatIdOutbound(phoneRaw);
        if (!chatId) {
          invalidContacts.push({
            name: name || null,
            phone: phoneRaw || ''
          });
          continue;
        }

        normalizedContacts.push({
          name: name || null,
          phone: phoneRaw,
          chatId
        });
      }

      if (!normalizedContacts.length) {
        return res.status(400).json({
          ok: false,
          error: 'Nenhum contato válido após normalização.',
          invalidContacts
        });
      }

      const col = await getContactGroupsCollection();
      const now = new Date();

      const baseDoc = {
        label: lbl,
        contacts: normalizedContacts,
        updatedAt: now
      };

      const existing = await col.findOne({ label: lbl });

      let groupDoc;
      if (existing) {
        await col.updateOne(
          { _id: existing._id },
          { $set: baseDoc }
        );
        groupDoc = await col.findOne({ _id: existing._id });
      } else {
        baseDoc.createdAt = now;
        const ins = await col.insertOne(baseDoc);
        groupDoc = await col.findOne({ _id: ins.insertedId });
      }

      return res.json({
        ok: true,
        group: groupDoc,
        invalidContacts
      });
    } catch (err) {
      console.error('/contact-groups POST error', err);
      return res
        .status(500)
        .json({ ok: false, error: err?.message || 'internal error' });
    }
  });
  // Lista grupos de contatos ou filtra por label (?label=...)
  app.get('/contact-groups', async (req, res) => {
    try {
      if (TOKEN && req.headers['x-token'] !== TOKEN) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
      }

      if (!hasRuntimeConfig() || !mongoDb) {
        return res.status(400).json({
          ok: false,
          error: 'Sessão ainda não configurada. Use /start-session no painel.'
        });
      }

      const { label } = req.query || {};
      const col = await getContactGroupsCollection();

      const filter = label
        ? { label: String(label) }
        : {};

      const groups = await col
        .find(filter)
        .sort({ label: 1 })
        .toArray();

      return res.json({
        ok: true,
        groups
      });
    } catch (err) {
      console.error('/contact-groups GET error', err);
      return res
        .status(500)
        .json({ ok: false, error: err?.message || 'internal error' });
    }
  });

})();
