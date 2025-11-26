// src/services/ai.js
const { getRuntimeConfig, hasRuntimeConfig } = require('../config/runtime-config');
const { getOpenAIClient } = require('./openai-client');
// 👇 novo: serviço que grava uso de tokens no Mongo
const { logTokenUsage } = require('./token-usage');

const OPENAI_TIMEOUT_MS = 20000; // 20s

function buildJsonSchema() {
  return {
    name: 'sdr_response',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        intencao: { type: 'string' },          // livre, não mais enum fixo
        perfil_cliente: { type: 'string' },    // livre
        ia_reply_messages: {
          type: 'array',
          minItems: 1,
          maxItems: 3,
          items: { type: 'string' }
        }
      },
      required: ['intencao', 'ia_reply_messages']
    }
  };
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getBotName() {
  try {
    const cfg = getRuntimeConfig();
    const name = cfg.ai && cfg.ai.BOT_NAME;
    return (name && String(name).trim()) || 'IANO Bot';
  } catch {
    return 'IANO Bot';
  }
}

function buildBotRegex(botName) {
  const BASE_BOT = String(botName || '').replace(/\s*Bot\b/i, '').trim();
  return new RegExp(
    '^\\s*(\\*|_)?\\[?(?:' +
      escapeRegExp(botName) + '|' +
      escapeRegExp(BASE_BOT) + '|' +
      escapeRegExp(BASE_BOT + ' IA') +
      ')\\]?\\1?\\s*[:\\-]?\\s',
    'i'
  );
}

let cachedBotName = null;
let cachedBotRegex = null;

function getBotRegex() {
  const name = getBotName();
  if (!cachedBotRegex || cachedBotName !== name) {
    cachedBotName = name;
    cachedBotRegex = buildBotRegex(name);
  }
  return cachedBotRegex;
}

function isBotText(text = '') {
  return getBotRegex().test(String(text));
}

function botPrefix(line) {
  const t = String(line || '');
  if (isBotText(t)) return t;
  return `*${getBotName()}:* ${t}`;
}

function buildSystemPrompt(cfg) {
  const ctx = cfg.ai?.AI_CONTEXT || '';
  const rules = cfg.ai?.AI_RULES || '';
  const metadata = cfg.ai?.AI_METADATA || '';
  const dataItems = Array.isArray(cfg.ai?.dataItems) ? cfg.ai.dataItems : [];

  let catalogSection = '';
  if (dataItems.length) {
    const mapped = dataItems
      .map((item, idx) => {
        const title = item.title || 'Sem título';
        const cat = item.category || '';
        const price = item.price != null ? `Preço: R$ ${item.price}` : '';
        const promo = item.promoPrice != null ? `Promo: R$ ${item.promoPrice}` : '';
        const desc = item.description || '';
        const line1 =
          `(${idx + 1}) ${title}` +
          (cat ? ` [${cat}]` : '') +
          (price || promo ? ` — ${[price, promo].filter(Boolean).join(' | ')}` : '');
        const line2 = desc ? `\n    ${desc}` : '';
        return line1 + line2;
      })
      .join('\n');

    catalogSection =
      '\n[CATÁLOGO DE ITENS]\n' +
      mapped +
      '\nVocê pode usar esses itens para responder dúvidas e sugerir opções, mas não invente produtos que não estejam na lista.';
  }

  return [
    `Você é um agente de vendas SDR que atende clientes via WhatsApp. As vezes o cliente pode enviar 2 mensagens seguidas, analise se realmente a segunda deverá ser respondida (pode ser uma correção de palavra do usuário ou um '?' que faltou na pergunta por exemplo), nesses casos não precisa de reply, retorne vazio. *Não fique saudando o cliente todo momento, apenas se a mensagem mais recente do cliente conter uma saudação, caso contrário seja objetivo.*`,
    ctx ? '\n[CONTEXTO / PAPEL]\n' + ctx : '',
    rules ? '\n[REGRAS ESPECÍFICAS]\n' + rules : '',
    metadata ? '\n[INFORMAÇÕES ADICIONAIS]\n' + metadata : '',
    catalogSection,
    '\nSua resposta DEVE ser apenas um JSON válido, seguindo exatamente o schema fornecido pelo sistema.'
  ]
    .join('\n')
    .trim();
}

async function callAI({ chatId, text, context_messages }) {
  if (!hasRuntimeConfig()) {
    throw new Error('Configuração da IA não inicializada. Inicie a sessão pelo painel.');
  }

  const cfg = getRuntimeConfig();
  const openai = getOpenAIClient();

  const systemPrompt = buildSystemPrompt(cfg);
  const userPayload = {
    chat_id: chatId,
    text: String(text || ''),
    context_messages: context_messages || []
  };

  const model = cfg.openai?.model || 'gpt-4.1-mini';
  const temperature = Number(
    cfg.openai?.temperature !== undefined ? cfg.openai.temperature : 0.8
  );
  const maxTokens = Number(
    cfg.openai?.maxTokens !== undefined ? cfg.openai.maxTokens : 900
  );

  const aiPromise = openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(userPayload) }
    ],
    temperature,
    max_tokens: maxTokens,
    response_format: {
      type: 'json_schema',
      json_schema: buildJsonSchema()
    }
  });

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('OPENAI_TIMEOUT')), OPENAI_TIMEOUT_MS);
  });

  let resp;
  try {
    // se der timeout, esse await lança erro e é tratado lá no server.js
    resp = await Promise.race([aiPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
    aiPromise.catch(() => {}); // evita unhandled rejection se a corrida já tiver resolvido
  }

  // 👇 LOG DE TOKENS DA OPENAI (se a resposta veio OK)
  try {
    const usage = resp?.usage;
    if (usage) {
      await logTokenUsage({
        model,
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        chatId
      });
    }
  } catch (e) {
    console.error('[TOKEN_USAGE] falha ao logar uso:', e?.message || e);
  }

  const raw = resp?.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {
      intencao: 'informacoes_loja',
      ia_reply_messages: ['Não consegui entender, pode repetir?']
    };
  }

  if (!Array.isArray(parsed.ia_reply_messages) || !parsed.ia_reply_messages.length) {
    parsed.ia_reply_messages = ['Não consegui entender, pode repetir?'];
  }

  if (!parsed.intencao) {
    parsed.intencao = 'informacoes_loja';
  }

  return parsed;
}

module.exports = {
  callAI,
  botPrefix,
  isBotText
};
