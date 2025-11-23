// src/utils/context.js
const { getRuntimeConfig, hasRuntimeConfig } = require('../config/runtime-config');

function getMaxAgeMs() {
  let minutes = 5;

  try {
    if (hasRuntimeConfig()) {
      const cfg = getRuntimeConfig();
      minutes = Number(cfg.ai?.IA_CONTEXT_MAX_MINUTES ?? 5);
    }
  } catch {
    // mantém default
  }

  if (!Number.isFinite(minutes) || minutes <= 0) {
    minutes = 5;
  }

  return Math.max(1, minutes) * 60 * 1000;
}

/**
 * Retorna o contexto recente para a IA, ignorando mensagens mais antigas do que MAX_AGE_MS.
 * Limita a 6 mensagens para manter o prompt enxuto.
 */
async function getRecentContext(mongoCol, chatId) {
  const MAX_AGE_MS = getMaxAgeMs();
  const since = Date.now() - MAX_AGE_MS;

  const rows = await mongoCol
    .find({
      chatId,
      body: { $nin: [null, ''] },
      timestamp: { $gte: since }
    })
    .project({ body: 1, fromMe: 1, timestamp: 1 })
    .sort({ timestamp: -1 })
    .limit(6)
    .toArray();

  const filtered = rows.filter((r) => Number(r.timestamp) >= since);

  return filtered.reverse().map((r) => ({
    fromMe: !!r.fromMe,
    body: String(r.body).slice(0, 2000),
    timestamp: Number(r.timestamp)
  }));
}

module.exports = { getRecentContext };
