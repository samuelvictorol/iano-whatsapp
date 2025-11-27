// src/config/runtime-config.js
// Configuração dinâmica em memória, populada via /start-session

let runtimeConfig = null;

/**
 * Estrutura esperada:
 * {
 *   mongo:  { uri, dbName, colName },
 *   openai: { apiKey, model, temperature, maxTokens, transcribeModel },
 *   ai: {
 *     IA_CONTEXT_MAX_MINUTES,
 *     HUMAN_HOLD_MS,
 *     AI_CONTEXT,
 *     AI_RULES,
 *     AI_METADATA,
 *     BOT_NAME,
 *     dataItems: [...],
 *
 *     // opcionais para VISÃO (interpretação de imagens)
 *     AI_VISION_CONTEXT,
 *     AI_VISION_RULES,
 *     AI_VISION_METADATA,
 *     AI_VISION_MODE
 *   }
 * }
 */
function setRuntimeConfig (cfg) {
  runtimeConfig = cfg || null;
}

function getRuntimeConfig () {
  if (!runtimeConfig) {
    throw new Error('RUNTIME_CONFIG_NOT_SET');
  }
  return runtimeConfig;
}

function hasRuntimeConfig () {
  return !!runtimeConfig;
}

module.exports = {
  setRuntimeConfig,
  getRuntimeConfig,
  hasRuntimeConfig
};
