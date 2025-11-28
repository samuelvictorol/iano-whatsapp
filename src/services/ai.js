// src/services/ai.js
const fs = require('fs');
const path = require('path');

const { getRuntimeConfig, hasRuntimeConfig } = require('../config/runtime-config');
const { getOpenAIClient } = require('./openai-client');
// grava uso de tokens (texto + visão) no Mongo
const { logTokenUsage } = require('./token-usage');

const OPENAI_TIMEOUT_MS = 20000; // 20s

/**
 * JSON Schema para a resposta SDR.
 * Agora aceita:
 *  - string simples (mensagem de texto)
 *  - objeto { type: "image", url, caption } para mandar imagem pelo WhatsApp
 */
function buildJsonSchema () {
  return {
    name: 'sdr_response',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        intencao: { type: 'string' },       // livre
        perfil_cliente: { type: 'string' }, // livre, opcional
        ia_reply_messages: {
          type: 'array',
          minItems: 1,
          maxItems: 4,
          items: {
            oneOf: [
              {
                // texto puro
                type: 'string'
              },
              {
                // mensagem de imagem com legenda
                type: 'object',
                additionalProperties: false,
                properties: {
                  type: {
                    type: 'string',
                    enum: ['image']
                  },
                  url: {
                    type: 'string'
                  },
                  caption: {
                    type: 'string'
                  }
                },
                required: ['type', 'url']
              }
            ]
          }
        }
      },
      required: ['intencao', 'ia_reply_messages']
    }
  };
}

function escapeRegExp (s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getBotName () {
  try {
    const cfg = getRuntimeConfig();
    const name = cfg.ai && cfg.ai.BOT_NAME;
    return (name && String(name).trim()) || 'IANO Bot';
  } catch {
    return 'IANO Bot';
  }
}

function buildBotRegex (botName) {
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

function getBotRegex () {
  const name = getBotName();
  if (!cachedBotRegex || cachedBotName !== name) {
    cachedBotName = name;
    cachedBotRegex = buildBotRegex(name);
  }
  return cachedBotRegex;
}

function isBotText (text = '') {
  return getBotRegex().test(String(text));
}

function botPrefix (line) {
  const t = String(line || '');
  if (isBotText(t)) return t;
  return `*${getBotName()}:* ${t}`;
}

/**
 * Prompt para TEXTO (SDR / vendas), usando configs do painel
 * Agora inclui URLs de imagens do catálogo e explica como mandar imagem.
 */
function buildSystemPrompt (cfg) {
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

        // imagens: lista plana de URLs
        let imagesPart = '';
        const images = Array.isArray(item.images)
          ? item.images.map(v => (v || '').trim()).filter(Boolean)
          : [];
        if (images.length) {
          imagesPart =
            '\n    [IMAGENS_URLS]: ' +
            images.join(', ');
        }

        const line1 =
          `(${idx + 1}) ${title}` +
          (cat ? ` [${cat}]` : '') +
          (price || promo ? ` — ${[price, promo].filter(Boolean).join(' | ')}` : '');
        const line2 = desc ? `\n    ${desc}` : '';

        return line1 + line2 + imagesPart;
      })
      .join('\n\n');

    catalogSection =
      '\n[CATÁLOGO DE ITENS]\n' +
      mapped +
      '\n\nREGRAS PARA IMAGENS:\n' +
      '- Se o cliente pedir foto/imagem de um item, procure pelas URLs de imagem na seção [IMAGENS_URLS].\n' +
      '- Use SEMPRE uma URL que realmente esteja listada para aquele item.\n' +
      '- NUNCA invente ou altere URLs de imagem (não crie novos links que não estejam na lista).\n' +
      '- Para mandar uma imagem, você deve criar um item em "ia_reply_messages" com este formato exato:\n' +
      '  { "type": "image", "url": "URL_EXATA_DA_IMAGEM", "caption": "Legenda curta em PT-BR" }.\n' +
      '- Você pode combinar: primeiro uma mensagem de texto explicando, depois um item de imagem com a URL.\n';
  }

  return [
    'Você é um agente de vendas SDR que atende clientes via WhatsApp.',
    'Às vezes o cliente pode enviar 2 mensagens seguidas; analise se a segunda realmente exige resposta (pode ser só correção de palavra ou um "?" esquecido). Nesses casos, você pode responder apenas a última mensagem relevante.',
    'Não fique saudando o cliente o tempo todo. Cumprimente novamente apenas se a mensagem mais recente contiver uma saudação. Caso contrário, seja objetivo.',
    ctx ? '\n[CONTEXTO / PAPEL]\n' + ctx : '',
    rules ? '\n[REGRAS ESPECÍFICAS]\n' + rules : '',
    metadata ? '\n[INFORMAÇÕES ADICIONAIS]\n' + metadata : '',
    catalogSection,
    '\n[FORMATO DA RESPOSTA]\n' +
      '- Sua resposta DEVE ser apenas um JSON válido, seguindo exatamente o schema fornecido pelo sistema.\n' +
      '- "ia_reply_messages" é um array onde cada item pode ser:\n' +
      '  1) Uma string de texto (mensagem normal do WhatsApp).\n' +
      '  2) Um objeto imagem no formato: { "type": "image", "url": "https://...", "caption": "..." }.\n' +
      '- Use imagens SOMENTE com URLs que vierem do catálogo / dataItems. Nunca invente um link novo.'
  ]
    .join('\n')
    .trim();
}

