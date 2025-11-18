// src/services/ai.js
const OpenAI = require('openai');
const { Prompts, intencoes, perfil_cliente } = require('../prompts');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL;
const BOT_NAME = 'Aito Bot';
const OPENAI_TIMEOUT_MS = Number(20000); // 20s

function buildJsonSchema() {
  return {
    name: 'sdr_response',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        intencao: { type: 'string', enum: intencoes },
        perfil_cliente: { type: 'string', enum: perfil_cliente },
        ia_reply_messages: {
          type: 'array',
          minItems: 1,
          maxItems: 3,
          items: { type: 'string' }
        },
      },
      required: ['intencao', 'ia_reply_messages']
    }
  };
}

function escapeRegExp(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
const BASE_BOT = (BOT_NAME).replace(/\s*Bot\b/i, '').trim();
const BOT_RX = new RegExp(
  '^\\s*(\\*|_)?\\[?(?:' +
  escapeRegExp(BOT_NAME) + '|' +
  escapeRegExp(BASE_BOT) + '|' +
  escapeRegExp(BASE_BOT + ' IA') +
  ')\\]?\\1?\\s*[:\\-]?\\s', 'i'
);

function botPrefix(line) {
  const t = String(line || '');
  if (BOT_RX.test(t)) return t;
  return `*${BOT_NAME}:* ${t}`;
}

async function callAI({ chatId, text, context_messages }) {
  const systemPrompt = Prompts.SDR_UNICO();
  const userPayload  = { chat_id: chatId, text: String(text || ''), context_messages: context_messages || [] };

  const aiPromise = openai.chat.completions.create({
    model: OPENAI_CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: JSON.stringify(userPayload) }
    ],
    temperature: 0.8,
    max_tokens: 900,
    response_format: { type: 'json_schema', json_schema: buildJsonSchema() }
  });

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('OPENAI_TIMEOUT')), OPENAI_TIMEOUT_MS);
  });

  let resp;
  try {
    resp = await Promise.race([aiPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
    // evita unhandled rejection quando a corrida vence por timeout
    aiPromise.catch(() => {});
  }

  const raw = resp.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {
      intencao: 'informacoes_loja',
      ia_reply_messages: ['Não consegui entender, pode repetir?'],
    };
  }

  return parsed;
}

module.exports = { callAI, botPrefix, BOT_RX };
