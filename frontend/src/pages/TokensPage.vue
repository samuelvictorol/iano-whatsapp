<template>
  <q-page class="bg-primary q-pa-md">
    <div class="wallet-page">

      <!-- Header -->
      <div class="q-mb-lg">
        <div class="row items-center justify-between q-gutter-sm q-pt-md">
          <div>
            <div class="text-h4 text-grey-2 q-mb-xs">
              Wallet de Tokens
            </div>
            <div class="text-caption text-grey-4">
              Acompanhe o consumo de tokens da sua OpenAI API KEY e o custo aproximado em dólar.
            </div>

            <div class="q-mt-sm text-grey-5">
              <q-badge color="teal-4" text-color="black" class="q-mr-sm">
                Dados mockados
              </q-badge>
              <span class="text-caption">
                Integração real será feita usando a configuração de OpenAI &amp; Mongo.
              </span>
            </div>
          </div>

          <div class="text-center">
            <div class="text-caption text-grey-5">
              Última atualização (mock)
            </div>
            <div class="text-subtitle2 text-grey-2">
              {{ lastUpdatedLabel }}
            </div>
          </div>
        </div>
      </div>

      <!-- Resumo principal -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-4">
          <q-card class="section-card summary-card">
            <q-card-section class="row items-center justify-between">
              <div>
                <div class="text-caption text-grey-4">
                  Saldo estimado (USD)
                </div>
                <div class="text-h5 text-teal-3">
                  {{ formatUsd(summary.availableUsd) }}
                </div>
                <div class="text-caption text-grey-6 q-mt-xs">
                  Baseado no limite mockado de {{ formatUsd(summary.totalCreditUsd) }}.
                </div>
              </div>
              <q-icon name="account_balance_wallet" size="32px" class="text-teal-3" />
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-4">
          <q-card class="section-card summary-card">
            <q-card-section class="row items-center justify-between">
              <div>
                <div class="text-caption text-grey-4">
                  Consumo no mês (USD)
                </div>
                <div class="text-h5 text-amber-3">
                  {{ formatUsd(summary.spentUsdThisMonth) }}
                </div>
                <div class="text-caption text-grey-6 q-mt-xs">
                  {{ formatNumber(summary.totalTokensThisMonth) }} tokens usados.
                </div>
              </div>
              <q-icon name="trending_up" size="32px" class="text-amber-3" />
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-4">
          <q-card class="section-card summary-card">
            <q-card-section class="row items-center justify-between">
              <div>
                <!-- Cores mais claras pra melhorar legibilidade -->
                <div class="text-caption text-grey-3">
                  Custo médio / 1k tokens (USD)
                </div>
                <div class="text-h5 text-teal-2">
                  {{ formatUsd(summary.avgCostPer1kTokens) }}
                </div>
                <div class="text-caption text-grey-4 q-mt-xs">
                  Estimativa baseada no modelo atual.
                </div>
              </div>
              <q-icon name="paid" size="32px" class="text-teal-2" />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Gráfico de consumo -->
      <q-card class="section-card q-mb-md">
        <q-card-section>
          <div class="row items-center justify-between q-mb-sm">
            <div>
              <div class="text-subtitle1 text-grey-2">
                Consumo diário de tokens (últimos 7 dias)
              </div>
              <div class="text-caption text-grey-5">
                Linha representa tokens consumidos por dia. Área mostra a tendência.
              </div>
            </div>
            <q-badge color="teal-4" text-color="black" outline>
              Máx: {{ formatNumber(maxTokensDay) }} tokens/dia
            </q-badge>
          </div>

          <div class="chart-wrapper">
            <svg
              :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
              preserveAspectRatio="none"
              class="chart-svg"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#22c55e" stop-opacity="0.6" />
                  <stop offset="100%" stop-color="#22c55e" stop-opacity="0" />
                </linearGradient>
              </defs>

              <!-- Linha -->
              <polyline
                :points="linePointsAttr"
                fill="none"
                stroke="#22c55e"
                stroke-width="2"
                stroke-linejoin="round"
                stroke-linecap="round"
              />

              <!-- Área -->
              <polygon
                :points="areaPointsAttr"
                fill="url(#areaGradient)"
              />

              <!-- Pontos -->
              <g v-for="(p, idx) in linePoints" :key="idx">
                <circle
                  :cx="p.x"
                  :cy="p.y"
                  r="3"
                  fill="#22c55e"
                />
              </g>
            </svg>
          </div>

          <!-- Legenda dos dias -->
          <div class="row q-col-gutter-xs q-mt-sm">
            <div
              v-for="(day, idx) in dailyUsage"
              :key="day.date"
              class="col-auto"
            >
              <q-chip
                dense
                outline
                color="teal-4"
                text-color="teal-1"
                class="q-mb-xs"
              >
                {{ formatShortDate(day.date) }} • {{ formatNumber(day.tokens) }} tok
              </q-chip>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Tabela de detalhes -->
      <q-card class="section-card">
        <q-card-section>
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-subtitle1 text-grey-2">
              Detalhamento por dia
            </div>
            <q-badge color="grey-9" text-color="grey-2">
              Mês atual (mock)
            </q-badge>
          </div>

          <q-table
            flat
            dense
            :rows="dailyUsage"
            :columns="columns"
            row-key="date"
            hide-bottom
            class="wallet-table"
          >
            <template #body-cell-date="props">
              <q-td :props="props" class="text-dark">
                {{ formatDate(props.row.date) }}
              </q-td>
            </template>

            <template #body-cell-tokens="props">
              <q-td :props="props" class="text-dark">
                {{ formatNumber(props.row.tokens) }}
              </q-td>
            </template>

            <template #body-cell-usd="props">
              <q-td :props="props" class="text-dark">
                {{ formatUsd(props.row.usd) }}
              </q-td>
            </template>

            <template #body-cell-share="props">
              <q-td :props="props" class="text-dark">
                <q-linear-progress
                  :value="props.row.tokens / maxTokensDay"
                  track-color="grey-9"
                  color="teal-4"
                  rounded
                  size="8px"
                />
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>

    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'

