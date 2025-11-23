// src/services/transcribe.js
const fs = require('fs');
const path = require('path');
const { getRuntimeConfig, hasRuntimeConfig } = require('../config/runtime-config');
const { getOpenAIClient } = require('./openai-client');

/**
 * Transcreve arquivo de áudio local via OpenAI.
 * Usa modelo dinâmico da config (openai.transcribeModel).
 * Retorna texto ou null.
 */
async function transcribeAudioLocal(filePath, mimetype = '') {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    if (!hasRuntimeConfig()) return null;

    const cfg = getRuntimeConfig();
    const model = cfg.openai?.transcribeModel || 'whisper-1';
    const openai = getOpenAIClient();

    const fileStream = fs.createReadStream(path.resolve(filePath));

    const resp = await openai.audio.transcriptions.create({
      file: fileStream,
      model
    });

    const text = resp?.text || null;
    return text && String(text).trim() ? String(text).trim() : null;
  } catch (err) {
    console.error('[TRANSCRIBE] error:', err?.message || err);
    return null;
  }
}

module.exports = { transcribeAudioLocal };
