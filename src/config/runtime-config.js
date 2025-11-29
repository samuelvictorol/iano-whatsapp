// config/runtime-config.js
let runtimeConfig = null;

function initRuntimeConfig (cfg) {
  // sobrescreve tudo (usado no /start-session)
  runtimeConfig = { ...(cfg || {}) };
}

function mergeRuntimeConfig (partial) {
  // atualiza só partes (usado no /config/ai)
  if (!runtimeConfig) {
    runtimeConfig = {};
  }

  runtimeConfig = {
    ...runtimeConfig,
    ...partial,
    ai: {
      ...(runtimeConfig.ai || {}),
      ...(partial.ai || {})
    },
    openai: {
      ...(runtimeConfig.openai || {}),
      ...(partial.openai || {})
    }
  };
}

function getRuntimeConfig () {
  if (!runtimeConfig) {
    throw new Error('Runtime config ainda não inicializada');
  }
  return runtimeConfig;
}

function hasRuntimeConfig () {
  return !!runtimeConfig;
}

module.exports = {
  initRuntimeConfig,
  mergeRuntimeConfig,
  getRuntimeConfig,
  hasRuntimeConfig
};
