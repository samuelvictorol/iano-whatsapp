<template>
  <q-page class="q-pa-md">
    <div>
      <q-breadcrumbs>
        <q-breadcrumbs-el class="text-grey" label="Início" icon="home" to="/" />
        <q-breadcrumbs-el class="text-grey " label="Configurações" icon="settings" to="/configurar" />
        <q-breadcrumbs-el class="text-green-14 " label="Tokens" icon="token" to="/tokens" />
      </q-breadcrumbs>

      <!-- Banner de erro -->
      <div v-if="errorMessage" class="q-mb-md">
        <q-banner dense rounded class="bg-red-10 text-red-2">
          <div class="text-subtitle2">
            Erro ao carregar dados de tokens
          </div>
          <div class="text-caption">
            {{ errorMessage }}
          </div>
        </q-banner>
      </div>

      <!-- Header -->
      <div class="q-mb-lg">
        <div class="row items-center justify-between q-gutter-sm q-pt-md">
          <div>
            <div class="text-h5 text-weight-bold text-white q-mb-xs">
              💳 Wallet de Tokens
            </div>
            <div class="q-mt-sm text-grey-5">
              <q-badge
                v-if="hasRealData"
                color="green-14"
                text-color="black"
                class="q-mr-sm text-bold"
              >
                Dados reais
              </q-badge>

              <q-badge
                v-else
                color="grey-7"
                text-color="grey-1"
                class="q-mr-sm"
              >
                Ainda sem uso registrado
              </q-badge>

              <span class="text-caption">
                Período exibido: {{ rangeLabel }}.
              </span>

              <div class="text-caption text-grey-6 q-mt-xs">
                Conversão BRL usando taxa: {{ usdToBrlRate.toFixed(2) }} R$/USD
              </div>
            </div>
          </div>

          <div class="column" :class="isMobile ? 'items-start' : 'items-end'">
            <div class="text-caption text-grey-5">
              Última atualização
            </div>
            <div class="text-subtitle2 text-grey-2">
              {{ lastUpdatedLabel }}
            </div>

            <!-- Filtro de período -->
            <div class="q-mt-sm">
              <q-btn-toggle
                v-model="range"
                :options="rangeOptions"
                dense
                toggle-color="primary"
                color="grey-9"
                text-color="grey-1"
                size="md"
                @update:model-value="onChangeRange"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Resumo principal (sem saldo, só consumo) -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-4">
          <q-card class="section-card summary-card">
            <q-card-section class="row items-center justify-between">
              <div>
                <div class="text-caption text-grey-4">
                  Consumo no período (USD)
                </div>
                <div class="text-h5 text-amber-3">
                  {{ formatUsd(summary.spentUsdRange) }}
                </div>
                <div class="text-caption text-grey-6 q-mt-xs">
                  Considerando todas as chamadas da IA no intervalo {{ rangeLabel.toLowerCase() }}.
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
                <div class="text-caption text-grey-4">
                  Consumo no período (BRL)
                </div>
                <div class="text-h5 text-teal-3">
                  {{ formatBRL(summary.spentBrlRange) }}
                </div>
                <div class="text-caption text-grey-6 q-mt-xs">
                  Convertido usando taxa configurada / padrão.
                </div>
              </div>
              <q-icon name="payments" size="32px" class="text-teal-3" />
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-4">
          <q-card class="section-card summary-card">
            <q-card-section class="row items-center justify-between">
              <div>
                <div class="text-caption text-grey-3">
                  Tokens no período
                </div>
                <div class="text-h5 text-green-3">
                  {{ formatNumber(summary.totalTokensThisRange) }} tok
                </div>
                <div class="text-caption text-grey-4 q-mt-xs">
                  Soma de todos os tokens (prompt + completion) no intervalo.
                </div>
              </div>
              <q-icon name="token" size="32px" class="text-green-3" />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Caso ainda não tenha dados -->
      <div v-if="!hasRealData" class="q-mb-md">
        <q-card class="section-card">
          <q-card-section>
            <div class="text-subtitle1 text-grey-2 q-mb-xs">
              Nenhum uso de tokens encontrado
            </div>
            <div class="text-caption text-grey-5">
              Assim que sua IA começar a responder clientes usando a OpenAI,
              os dados de consumo vão aparecer aqui automaticamente.
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Gráfico de consumo -->
      <q-card v-if="hasRealData" class="section-card q-mb-md">
        <q-card-section>
          <div class="row items-center justify-between q-mb-sm">
            <div>
              <div class="text-subtitle1 text-grey-2">
                Consumo diário de tokens ({{ rangeLabel }})
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
              <polygon :points="areaPointsAttr" fill="url(#areaGradient)" />

              <!-- Pontos -->
              <g v-for="(p, idx) in linePoints" :key="idx">
                <circle :cx="p.x" :cy="p.y" r="3" fill="#22c55e" />
              </g>
            </svg>
          </div>

          <!-- Legenda dos dias -->
          <div class="row q-col-gutter-xs q-mt-sm">
            <div
              v-for="(day, idx) in dailyUsage"
              :key="day.date || idx"
              class="col-auto"
            >
              <q-chip
                dense
                outline
                color="teal-4"
                text-color="teal-1"
                class="q-mb-xs"
              >
                {{ formatShortDate(day.date) }} • {{ formatNumber(day.tokens || 0) }} tok
              </q-chip>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Tabela de detalhes -->
      <q-card v-if="hasRealData" class="section-card">
        <q-card-section>
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-subtitle1 text-grey-2">
              Detalhamento por dia
            </div>
            <q-badge color="grey-9" text-color="grey-2">
              {{ rangeLabel }}
            </q-badge>
          </div>

          <q-table
            flat
            dense
            :rows="dailyUsageComputed"
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
                {{ formatNumber(props.row.tokens || 0) }}
              </q-td>
            </template>

            <template #body-cell-usd="props">
              <q-td :props="props" class="text-dark">
                {{ formatUsd(props.row.usd || 0) }}
              </q-td>
            </template>

            <template #body-cell-brl="props">
              <q-td :props="props" class="text-dark">
                {{ formatBRL(props.row.brl || 0) }}
              </q-td>
            </template>

            <template #body-cell-share="props">
              <q-td :props="props" class="text-dark">
                <q-linear-progress
                  :value="maxTokensDay ? (props.row.tokens || 0) / maxTokensDay : 0"
                  track-color="grey-9"
                  color="green-14"
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
import { ref, computed, onBeforeMount } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()
const isMobile = $q.screen.lt.md

