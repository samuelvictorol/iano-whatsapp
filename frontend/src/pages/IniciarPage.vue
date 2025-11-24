<!-- IniciarPage -->
<template>
  <q-page class="ia-page bg-primary">
    <div class="ia-root">
      <!-- CONTEÚDO PRINCIPAL -->
      <main class="ia-main">
        <!-- COL ESQUERDA: QR + LOGS -->
        <div class="ia-col-left">
          <div class="card">
            <div class="row" style="margin-bottom: 16px;">
              <strong>QR Code</strong>
              <div class="row" style="gap: 8px;">
                <!-- <span class="mono">{{ qrStatus }}</span> -->
                <q-btn
                  dense
                  flat
                  size="sm"
                  icon="play_arrow"
                  label="Iniciar sessão"
                  :loading="startLoading"
                  @click="startSessionFromStorage"
                />
                <q-btn
                  dense
                  flat
                  size="sm"
                  icon="refresh"
                  label="Resetar sessão"
                  :loading="resetLoading"
                  @click="resetSession"
                />
              </div>
            </div>
            <div id="qr">
              <img v-if="qrImgSrc" :src="qrImgSrc" alt="QR" />
            </div>
            <div
              v-if="resetMessage"
              class="mono"
              style="margin-top: 8px; font-size: 11px; opacity: .8;"
            >
              {{ resetMessage }}
            </div>
          </div>
          <div class="card">
            <div class="row" style="margin-bottom: 16px;">
              <strong>Chats</strong>
            </div>
            <div id="grid" class="grid">
              <div
                v-for="chat in chats"
                :key="chat.chatId"
                class="card"
              >
                <div class="row">
                  <div
                    class="mono"
                    :title="`${chat.title || chat.chatId} (${chat.chatId})`"
                  >
                    {{ chat.title || chat.chatId }}
                  </div>
                  <div :class="badgeClass(chat)">
                    {{ badgeLabel(chat) }}
                  </div>
                </div>
                <div class="row" style="margin-top: 8px;">
                  <div>IA retoma em:</div>
                  <div class="timer">
                    {{ formatEta(chat.remainingMs) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- COL DIREITA: CHATS -->
        <div class="ia-col-right">
           <div class="card">
            <div class="row no-wrap justify-between" style="margin-bottom: 16px;">
              <strong>Logs</strong>
            </div>
            <div id="logs" ref="logsEl">
              <div
                v-for="(log, index) in logs"
                :key="index"
                class="line"
              >
                <span class="ts">[{{ formatTime(log.ts) }}]</span>
                <span>{{ log.msg }}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <div class="w100 q-py-lg"></div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useQuasar } from 'quasar';
import { api } from 'boot/axios';

const $q = useQuasar();

const STORAGE_KEYS = {
  openai: 'config_openai',
  ai: 'config_ai_settings',
  data: 'config_ai_data_items'
};

// BASE_URL vindo do axios do boot
const BASE_URL = (api.defaults.baseURL || 'http://localhost:10000').replace(/\/+$/, '');

// QR
const qrImgSrc = ref('');
const qrStatus = ref('aguardando…');
const resetLoading = ref(false);
const resetMessage = ref('');
const startLoading = ref(false);

// Logs
const logs = ref([]); // { ts, msg }
const logsEl = ref(null);

// Chats
const chats = ref([]); // { chatId, title, aiInControl, holdUntil, remainingMs }

let eventSource = null;
let timerId = null;

function upsertChat (payload = {}) {
  const { chatId } = payload;
  if (!chatId) return;

  const displayTitle = payload.title || chatId;
  const holdUntil = typeof payload.holdUntil === 'number' ? payload.holdUntil : 0;
  const aiInControl = typeof payload.aiInControl === 'boolean' ? payload.aiInControl : false;

  const now = Date.now();
  const remainingMs = Math.max(0, holdUntil - now);

  const idx = chats.value.findIndex(c => c.chatId === chatId);
  const base = idx === -1 ? {} : chats.value[idx];

  const updated = {
    chatId,
    title: displayTitle || base.title || chatId,
    holdUntil: holdUntil || base.holdUntil || 0,
    aiInControl: aiInControl ?? base.aiInControl ?? false,
    remainingMs
  };

  if (idx === -1) {
    chats.value.unshift(updated);
  } else {
    chats.value.splice(idx, 1, updated);
  }
}

function addLog (ts, msg) {
  const tsVal = ts || Date.now();
  logs.value.push({
    ts: tsVal,
    msg: String(msg ?? '')
  });
}

function formatEta (ms) {
  if (!ms || ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function formatTime (ts) {
  const dt = new Date(ts);
  return dt.toLocaleTimeString();
}

function isAiOn (chat) {
  return (chat.remainingMs ?? 0) <= 0 || !!chat.aiInControl;
}

function badgeClass (chat) {
  return 'badge ' + (isAiOn(chat) ? 'on' : 'off');
}

function badgeLabel (chat) {
  return isAiOn(chat) ? 'IA ON' : 'IA OFF';
}

// Resetar sessão (apaga data/wwebjs + data/media no backend)
async function resetSession () {
  try {
    resetLoading.value = true;
    resetMessage.value = '';
    qrImgSrc.value = '';
    qrStatus.value = 'reiniciando sessão...';

    const { data } = await api.post('/reset-session');
    if (!data?.ok) {
      throw new Error(data?.error || 'Erro ao resetar sessão.');
    }

    resetMessage.value = 'Sessão reiniciada. Aguarde aparecer um novo QR Code.';
    qrStatus.value = 'aguardando novo QR...';
  } catch (err) {
    console.error('Erro ao resetar sessão', err);
    resetMessage.value = 'Erro ao resetar sessão. Verifique os logs.';
    qrStatus.value = 'erro ao resetar';
  } finally {
    resetLoading.value = false;
  }
}

// Iniciar sessão usando configs salvas no localStorage (mesmo formato do /start-session do backend)
async function startSessionFromStorage () {
  try {
    startLoading.value = true;

    const rawOpenai = localStorage.getItem(STORAGE_KEYS.openai);
    if (!rawOpenai) {
      $q.notify({
        type: 'warning',
        message: 'Configure OpenAI e Mongo na tela de Configurações antes de iniciar a sessão.'
      });
      return;
    }

    const openaiConf = JSON.parse(rawOpenai);
    const mongoUri = (openaiConf.MONGO_CONNECTION_STRING || '').trim();
    const apiKey = (openaiConf.OPENAI_API_KEY || '').trim();
    const model = openaiConf.OPENAI_CHAT_MODEL || 'gpt-4.1-mini';
    const temperature = openaiConf.OPENAI_TEMPERATURE ?? 0.8;
    const maxTokens = openaiConf.OPENAI_MAX_TOKENS ?? 900;
    const transcribeModel = openaiConf.TRANSCRIBE_MODEL || 'whisper-1';

    if (!mongoUri || !apiKey) {
      $q.notify({
        type: 'warning',
        message: 'Falta informar Mongo ou OPENAI_API_KEY nas Configurações.'
      });
      return;
    }

    // AI config
    let aiConf = {
      IA_CONTEXT_MAX_MINUTES: 5,
      HUMAN_HOLD_MS: 300000,
      AI_CONTEXT: '',
      AI_RULES: '',
      AI_METADATA: '',
      BOT_NAME: 'IANO Bot'
    };

    const rawAI = localStorage.getItem(STORAGE_KEYS.ai);
    if (rawAI) {
      const parsed = JSON.parse(rawAI);
      aiConf = {
        IA_CONTEXT_MAX_MINUTES: parsed.IA_CONTEXT_MAX_MINUTES ?? 5,
        HUMAN_HOLD_MS: parsed.HUMAN_HOLD_MS ?? 300000,
        AI_CONTEXT: parsed.AI_CONTEXT || '',
        AI_RULES: parsed.AI_RULES || '',
        AI_METADATA: parsed.AI_METADATA || '',
        BOT_NAME: parsed.BOT_NAME || 'IANO Bot'
      };
    }

    // Data items (catálogo)
    let dataItems = [];
    const rawData = localStorage.getItem(STORAGE_KEYS.data);
    if (rawData) {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed)) {
        dataItems = parsed;
      }
    }

    const payload = {
      mongoUri,
      openai: {
        OPENAI_API_KEY: apiKey,
        OPENAI_CHAT_MODEL: model,
        OPENAI_TEMPERATURE: temperature,
        OPENAI_MAX_TOKENS: maxTokens,
        TRANSCRIBE_MODEL: transcribeModel
      },
      ai: {
        ...aiConf,
        dataItems
      }
    };

    const { data } = await api.post('/start-session', payload);
    if (!data?.ok) {
      throw new Error(data?.error || 'Erro ao iniciar sessão.');
    }

    $q.notify({
      type: 'positive',
      message: 'Sessão iniciada/reconfigurada! Escaneie o QR quando aparecer.'
    });

    qrStatus.value = 'aguardando QR...';
    resetMessage.value = '';
  } catch (err) {
    console.error('Erro ao iniciar sessão', err);
    $q.notify({
      type: 'negative',
      message: 'Erro ao iniciar sessão: ' + (err?.message || 'verifique o backend.')
    });
  } finally {
    startLoading.value = false;
  }
}

onMounted(() => {
  // Scroll automático dos logs
  watch(
    logs,
    () => {
      nextTick(() => {
        if (logsEl.value) {
          logsEl.value.scrollTop = logsEl.value.scrollHeight;
        }
      });
    },
    { deep: true }
  );

  // SSE no backend
  eventSource = new EventSource(`${BASE_URL}/events`);
  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);

      if (data?.type === 'status' && Array.isArray(data.items)) {
        data.items.forEach(upsertChat);
      }

      if (data?.type === 'status_one' && data.item) {
        upsertChat(data.item);
      }

      if (data?.type === 'qr' && data.dataUrl) {
        qrImgSrc.value = data.dataUrl;
        qrStatus.value = 'escaneie com o WhatsApp';
      }

      if (data?.type === 'logs' && Array.isArray(data.items)) {
        data.items.forEach(it => addLog(it.ts, it.msg));
      }

      if (data?.type === 'log' && data.item) {
        addLog(data.item.ts, data.item.msg);
      }
    } catch (err) {
      console.error('Erro ao processar evento SSE', err);
    }
  };

  // Timer para atualizar contagem regressiva (takeover / IA ON/OFF)
  timerId = window.setInterval(() => {
    const now = Date.now();
    chats.value = chats.value.map(chat => ({
      ...chat,
      remainingMs: Math.max(0, (chat.holdUntil || 0) - now)
    }));
  }, 1000);
});

