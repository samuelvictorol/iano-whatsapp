// src/services/openai-client.js
const OpenAI = require('openai');
const { getRuntimeConfig } = require('../config/runtime-config');

let cachedClient = null;
let cachedApiKey = null;

function getOpenAIClient() {
  const cfg = getRuntimeConfig();
  const apiKey = cfg.openai && cfg.openai.apiKey;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY não configurada. Inicie a sessão pelo painel.');
  }

  if (cachedClient && cachedApiKey === apiKey) {
    return cachedClient;
  }

  cachedApiKey = apiKey;
  cachedClient = new OpenAI({ apiKey });

  return cachedClient;
}

module.exports = { getOpenAIClient };