const STORAGE_KEYS = {
  openai: 'config_openai'
}

// --- ESTADO ---
const dailyUsage = ref([]) // vindo da API (range configurável)
const summary = ref({
  totalTokensThisRange: 0,
  spentUsdRange: 0,
  spentBrlRange: 0
})

const errorMessage = ref('')
const openaiConfig = ref(null)

// range de período
const range = ref('7d')
const rangeOptions = [
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: 'Mês atual', value: 'month' }
]

// taxa de câmbio USD→BRL (pode vir da config_openai ou usa fallback)
const usdToBrlRate = computed(() => {
  const cfg = openaiConfig.value || {}
  const raw =
    cfg.USD_BRL_RATE ??
    cfg.OPENAI_USD_BRL ??
    null

  if (raw === null || raw === undefined || raw === '') {
    // fallback se nada estiver configurado
    return 6.0
  }

  const n = Number(String(raw).replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 6.0
})

// label legível do range
const rangeLabel = computed(() => {
  if (range.value === '30d') return 'últimos 30 dias'
  if (range.value === 'month') return 'mês atual'
  return 'últimos 7 dias'
})

// --- BLOQUEIO SEM OPENAI_API_KEY + carregamento inicial ---
onBeforeMount(async () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.openai)
    if (!raw) {
      notifyNoConfig()
      return
    }

    const parsed = JSON.parse(raw)
    const hasKey = !!parsed.OPENAI_API_KEY

    if (!hasKey) {
      notifyNoConfig()
      return
    }

    // guarda a config em memória (para taxa de câmbio etc.)
    openaiConfig.value = parsed

    await fetchTokenUsage()
  } catch (e) {
    console.error('Erro ao validar OPENAI_API_KEY para Wallet de tokens', e)
    notifyNoConfig()
  }
})

function notifyNoConfig () {
  $q.notify({
    color: 'amber',
    textColor: 'black',
    icon: 'settings',
    position: 'top',
    message: 'Configure as credenciais obrigatórias antes de acessar a Wallet de Tokens.'
  })
}

