<template>
  <q-page class="q-pa-md">
    <div>
      <q-breadcrumbs>
        <q-breadcrumbs-el class="text-grey" label="Início" icon="home" to="/" />
        <q-breadcrumbs-el class="text-grey" label="Configurações" icon="settings" to="/configurar" />
        <q-breadcrumbs-el class="text-green-14" label="Tokens" icon="token" to="/tokens" />
      </q-breadcrumbs>

      <!-- Banner de erro -->
      <div v-if="errorMessage" class="q-mb-md">
        <q-banner dense rounded class="bg-red-10 text-red-2">
          <div class="text-subtitle2">Erro ao carregar dados de tokens</div>
          <div class="text-caption">{{ errorMessage }}</div>
        </q-banner>
      </div>

      <!-- Header -->
      <div class="q-mb-lg">
        <div class="row items-center justify-between q-gutter-sm q-pt-md">
          <div>
            <div class="text-h5 text-weight-bold text-white q-mb-xs">💳 Wallet de Tokens</div>

            <q-badge
              v-if="hasRealData"
              color="green-14"
              text-color="black"
              class="q-mr-sm text-bold"
            >Dados reais</q-badge>

            <q-badge
              v-else
              color="grey-7"
              text-color="grey-1"
              class="q-mr-sm"
            >Ainda sem uso registrado</q-badge>

            <div class="text-caption text-grey-5">Período exibido: {{ rangeLabel }}.</div>
            <div class="text-caption text-grey-6 q-mt-xs">
              Conversão BRL usando taxa: {{ usdToBrlRate.toFixed(2) }} R$/USD
            </div>
          </div>

          <div class="column" :class="isMobile ? 'items-start' : 'items-end'">
            <div class="text-caption text-grey-5">Última atualização</div>
            <div class="text-subtitle2 text-grey-2">{{ lastUpdatedLabel }}</div>

            <q-btn-toggle
              v-model="range"
              :options="rangeOptions"
              dense
              toggle-color="primary"
              color="grey-9"
              text-color="grey-1"
              size="md"
              @update:model-value="onChangeRange"
              class="q-mt-sm"
            />
          </div>
        </div>
      </div>

      <!-- Resumo -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-4">
          <q-card class="section-card summary-card">
            <q-card-section>
              <div class="text-caption text-grey-4">Consumo (USD)</div>
              <div class="text-h5 text-amber-3">{{ formatUsd(summary.spentUsdRange) }}</div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-4">
          <q-card class="section-card summary-card">
            <q-card-section>
              <div class="text-caption text-grey-4">Consumo (BRL)</div>
              <div class="text-h5 text-teal-3">{{ formatBRL(summary.spentBrlRange) }}</div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-4">
          <q-card class="section-card summary-card">
            <q-card-section>
              <div class="text-caption text-grey-3">Tokens no período</div>
              <div class="text-h5 text-green-3">{{ formatNumber(summary.totalTokensThisRange) }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Sem dados -->
      <div v-if="!hasRealData">
        <q-card class="section-card">
          <q-card-section>
            <div class="text-subtitle1 text-grey-2">Nenhum uso encontrado</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- GRÁFICO DE BARRAS -->
      <q-card v-if="hasRealData" class="section-card q-mb-md">
        <q-card-section>
          <div class="text-subtitle1 text-grey-2 q-mb-md">Tokens por Dia</div>
          <div style="height:300px;">
            <Bar :data="barChartData" :options="barChartOptions" />
          </div>
        </q-card-section>
      </q-card>

      <!-- GRÁFICO DE PIZZA -->
      <q-card v-if="hasRealData" class="section-card q-mb-md">
        <q-card-section>
          <div class="text-subtitle1 text-grey-2 q-mb-md">Distribuição de Custo (USD)</div>
          <div style="height:300px;">
            <Pie :data="pieChartData" :options="pieChartOptions" />
          </div>
        </q-card-section>
      </q-card>

      <!-- Tabela -->
      <q-card v-if="hasRealData" class="section-card">
        <q-card-section>
          <q-table
            flat dense
            :rows="dailyUsageComputed"
            :columns="columns"
            row-key="date"
            hide-bottom
            class="wallet-table"
          />
        </q-card-section>
      </q-card>

    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onBeforeMount } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

/* ---------------------------
    IMPORTAÇÃO DO CHART.JS
---------------------------- */
import {
  Chart as ChartJS,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar, Pie } from 'vue-chartjs'

ChartJS.register(
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
)

const $q = useQuasar()
const isMobile = $q.screen.lt.md

/* ESTADOS */
const dailyUsage = ref([])
const summary = ref({
  totalTokensThisRange: 0,
  spentUsdRange: 0,
  spentBrlRange: 0
})

const errorMessage = ref('')
const openaiConfig = ref(null)

