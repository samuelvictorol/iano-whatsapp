// src/utils/context.js
const MAX_MIN = Math.max(1, Number(process.env.IA_CONTEXT_MAX_MINUTES || 5));
const MAX_AGE_MS = MAX_MIN * 60 * 1000;

/**
 * Retorna o contexto recente para a IA, ignorando mensagens mais antigas do que MAX_AGE_MS.
 * Limita a 6 mensagens para manter o prompt enxuto.
 */
async function getRecentContext(mongoCol, chatId) {
  const since = Date.now() - MAX_AGE_MS;
  const rows = await mongoCol
    .find({ chatId, body: { $nin: [null, ''] }, timestamp: { $gte: since } })
    .project({ body: 1, fromMe: 1, timestamp: 1 })
    .sort({ timestamp: -1 })
    .limit(6)
    .toArray();

  // Double-check em memória (proteção caso o relógio do servidor/DB varie)
  const filtered = rows.filter(r => Number(r.timestamp) >= since);

  return filtered.reverse().map((r) => ({
    fromMe: !!r.fromMe,
    body: String(r.body).slice(0, 2000),
    timestamp: Number(r.timestamp),
  }));
}
module.exports = { getRecentContext };
