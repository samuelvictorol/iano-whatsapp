// src/services/transcribe.js
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TRANSCRIBE_MODEL = process.env.TRANSCRIBE_MODEL || 'whisper-1';

/** Transcreve arquivo de áudio local. Retorna texto ou null. */
async function transcribeAudioLocal(filePath, mimetype = '') {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const fileStream = fs.createReadStream(path.resolve(filePath));
    const resp = await openai.audio.transcriptions.create({ file: fileStream, model: TRANSCRIBE_MODEL });
    const text = resp?.text || null;
    return text && String(text).trim() ? String(text).trim() : null;
  } catch (err) {
    console.error('[TRANSCRIBE] error:', err?.message || err);
    return null;
  }
}
module.exports = { transcribeAudioLocal };