onBeforeUnmount(() => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
});
</script>

<style scoped>
.ia-page {
  padding: 0;
}
.ia-root {
  --fg: #e8eef6;
  --muted: #99a7b6;
  --card: #161717;
  --border: rgba(199, 199, 199, 0.507);
  --ok: #7af59b;
  --bad: #ff7b7b;
  --accent: rgba(122, 245, 155, .18);

  color: var(--fg);
  min-height: 100%;
  padding: 12px;
  box-sizing: border-box;
}

.ia-root *,.ia-root *::before,.ia-root *::after {
  box-sizing: border-box;
}

.ia-main {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 12px;
}

.ia-col-left,
.ia-col-right {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ia-col-left {
  width: 380px;
}

.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 10px 10px rgba(0, 0, 0, 0.635);
  padding: 12px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
}

.badge.on {
  background: var(--accent);
  color: var(--ok);
  border: 1px solid rgba(122, 245, 155, .35);
}

.badge.off {
  background: rgba(255, 123, 123, .18);
  color: var(--bad);
  border: 1px solid rgba(255, 123, 123, .35);
}

.timer {
  font-variant-numeric: tabular-nums;
  opacity: .9;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  opacity: .85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 65%;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

#qr {
  width: 100%;
  aspect-ratio: 1/1;
  background: #0a0f13;
  border: 1px dashed var(--border);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

#qr img {
  max-width: 100%;
  max-height: 100%;
}

#logs {
  height: 300px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  background: #0a0f13;
  border-radius: 8px;
  padding: 8px;
  border: 1px solid var(--border);
}

#logs .line {
  white-space: pre-wrap;
  color: #cfe3ff;
  margin: 2px 0;
}

#logs .ts {
  color: #86a2c6;
  margin-right: 6px;
}

@media (max-width: 900px) {
  .ia-main {
    grid-template-columns: 1fr;
  }
  .ia-col-left {
    width: 100%;
  }
}
</style>