const $q = useQuasar()
const router = useRouter()

const STORAGE_KEYS = {
  openai: 'config_openai'
}

// --- BLOQUEIO SEM OPENAI_API_KEY ---
onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.openai)
    if (!raw) {
      notifyAndRedirect()
      return
    }
    const parsed = JSON.parse(raw)
    const hasKey = !!parsed.OPENAI_API_KEY

    if (!hasKey) {
      notifyAndRedirect()
    }
  } catch (e) {
    console.error('Erro ao validar OPENAI_API_KEY para Wallet de tokens', e)
    notifyAndRedirect()
  }
})

function notifyAndRedirect () {
  $q.notify({
    type: 'warning',
    position: 'top',
    icon: 'warning',
    message: 'Configure sua OPENAI API KEY na aba Configurar antes de acessar a Wallet de tokens.'
  })
  router.push('/')
}

// --- DADOS MOCKADOS ---
const dailyUsage = ref([
  { date: '2025-11-18', tokens: 12500, usd: 0.03 },
  { date: '2025-11-19', tokens: 18400, usd: 0.05 },
  { date: '2025-11-20', tokens: 22000, usd: 0.06 },
  { date: '2025-11-21', tokens: 15800, usd: 0.04 },
  { date: '2025-11-22', tokens: 26500, usd: 0.08 },
  { date: '2025-11-23', tokens: 31000, usd: 0.09 },
  { date: '2025-11-24', tokens: 28000, usd: 0.08 }
])

const totalUsdMock = computed(() =>
  dailyUsage.value.reduce((acc, d) => acc + d.usd, 0)
)

const summary = ref({
  totalCreditUsd: 20.00,
  spentUsdThisMonth: totalUsdMock.value,
  availableUsd: 20.00 - totalUsdMock.value,
  totalTokensThisMonth: dailyUsage.value.reduce((acc, d) => acc + d.tokens, 0),
  avgCostPer1kTokens: 0.002 // mock aproximado
})

// --- COLUMNS TABELA ---
const columns = [
  { name: 'date', label: 'Dia', field: 'date', align: 'left' },
  { name: 'tokens', label: 'Tokens', field: 'tokens', align: 'right' },
  { name: 'usd', label: 'Custo (USD)', field: 'usd', align: 'right' },
  { name: 'share', label: '% do pico (tokens)', field: 'tokens', align: 'left' }
]

// --- GRÁFICO (SVG) ---
const chartWidth = 100
const chartHeight = 40
const chartPaddingY = 6 // padding vertical pra nao “colar” topo/fundo

const maxTokensDay = computed(() => {
  if (!dailyUsage.value.length) return 1
  return Math.max(...dailyUsage.value.map(d => d.tokens))
})

const linePoints = computed(() => {
  const max = maxTokensDay.value || 1
  const n = dailyUsage.value.length || 1
  const usableHeight = chartHeight - chartPaddingY * 2

  return dailyUsage.value.map((d, idx) => {
    const x = n === 1 ? chartWidth / 2 : (idx / (n - 1)) * chartWidth
    const normalized = d.tokens / max
    const y = chartPaddingY + (1 - normalized) * usableHeight
    return { x, y }
  })
})

const linePointsAttr = computed(() =>
  linePoints.value.map(p => `${p.x},${p.y}`).join(' ')
)

const areaPointsAttr = computed(() => {
  if (!linePoints.value.length) return ''
  const first = linePoints.value[0]
  const last = linePoints.value[linePoints.value.length - 1]
  const baselineY = chartHeight - chartPaddingY

  return [
    `${first.x},${baselineY}`,
    ...linePoints.value.map(p => `${p.x},${p.y}`),
    `${last.x},${baselineY}`
  ].join(' ')
})

// --- FORMATADORES ---
function formatUsd (value) {
  const v = Number(value || 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(v)
}

function formatNumber (value) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0
  }).format(Number(value || 0))
}

function formatDate (isoDate) {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatShortDate (isoDate) {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const lastUpdatedLabel = computed(() => {
  const last = dailyUsage.value[dailyUsage.value.length - 1]
  if (!last) return '—'
  const d = new Date(last.date)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  }) + ' • mock'
})
</script>

<style scoped>
.wallet-page {
  max-width: 1100px;
  margin: 0 auto;
}

/* Cards com glassmorphism escuro */
.section-card {
  background: #161717;
  border: 1px solid rgba(233, 233, 233, 0.2);
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-radius: 18px;
}

.summary-card {
  min-height: 130px;
}

/* Gráfico – altura menor pra não ficar tão esticado */
.chart-wrapper {
  width: 100%;
  height: 150px;
  border-radius: 14px;
  background: radial-gradient(
      circle at top left,
      rgba(34, 197, 94, 0.12),
      rgba(15, 23, 42, 0.95)
  );
  padding: 12px;
}

.chart-svg {
  width: 100%;
  height: 100%;
}

/* Tabela */
.wallet-table :deep(thead tr) {
  background: #0A0F13;
}

.wallet-table :deep(th) {
  color: #e5e7eb;
  font-weight: 500;
}

.wallet-table :deep(td) {
  color: #e5e7eb;
  border-color: rgba(55, 65, 81, 0.8);
}
</style>
