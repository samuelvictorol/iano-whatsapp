<template>
  <q-page class="ia-page">
    <div class="ia-root">
      <!-- CONTEÚDO PRINCIPAL -->
      <main class="ia-main">
        <!-- COL ESQUERDA: QR + LOGS -->
        <div class="ia-col-left">
          <div class="card">
            <div class="row" style="margin-bottom: 16px;">
              <strong>QR Code</strong>
              <span class="mono">{{ qrStatus }}</span>
            </div>
            <div id="qr">
              <img v-if="qrImgSrc" :src="qrImgSrc" alt="QR" />
            </div>
          </div>

          <div class="card">
            <div class="row" style="margin-bottom: 16px;">
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

        <!-- COL DIREITA: CHATS -->
        <div class="ia-col-right">
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
      </main>
      <div class="w100 q-py-lg"></div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';

const BASE_URL = 'http://localhost:10000';

// QR
const qrImgSrc = ref('');
const qrStatus = ref('aguardando…');

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
    // equivalente ao grid.prepend
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

  // SSE no backend em localhost:10000
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

  // Timer para atualizar contagem regressiva
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
/* ROOT DA PÁGINA (dentro do layout do Quasar) */
.ia-root {
  --bg: #020617;
  --fg: #e8eef6;
  --muted: #99a7b6;
  --card: rgba(255, 255, 255, .06);
  --border: rgba(255, 255, 255, .08);
  --ok: #7af59b;
  --bad: #ff7b7b;
  --accent: rgba(122, 245, 155, .18);

  background: var(--bg);
  color: var(--fg);
  min-height: 100%;
  padding: 12px;
  box-sizing: border-box;
}

.ia-root *,
.ia-root *::before,
.ia-root *::after {
  box-sizing: border-box;
}

/* TÍTULO SUPERIOR DA PÁGINA */
.ia-page-header {
  margin-bottom: 12px;
}

.ia-page-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ia-page-title-row h2 {
  margin: 0;
}

/* GRID PRINCIPAL */
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

/* CARDS, ROWS, BADGES */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
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

/* GRID DE CHATS */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

/* QR */
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

/* LOGS */
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

/* RESPONSIVO */
@media (max-width: 900px) {
  .ia-main {
    grid-template-columns: 1fr;
  }

  .ia-col-left {
    width: 100%;
  }
}
</style>