/* RANGE */
const range = ref('7d')
const rangeOptions = [
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: 'Mês atual', value: 'month' }
]

/* TAXA USD→BRL */
const usdToBrlRate = computed(() => {
  const cfg = openaiConfig.value || {}
  const raw = cfg.USD_BRL_RATE ?? cfg.OPENAI_USD_BRL ?? null
  const n = Number(String(raw).replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 6.0
})

/* LABEL RANGE */
const rangeLabel = computed(() => (
  range.value === '30d'
    ? 'últimos 30 dias'
    : range.value === 'month'
      ? 'mês atual'
      : 'últimos 7 dias'
))

/* ----------------------------------------
  CARREGAR CONFIG INICIAL
----------------------------------------- */
onBeforeMount(async () => {
  try {
    const raw = localStorage.getItem('config_openai')
    if (!raw) return notifyNoConfig()

    const parsed = JSON.parse(raw)
    if (!parsed.OPENAI_API_KEY) return notifyNoConfig()

    openaiConfig.value = parsed
    await fetchTokenUsage()
  } catch {
    notifyNoConfig()
  }
})

function notifyNoConfig() {
  $q.notify({
    color: 'amber',
    textColor: 'black',
    icon: 'settings',
    message: 'Configure a OPENAI API KEY antes de usar a Wallet.'
  })
}

/* ----------------------------------------
  BUSCAR USO NO BACKEND
----------------------------------------- */
async function fetchTokenUsage() {
  try {
    const raw = localStorage.getItem('config_openai')
    const parsed = JSON.parse(raw)
    const key = parsed.OPENAI_API_KEY

    const { data } = await api.get('/token-usage', {
      params: { range: range.value },
      headers: { 'x-openai-key': key }
    })

    dailyUsage.value = data.daily || []

    summary.value = {
      totalTokensThisRange: data.summary.totalTokensThisRange,
      spentUsdRange: data.summary.spentUsdThisRange,
      spentBrlRange: data.summary.spentUsdThisRange * usdToBrlRate.value
    }
  } catch (err) {
    errorMessage.value = err?.response?.data?.error || err.message
  }
}

async function onChangeRange() {
  await fetchTokenUsage()
}

/* ----------------------------------------
      TABELA
----------------------------------------- */
const columns = [
  { name: 'date', label: 'Dia', field: 'date', align: 'left' },
  { name: 'tokens', label: 'Tokens', field: 'tokens', align: 'right' },
  { name: 'usd', label: 'Custo (USD)', field: 'usd', align: 'right' },
  { name: 'brl', label: 'Custo (BRL)', field: 'brl', align: 'right' }
]

const dailyUsageComputed = computed(() =>
  dailyUsage.value.map(d => ({
    ...d,
    brl: (d.usd || 0) * usdToBrlRate.value
  }))
)

/* ----------------------------------------
      GRÁFICO BAR (tokens)
----------------------------------------- */
const barChartData = computed(() => ({
  labels: dailyUsage.value.map(d => formatShortDate(d.date)),
  datasets: [
    {
      label: 'Tokens',
      data: dailyUsage.value.map(d => d.tokens || 0),
      backgroundColor: '#22c55e88',
      borderColor: '#22c55e',
      borderWidth: 2,
      borderRadius: 8
    }
  ]
}))

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      ticks: { color: '#bbf7d0' },
      grid: { color: '#1f293780' }
    },
    x: {
      ticks: { color: '#bbf7d0' },
      grid: { display: false }
    }
  }
}

/* ----------------------------------------
      GRÁFICO PIZZA (USD)
----------------------------------------- */
const pieChartData = computed(() => ({
  labels: dailyUsage.value.map(d => formatShortDate(d.date)),
  datasets: [
    {
      data: dailyUsage.value.map(d => d.usd || 0),
      backgroundColor: [
        '#22c55e',
        '#2dd4bf',
        '#3b82f6',
        '#a855f7',
        '#f472b6',
        '#fb923c',
        '#facc15'
      ]
    }
  ]
}))

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#e5e7eb' }
    }
  }
}

/* ----------------------------------------
  FORMATADORES
----------------------------------------- */
function formatUsd(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4
  }).format(v || 0)
}
function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(v || 0)
}
function formatNumber(v) {
  return new Intl.NumberFormat('pt-BR').format(v || 0)
}
function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const hasRealData = computed(() => dailyUsage.value.length > 0)
const lastUpdatedLabel = computed(() => {
  const last = dailyUsage.value[dailyUsage.value.length - 1]
  return last ? formatShortDate(last.date) : '-'
})
</script>

<style scoped>
.summary-card {
  min-height: 130px;
}

.wallet-table :deep(thead tr) {
  background: #424242;
}
.wallet-table :deep(th) {
  color: #e5e7eb;
}
.wallet-table :deep(td) {
  color: #000000;
}
</style>
