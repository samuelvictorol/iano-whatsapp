// src/services/token-usage.js
const { MongoClient } = require('mongodb');
const { getRuntimeConfig, hasRuntimeConfig } = require('../config/runtime-config');

let client = null;
let db = null;
let col = null;

// Tabela aproximada de preços por 1k tokens (USD)
const PRICE_TABLE = {
  'gpt-4.1-mini': { in: 0.0007, out: 0.0028 },
  'gpt-4.1': { in: 0.0025, out: 0.01 },
  'gpt-4o-mini': { in: 0.0005, out: 0.002 },
  'gpt-4o': { in: 0.0025, out: 0.01 },
  'gpt-3.5-turbo': { in: 0.0005, out: 0.0015 },
  default: { in: 0.0007, out: 0.0028 }
};

async function getCollection () {
  if (!hasRuntimeConfig()) {
    throw new Error('Runtime config ainda não foi inicializado.');
  }

  const cfg = getRuntimeConfig();
  const uri = cfg.mongo?.uri;
  const dbName = cfg.mongo?.dbName || 'iano_whatsapp';

  if (!uri) {
    throw new Error('mongo.uri não definido no runtimeConfig.');
  }

  if (!client) {
    client = await MongoClient.connect(uri, { ignoreUndefined: true });
    db = client.db(dbName);
    col = db.collection('token_usage');

    await col.createIndex({ dateStr: 1 });
    await col.createIndex({ createdAt: 1 });
    await col.createIndex({ model: 1 });
  }

  return col;
}

function estimateCostUsd (model, promptTokens, completionTokens) {
  const prices = PRICE_TABLE[model] || PRICE_TABLE.default;
  const inCost = (promptTokens / 1000) * prices.in;
  const outCost = (completionTokens / 1000) * prices.out;
  return inCost + outCost;
}

/**
 * Loga um uso de tokens da OpenAI (somente API da OpenAI, nada de Mongo DB)
 * payload: { model, promptTokens, completionTokens, totalTokens, chatId }
 */
async function logTokenUsage (payload) {
  try {
    if (!payload) return;
    const { model, promptTokens = 0, completionTokens = 0, totalTokens = 0, chatId } = payload;

    const col = await getCollection();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // ex.: 2025-11-24
    const costUsd = estimateCostUsd(model || 'default', promptTokens, completionTokens);

    const doc = {
      chatId: chatId || null,
      model: model || 'unknown',
      promptTokens: Number(promptTokens) || 0,
      completionTokens: Number(completionTokens) || 0,
      totalTokens: Number(totalTokens) || 0,
      costUsd,
      createdAt: now,
      dateStr
    };

    await col.insertOne(doc);
  } catch (err) {
    console.error('[TOKEN_USAGE] erro ao logar tokens da OpenAI:', err?.message || err);
  }
}

/**
 * Retorna resumo de consumo num range (7d, 30d ou month)
 */
async function getTokenUsageSummary ({ range = '7d' } = {}) {
  if (!hasRuntimeConfig()) {
    throw new Error('Nenhuma OpenAi API Key cadastrada.');
  }

  const col = await getCollection();
  const now = new Date();
  let fromDate;

  if (range === 'month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (range === '30d') {
    fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    // default 7 dias
    fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const pipeline = [
    { $match: { createdAt: { $gte: fromDate } } },
    {
      $group: {
        _id: '$dateStr',
        tokens: { $sum: '$totalTokens' },
        usd: { $sum: '$costUsd' }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const agg = await col.aggregate(pipeline).toArray();

  const daily = agg.map(row => ({
    date: row._id,
    tokens: row.tokens || 0,
    usd: row.usd || 0
  }));

  const totalTokens = daily.reduce((acc, d) => acc + (d.tokens || 0), 0);
  const spentUsd = daily.reduce((acc, d) => acc + (d.usd || 0), 0);
  const avgCostPer1kTokens = totalTokens > 0
    ? spentUsd / (totalTokens / 1000)
    : 0;

  return {
    daily,
    summary: {
      totalTokensThisRange: totalTokens,
      spentUsdThisRange: spentUsd,
      avgCostPer1kTokens
    }
  };
}

module.exports = {
  logTokenUsage,
  getTokenUsageSummary
};