async function fetchTokenUsage () {
  try {
    errorMessage.value = ''

    // pega config do localStorage
    const raw = localStorage.getItem(STORAGE_KEYS.openai)
    let openaiKey = ''

    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        openaiKey = parsed.OPENAI_API_KEY || ''
      } catch (e) {
        console.error('Erro ao parsear config_openai', e)
      }
    }

    if (!openaiKey) {
      errorMessage.value = 'Configure sua OPENAI API KEY na aba Configurar antes de ver o uso de tokens.'
      return
    }

    const { data } = await api.get('/token-usage', {
      params: {
        range: range.value,
        openaiKey // também manda na query se quiser
      },
      headers: {
        'x-openai-key': openaiKey
      }
    })

    if (!data?.ok) {
      throw new Error(data?.error || 'Falha ao buscar uso de tokens')
    }

    const daily = Array.isArray(data.daily) ? data.daily : []
    dailyUsage.value = daily

    const apiSummary = data.summary || {}

    const totalTokensRange = Number(apiSummary.totalTokensThisRange || 0)
    const spentUsdRange = Number(apiSummary.spentUsdThisRange || 0)
    const spentBrlRange = spentUsdRange * usdToBrlRate.value

    summary.value = {
      totalTokensThisRange: totalTokensRange,
      spentUsdRange,
      spentBrlRange
    }
  } catch (err) {
    console.error('Erro ao carregar dados de tokens', err)

    const backendMsg = err?.response?.data?.error

    errorMessage.value =
      backendMsg === 'mongo.uri não definido no runtimeConfig.'
        ? 'Sessão ainda não configurada no backend. Vá em Configurações → Nova Sessão para inicializar o Mongo.'
        : (backendMsg || err?.message || 'Erro ao buscar dados de tokens')

    $q.notify({
      color: 'negative',
      position: 'top',
      icon: 'error',
      message: errorMessage.value
    })
  }
}

// handler quando mudar o range (botão toggle)
async function onChangeRange () {
  await fetchTokenUsage()
}

// --- COLUMNS TABELA ---
const columns = [
  { name: 'date', label: 'Dia', field: 'date', align: 'left' },
  { name: 'tokens', label: 'Tokens', field: 'tokens', align: 'right' },
  { name: 'usd', label: 'Custo (USD)', field: 'usd', align: 'right' },
  { name: 'brl', label: 'Custo (BRL)', field: 'brl', align: 'right' },
  { name: 'share', label: '% do pico (tokens)', field: 'tokens', align: 'left' }
]

// rows com BRL calculado
const dailyUsageComputed = computed(() => {
  const rate = usdToBrlRate.value
  return dailyUsage.value.map(d => ({
    ...d,
    brl: (Number(d.usd) || 0) * rate
  }))
})

// --- GRÁFICO (SVG) ---
const chartWidth = 100
const chartHeight = 40
const chartPaddingY = 6 // padding vertical pra nao “colar” topo/fundo

const maxTokensDay = computed(() => {
  if (!dailyUsage.value.length) return 1
  return Math.max(...dailyUsage.value.map(d => d.tokens || 0))
})

const linePoints = computed(() => {
  const max = maxTokensDay.value || 1
  const n = dailyUsage.value.length || 1
  const usableHeight = chartHeight - chartPaddingY * 2

  return dailyUsage.value.map((d, idx) => {
    const x = n === 1 ? chartWidth / 2 : (idx / (n - 1)) * chartWidth
    const normalized = (d.tokens || 0) / max
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
    minimumFractionDigits: 4
  }).format(v)
}

function formatBRL (value) {
  const v = Number(value || 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
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
  if (!last) return '-'
  const d = new Date(last.date)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  })
})

const hasRealData = computed(() => dailyUsage.value.length > 0)
</script>

<style scoped>
.summary-card {
  min-height: 130px;
}

/* Gráfico – altura menor pra não ficar tão esticado */
.chart-wrapper {
  width: 100%;
  height: 150px;
  border-radius: 14px;
  background: radial-gradient(circle at top left,
  #0A0F13,
  #0A0F13);
  padding: 12px;
}

.chart-svg {
  width: 100%;
  height: 100%;
}

/* Tabela */
.wallet-table :deep(thead tr) {
  background: #424242
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