/**
 * Prompt para VISÃO (interpretação de imagem), também usando configs do painel.
 * Usa campos específicos se existirem (AI_VISION_CONTEXT / AI_VISION_RULES / AI_VISION_METADATA),
 * senão cai no AI_CONTEXT / AI_RULES / AI_METADATA padrão.
 */
function buildVisionPrompt (cfg, userInstruction) {
  const ctxVision =
    cfg.ai?.AI_VISION_CONTEXT ||
    cfg.ai?.AI_CONTEXT ||
    '';

  const rulesVision =
    cfg.ai?.AI_VISION_RULES ||
    cfg.ai?.AI_RULES ||
    '';

  const metadataVision =
    cfg.ai?.AI_VISION_METADATA ||
    cfg.ai?.AI_METADATA ||
    '';

  const instr = (userInstruction || '').trim() ||
    'Descreva claramente o que aparece na imagem para ajudar o atendimento via WhatsApp.';

  const lines = [
    'Você é uma IA que interpreta IMAGENS recebidas via WhatsApp.',
    'Responda SEMPRE em português brasileiro, em texto corrido (sem JSON).'
  ];

  if (ctxVision) {
    lines.push('\n[CONTEXTO / PAPEL DA IA]\n' + ctxVision);
  }
  if (rulesVision) {
    lines.push('\n[REGRAS ESPECÍFICAS PARA A VISÃO]\n' + rulesVision);
  }
  if (metadataVision) {
    lines.push('\n[METADADOS / NEGÓCIO]\n' + metadataVision);
  }

  lines.push(
    '\n[INSTRUÇÃO DO USUÁRIO SOBRE A IMAGEM]\n' + instr
  );

  lines.push(
    '\n[ORIENTAÇÕES GERAIS]\n' +
    '- Descreva pessoas, objetos, cenário, cores, emoções aparentes e detalhes relevantes.\n' +
    '- Se houver texto legível na imagem, resuma o conteúdo principal com clareza.\n' +
    '- Se parecer conteúdo sensível, descreva de forma respeitosa e sem detalhes gráficos.\n' +
    '- Seja objetivo, mas sem ser frio; fale como um atendente humano prestando suporte.'
  );

  return lines.join('\n').trim();
}

/**
 * IA de TEXTO (chat SDR)
 */
async function callAI ({ chatId, text, context_messages }) {
  if (!hasRuntimeConfig()) {
    throw new Error('Configuração da IA não inicializada. Inicie a sessão pelo painel.');
  }

  const cfg = getRuntimeConfig();
  const openai = getOpenAIClient();

  const systemPrompt = buildSystemPrompt(cfg);

  // inclui também os dataItems crus no payload do usuário
  const userPayload = {
    chat_id: chatId,
    text: String(text || ''),
    context_messages: context_messages || [],
    dataItems: Array.isArray(cfg.ai?.dataItems) ? cfg.ai.dataItems : []
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
    resp = await Promise.race([aiPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
    aiPromise.catch(() => {}); // evita unhandled rejection se a corrida já tiver resolvido
  }

  // Log de tokens (texto)
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
    console.error('[TOKEN_USAGE] falha ao logar uso (texto):', e?.message || e);
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

  // garante array válido
  if (!Array.isArray(parsed.ia_reply_messages) || !parsed.ia_reply_messages.length) {
    parsed.ia_reply_messages = ['Não consegui entender, pode repetir?'];
  }

  if (!parsed.intencao) {
    parsed.intencao = 'informacoes_loja';
  }

  return parsed;
}

/**
 * IA de VISÃO (interpretação de imagem)
 * payload: { chatId, filePath, mimeType, userText }
 */
async function describeImage ({ chatId, filePath, mimeType, userText }) {
  if (!hasRuntimeConfig()) {
    throw new Error('Configuração da IA não inicializada. Inicie a sessão pelo painel.');
  }

  const cfg = getRuntimeConfig();
  const openai = getOpenAIClient();

  // precisa ser modelo com visão (gpt-4.1, 4.1-mini, 4o, etc.)
  const model = cfg.openai?.model || 'gpt-4.1-mini';
  const temperature = Number(
    cfg.openai?.temperature !== undefined ? cfg.openai.temperature : 0.7
  );
  const maxTokensCfg = Number(
    cfg.openai?.maxTokens !== undefined ? cfg.openai.maxTokens : 400
  );
  const maxTokens = Math.max(200, Math.min(maxTokensCfg, 800)); // limite mais baixo pra visão

  const systemPrompt = buildVisionPrompt(cfg, userText);

  const absPath = path.resolve(filePath);
  const buffer = await fs.promises.readFile(absPath);
  const b64 = buffer.toString('base64');
  const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${b64}`;

  const resp = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userText && userText.trim()
              ? userText.trim()
              : 'Descreva em detalhes o que você vê nesta imagem considerando o contexto de atendimento via WhatsApp.'
          },
          {
            type: 'image_url',
            image_url: { url: dataUrl }
          }
        ]
      }
    ],
    temperature,
    max_tokens: maxTokens
  });

  // Log de tokens (visão)
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
    console.error('[TOKEN_USAGE] falha ao logar uso (visão):', e?.message || e);
  }

  const content = resp?.choices?.[0]?.message?.content?.trim() ||
    'Não consegui analisar a imagem. Pode tentar enviar novamente?';

  return content;
}

module.exports = {
  callAI,
  botPrefix,
  isBotText,
  describeImage
};
