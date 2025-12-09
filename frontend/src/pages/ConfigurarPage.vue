<template>
  <q-page class="q-pa-md">
    <q-breadcrumbs>
      <q-breadcrumbs-el class="text-grey" label="Início" icon="home" to="/" />
      <q-breadcrumbs-el class="text-green-14 " label="Configurações" icon="settings" to="/configurar" />
    </q-breadcrumbs>
    <div class="settings-page">

      <!-- Header -->
      <div class="q-mb-lg">
        <div class="row items-center justify-between q-gutter-sm q-pt-md">
          <div>
            <div class="text-h5 text-weight-bold text-white q-mb-xs">
              ⚙ Configurações
            </div>

            <div class="text-grey q-my-sm">
              <span v-if="!sessionStartedOnce">
                Preencha as configurações obrigatórias de <strong>OpenAI & Mongo</strong> e depois clique em
                <strong>Nova Sessão</strong> para iniciar o bot.
              </span>
              <span v-else-if="hasPendingChanges">
                🟡 Detectamos mudanças em <strong>OpenAI/Mongo</strong>.
                Clique em <strong>Nova Sessão</strong> para aplicar e escanear o QR Code novamente.
              </span>
              <span v-else>
                🟢 Sessão ativa.
              </span>
            </div>
          </div>

          <div class="row items-center">
            <!-- Ações de importar/exportar JSON -->
            <div class="row items-center justify-start">
              <q-btn
                dense
                outlined
                icon="download"
                class="text-primary bg-white"
                glossy
                label="Importar"
                @click="triggerImport"
              />
              <input
                ref="fileInput"
                type="file"
                accept="application/json"
                class="hidden"
                @change="handleFileChange"
              />
              <q-btn
                dense
                outlined
                icon="upload"
                label="Exportar"
                class="q-ml-sm text-primary bg-white"
                glossy
                @click="exportConfigToFile"
              />
            </div>
          </div>

          <div class="w100 row justify-end q-pt-md">
            <!-- Botão principal: sempre "Nova Sessão" -->
            <q-btn
              :color="mainActionColor"
              glossy
              icon-right="mdi-play-speed"
              :label="mainActionLabel"
              :loading="startSessionLoading"
              :disable="!canClickMainAction || startSessionLoading"
              class="q-pa-md"
              @click="startSession"
            />
          </div>
        </div>
      </div>

      <!-- CARD: API -->
      <q-card class="q-mb-md shadow section-card">
        <q-expansion-item
          v-model="apiExpanded"
          dense-toggle
          expand-separator
          :header-class="[
            'expansion-header',
            isOpenAIMongoComplete ? 'expansion-header--ok' : 'expansion-header--warn'
          ]"
          expand-icon="expand_more"
          @update:model-value="val => handleExpand('api', val)"
        >
          <!-- HEADER CUSTOM -->
          <template #header>
            <q-item-section avatar>
              <q-avatar
                size="32px"
                :color="isOpenAIMongoComplete ? 'green-14' : 'amber'"
                text-color="black"
              >
                <q-icon name="vpn_key" />
              </q-avatar>
            </q-item-section>

            <q-item-section>
              <div class="text-body1 text-white">
                Configurar Chaves
              </div>
              <div v-if="apiExpanded" class="text-caption text-grey-6">
                Chaves de API, modelos e conexão com banco. <strong>Obrigatório</strong> para rodar o bot.
              </div>
            </q-item-section>

            <q-item-section side>
              <q-chip
                v-if="isOpenAIMongoComplete"
                dense
                color="green-14"
                text-color="white"
                icon="check_circle"
              >
                <div v-if="!apiExpanded">Pronto</div>
              </q-chip>
              <q-chip
                v-else
                dense
                outline
                color="amber-5"
                text-color="amber-1"
                icon="priority_high"
              >
                <div v-if="!apiExpanded">Obrigatório</div>
              </q-chip>
            </q-item-section>
          </template>

          <q-card-section>
            <q-form class="q-gutter-md" @submit.prevent="saveOpenAIConfig">
              <!-- OPENAI_API_KEY -->
              <q-input
                class="bg-grey rounded-borders"
                v-model="openaiApiKey"
                label="OPENAI API KEY"
                type="password"
                outlined
                dense
              >
                <template #append>
                  <q-icon name="help_outline" class="cursor-pointer">
                    <q-tooltip>
                      Chave secreta da API da OpenAI. Ex.: sk-XXXX... (não compartilhe).
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>

              <!-- OPENAI_CHAT_MODEL (q-select) -->
              <q-select
                v-model="openaiChatModel"
                label="OPENAI CHAT MODEL"
                outlined
                dense
                class="bg-grey rounded-borders"
                :options="openaiModelOptions"
                emit-value
                map-options
              >
                <template #append>
                  <q-icon name="help_outline" class="cursor-pointer">
                    <q-tooltip>
                      Selecione o modelo de chat da OpenAI. Ex.: gpt-4.1, gpt-4o, gpt-4.1-mini.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-select>

              <!-- OPENAI_TEMPERATURE -->
              <q-input
                class="bg-grey rounded-borders"
                v-model.number="openaiTemperature"
                type="number"
                label="OPENAI TEMPERATURE"
                outlined
                dense
                :min="0"
                :max="2"
                step="0.1"
              >
                <template #append>
                  <q-icon name="help_outline" class="cursor-pointer">
                    <q-tooltip>
                      Temperatura (criatividade). 0 = mais robô, 1 = mais criativo. Ex.: 0.8.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>

              <!-- OPENAI_MAX_TOKENS -->
              <q-input
                class="bg-grey rounded-borders"
                v-model.number="openaiMaxTokens"
                type="number"
                label="OPENAI MAX TOKENS"
                outlined
                dense
                :min="1"
              >
                <template #append>
                  <q-icon name="help_outline" class="cursor-pointer">
                    <q-tooltip>
                      Máximo de tokens por resposta. Ex.: 900.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>

              <!-- TRANSCRIBE_MODEL (q-select) -->
              <q-select
                v-model="openaiTranscribeModel"
                label="TRANSCRIBE MODEL"
                outlined
                class="bg-grey rounded-borders"
                dense
                :options="openaiTranscribeOptions"
                emit-value
                map-options
              >
                <template #append>
                  <q-icon name="help_outline" class="cursor-pointer">
                    <q-tooltip>
                      Modelo de transcrição de áudio. Ex.: whisper-1.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-select>

              <!-- MONGO_CONNECTION_STRING -->
              <q-input
                class="bg-grey rounded-borders"
                v-model="mongoConnectionString"
                label="MONGO CONNECTION STRING"
                outlined
                dense
              >
                <template #append>
                  <q-icon name="help_outline" class="cursor-pointer">
                    <q-tooltip>
                      String de conexão do banco de dados Mongo. Também é usada como "token" de configuração.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>

              <!-- AÇÕES STICKY -->
              <div class="sticky-actions">
                <div class="row justify-end q-gutter-sm q-mt-md">
                  <q-btn
                    flat
                    color="grey"
                    icon="restore"
                    label="Resetar"
                    @click="resetOpenAIConfig"
                  />
                  <q-btn
                    class="bg-positive text-white"
                    icon-right="save"
                    label="Salvar"
                    type="submit"
                  />
                </div>
              </div>
            </q-form>
          </q-card-section>
        </q-expansion-item>
      </q-card>

      <!-- CARD: Configurações da IA -->
      <q-card class="q-mb-md shadow section-card">
        <q-expansion-item
          v-model="aiExpanded"
          dense-toggle
          expand-separator
          :header-class="[
            'expansion-header',
            isAIConfigComplete ? 'expansion-header--ok' : 'expansion-header--neutral'
          ]"
          expand-icon="expand_more"
          @update:model-value="val => handleExpand('ai', val)"
        >
          <template #header>
            <q-item-section avatar>
              <q-avatar size="32px" color="green-14" text-color="primary">
                <q-icon name="smart_toy" />
              </q-avatar>
            </q-item-section>

            <q-item-section>
              <div class="text-body1 text-white">
                Personalizar I.A
              </div>
              <div v-if="aiExpanded" class="text-caption text-grey-6">
                Contexto, cooldown humano, nome do bot e prompts. Salvos em banco e aplicados em tempo real.
              </div>
            </q-item-section>

            <q-item-section side>
              <q-chip
                v-if="isAIConfigComplete"
                dense
                color="green-14"
                text-color="white"
                icon="check_circle"
              >
                <div v-if="!aiExpanded">Pronto</div>
              </q-chip>
              <q-chip
                v-else
                dense
                outline
                color="grey"
                text-color="grey"
                icon="settings_suggest"
              >
                Opcional
              </q-chip>
            </q-item-section>
          </template>

          <q-card-section>
            <q-form class="q-gutter-md" @submit.prevent="saveAIConfig">
              <!-- BOT_NAME -->
              <q-input
                class="bg-grey rounded-borders"
                v-model="botName"
                label="Nome do Bot"
                outlined
                dense
              >
                <template #append>
                  <q-icon name="help_outline" class="cursor-pointer">
                    <q-tooltip>
                      Nome exibido no prefixo das mensagens. Ex.: IANO Bot.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>

              <!-- IA_CONTEXT_MAX_MINUTES -->
              <q-input
                class="bg-grey rounded-borders"
                v-model.number="iaContextMinutes"
                type="number"
                label="Tempo de Consideração"
                outlined
                dense
                :min="0"
              >
                <template #append>
                  <q-icon name="help_outline" class="cursor-pointer">
                    <q-tooltip>
                      Minutos de histórico da conversa considerados para a IA.
                      Ex.: 5 = mensagens dos últimos 5 minutos.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>

              <!-- HUMAN_HOLD_MS -->
              <q-input
                class="bg-grey rounded-borders"
                v-model.number="humanHoldMs"
                type="number"
                label="Tempo Intervenção Humana (ms)"
                outlined
                dense
                :min="0"
              >
                <template #append>
                  <q-icon name="help_outline" class="cursor-pointer">
                    <q-tooltip>
                      Tempo em milissegundos que a IA fica em pausa após uma resposta humana.
                      Ex.: 300000 = 5 minutos.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>

              <!-- Contexto da IA -->
              <q-input
                class="bg-grey rounded-borders"
                v-model="aiContext"
                type="textarea"
                autogrow
                outlined
                label="Contexto da IA (papel / persona)"
              >
                <template #append>
                  <q-icon name="help_outline" class="cursor-pointer">
                    <q-tooltip>
                      Explique o que a IA faz. Ex.: SDR que atende leads no WhatsApp e qualifica oportunidades.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>

              <!-- Regras da IA -->
              <q-input
                class="bg-grey rounded-borders"
                v-model="aiRules"
                type="textarea"
                autogrow
                outlined
                label="Regras da IA (prompt / instruções)"
              >
                <template #append>
                  <q-icon name="help_outline" class="cursor-pointer">
                    <q-tooltip>
                      Regras claras que a IA deve seguir. Ex.: tom de voz, coisas que não pode fazer, prioridades.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>

              <!-- Metadata -->
              <q-input
                class="bg-grey rounded-borders"
                v-model="aiMetadata"
                type="textarea"
                autogrow
                outlined
                label="Metadata (observações extras para o prompt)"
              >
                <template #append>
                  <q-icon name="help_outline" class="cursor-pointer">
                    <q-tooltip>
                      Detalhes adicionais: site, instagram, redirecionamento, público-alvo, idioma, região, ofertas especiais etc.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>

              <!-- AÇÕES STICKY -->
              <div class="sticky-actions">
                <div class="row justify-end q-gutter-sm q-mt-md">
                  <q-btn
                    flat
                    color="grey"
                    icon="restore"
                    label="Resetar"
                    @click="resetAIConfig"
                  />
                  <q-btn
                    class="bg-positive text-white"
                    icon-right="save"
                    label="Salvar"
                    type="submit"
                    :loading="savingAI"
                  />
                </div>
              </div>
            </q-form>
          </q-card-section>
        </q-expansion-item>
      </q-card>

      <!-- CARD: Dados para a IA (catálogo etc.) -->
      <q-card class="q-mb-md shadow section-card">
        <q-expansion-item
          v-model="dataExpanded"
          dense-toggle
          expand-separator
          :header-class="[
            'expansion-header',
            hasDataItems ? 'expansion-header--ok' : 'expansion-header--neutral'
          ]"
          expand-icon="expand_more"
          @update:model-value="val => handleExpand('data', val)"
        >
          <template #header>
            <q-item-section avatar>
              <q-avatar size="32px" color="green-14" text-color="primary">
                <q-icon name="dataset" />
              </q-avatar>
            </q-item-section>

            <q-item-section>
              <div class="text-body1 text-white">
                Produtos e Serviços
              </div>
              <div v-if="dataExpanded" class="text-caption text-grey-6">
                Lista de produtos ou serviços utilizadas pela IA durante a interação.
              </div>
            </q-item-section>

            <q-item-section side>
              <q-chip
                v-if="hasDataItems"
                dense
                color="green-14"
                text-color="white"
                icon="check_circle"
              >
                <div v-if="!dataExpanded">{{ dataItems.length }} item(s)</div>
              </q-chip>
              <q-chip
                v-else
                dense
                outline
                color="grey"
                text-color="grey"
                icon="info"
              >
                <div v-if="!dataExpanded">Opcional</div>
              </q-chip>
            </q-item-section>
          </template>

          <q-card-section>
            <q-form class="q-gutter-md" @submit.prevent="addDataItem">
              <div class="row q-col-gutter-sm">
                <div class="col-12 col-md-6">
                  <!-- Título -->
                  <q-input
                    class="bg-grey rounded-borders"
                    v-model="newItem.title"
                    label="Título"
                    outlined
                    dense
                  >
                    <template #append>
                      <q-icon name="help_outline" class="cursor-pointer">
                        <q-tooltip>
                          Nome do item / produto. Ex.: “Consultoria de implementação de IA”.
                        </q-tooltip>
                      </q-icon>
                    </template>
                  </q-input>
                </div>

                <div class="col-12 col-md-6">
                  <!-- Categoria -->
                  <q-input
                    class="bg-grey rounded-borders"
                    v-model="newItem.category"
                    label="Categoria"
                    outlined
                    dense
                  >
                    <template #append>
                      <q-icon name="help_outline" class="cursor-pointer">
                        <q-tooltip>
                          Grupo do item. Ex.: “Plano Mensal”, “Serviço”, “Produto físico”.
                        </q-tooltip>
                      </q-icon>
                    </template>
                  </q-input>
                </div>

                <div class="col-12">
                  <!-- Descrição -->
                  <q-input
                    class="bg-grey rounded-borders"
                    v-model="newItem.description"
                    type="textarea"
                    autogrow
                    label="Descrição"
                    outlined
                  >
                    <template #append>
                      <q-icon name="help_outline" class="cursor-pointer">
                        <q-tooltip>
                          Explicação rápida do item. Ex.: benefícios, para quem é, quando usar.
                        </q-tooltip>
                      </q-icon>
                    </template>
                  </q-input>
                </div>

                <!-- Imagens como array de inputs -->
                <div class="col-12 col-md-6">
                  <div class="row items-center justify-between q-mb-xs">
                    <q-btn
                      dense
                      class="q-mx-xs text-secondary text-white"
                      outline
                      icon="add_photo_alternate"
                      label="Adicionar imagem"
                      @click="addImageInput"
                    />
                    <div class="text-caption text-grey-6 q-mr-sm">
                      Imagens
                    </div>
                  </div>

                  <div
                    v-for="(img, idx) in newItem.images"
                    :key="idx"
                    class="row items-center q-mb-xs no-wrap"
                  >
                    <div class="col">
                      <q-input
                        class="bg-grey rounded-borders"
                        v-model="newItem.images[idx]"
                        :label="`Imagem ${idx + 1} (URL)`"
                        outlined
                        dense
                      >
                        <template #append>
                          <q-icon name="help_outline" class="cursor-pointer">
                            <q-tooltip>
                              URL da imagem. Ex.: https://exemplo.com/imagem{{ idx + 1 }}.jpg
                            </q-tooltip>
                          </q-icon>
                        </template>
                      </q-input>
                    </div>

                    <div class="q-ml-xs">
                      <q-btn
                        v-if="newItem.images.length > 1"
                        dense
                        flat
                        round
                        icon="delete"
                        color="amber-5"
                        @click="removeImageInput(idx)"
                      />
                    </div>
                  </div>

                  <!-- Prévia da primeira imagem do formulário -->
                  <div v-if="previewImages.length" class="q-mt-sm">
                    <div class="text-caption text-grey-5 q-mb-xs">
                      Prévia da primeira imagem
                    </div>
                    <q-img
                      :src="previewImages[0]"
                      class="rounded-borders"
                      style="max-width: 220px"
                      :ratio="16 / 9"
                    />
                  </div>
                </div>

                <div class="col-6 col-md-3">
                  <!-- Preço -->
                  <q-input
                    class="bg-grey rounded-borders"
                    v-model.number="newItem.price"
                    type="number"
                    outlined
                    dense
                    label="Preço (R$)"
                    min="0"
                    step="0.01"
                  >
                    <template #append>
                      <q-icon name="help_outline" class="cursor-pointer">
                        <q-tooltip>
                          Preço cheio do item. Ex.: 497.90.
                        </q-tooltip>
                      </q-icon>
                    </template>
                  </q-input>
                </div>

                <div class="col-6 col-md-3">
                  <!-- Preço promocional -->
                  <q-input
                    class="bg-grey rounded-borders"
                    v-model.number="newItem.promoPrice"
                    type="number"
                    outlined
                    dense
                    label="Preço promocional (R$)"
                    min="0"
                    step="0.01"
                  >
                    <template #append>
                      <q-icon name="help_outline" class="cursor-pointer">
                        <q-tooltip>
                          Preço com desconto (se existir). Ex.: 297.90. Deixe vazio se não houver promoção.
                        </q-tooltip>
                      </q-icon>
                    </template>
                  </q-input>
                </div>
              </div>

              <!-- AÇÕES STICKY -->
              <div class="sticky-actions">
                <div class="row justify-end q-gutter-sm q-mt-md">
                  <q-btn
                    flat
                    color="grey"
                    icon="delete_sweep"
                    label="Limpar itens"
                    @click="clearDataItems"
                  />
                  <q-btn
                    class="bg-positive text-white"
                    icon-right="add_circle"
                    label="Adicionar item"
                    type="submit"
                    :loading="savingData"
                  />
                </div>
              </div>
            </q-form>

            <!-- Lista de itens salvos -->
            <div v-if="dataItems.length" class="q-mt-lg">
              <div class="text-subtitle2 text-grey-7 q-mb-sm">
                Itens cadastrados
              </div>
              <q-list bordered separator class="rounded-borders">
                <q-item
                  v-for="(item, index) in dataItems"
                  :key="index"
                  clickable
                  class="text-teal"
                >
                  <div class="q-mr-sm">
                    <q-img
                      v-if="normalizedImages(item).length"
                      :src="normalizedImages(item)[0]"
                      :alt="item.title || 'Prévia'"
                      class="rounded-borders"
                      width="80px"
                      height="80px"
                      :ratio="1"
                    />
                    <q-avatar
                      v-else
                      rounded
                      size="80px"
                      icon="image_not_supported"
                      color="grey-9"
                      text-color="grey-3"
                    />
                  </div>

                  <q-item-section>
                    <q-item-label class="text-weight-medium">
                      {{ item.title || 'Sem título' }}
                    </q-item-label>
                    <q-item-label caption class="text-grey-3">
                      {{ item.description || 'Sem descrição' }}
                    </q-item-label>
                    <q-item-label caption class="q-mt-xs text-amber">
                      <span v-if="item.category">Categoria: {{ item.category }} • </span>
                      <span v-if="item.price">Preço: R$ {{ Number(item.price).toFixed(2) }}</span>
                      <span v-if="item.promoPrice">
                        &nbsp;| Promo: R$ {{ Number(item.promoPrice).toFixed(2) }}
                      </span>
                    </q-item-label>
                  </q-item-section>

                  <q-item-section side top>
                    <q-btn
                      dense
                      flat
                      round
                      icon="delete"
                      color="negative"
                      @click.stop="removeDataItem(index)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-card-section>
        </q-expansion-item>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useRouter } from 'vue-router'

const $q = useQuasar()
const router = useRouter()

const STORAGE_KEYS = {
  openai: 'config_openai',
  ai: 'config_ai_settings',
  data: 'config_ai_data_items',
  sessionStarted: 'config_session_started',
  lastApplied: 'config_last_applied'
}
const isMobile = computed(() => $q.screen.lt.md)

// Estados de expansão dos cards
const apiExpanded = ref(false)
const aiExpanded = ref(false)
const dataExpanded = ref(false)

// garante que só um expansion fique aberto por vez
const handleExpand = (section, val) => {
  if (!val) return
  if (section === 'api') {
    aiExpanded.value = false
    dataExpanded.value = false
  } else if (section === 'ai') {
    apiExpanded.value = false
    dataExpanded.value = false
  } else if (section === 'data') {
    apiExpanded.value = false
    aiExpanded.value = false
  }
}

// --- CONTROLES GERAIS DE SESSÃO ---
const startSessionLoading = ref(false)
const sessionStartedOnce = ref(false)
const lastAppliedConfig = ref('') // JSON string do último config aplicado de fato

// Loading de salvar IA / Dados no backend
const savingAI = ref(false)
const savingData = ref(false)

// File input para importar JSON
const fileInput = ref(null)

// Opções de modelos da OpenAI (chat)
const openaiModelOptions = [
  { label: 'gpt-4.1-mini (padrão)', value: 'gpt-4.1-mini' },
  { label: 'gpt-4.1', value: 'gpt-4.1' },
  { label: 'gpt-4o-mini', value: 'gpt-4o-mini' },
  { label: 'gpt-4o', value: 'gpt-4o' },
  { label: 'gpt-3.5-turbo (legado)', value: 'gpt-3.5-turbo' }
]

// Opções de modelos de transcrição
const openaiTranscribeOptions = [
  { label: 'whisper-1 (padrão)', value: 'whisper-1' }
]

// --- FORM 1: OpenAI + Mongo ---
const openaiApiKey = ref('')
const openaiChatModel = ref('gpt-4.1-mini')
const openaiTemperature = ref(0.8)
const openaiMaxTokens = ref(900)
const openaiTranscribeModel = ref('whisper-1')
const mongoConnectionString = ref('')

// --- FORM 2: IA Settings ---
const iaContextMinutes = ref(5)        // default 5
const humanHoldMs = ref(300000)        // default 300000
const aiContext = ref('')
const aiRules = ref('')
const aiMetadata = ref('')
const botName = ref('IANO Bot')

// --- FORM 3: Dados (itens) ---
const newItem = ref({
  title: '',
  description: '',
  images: [''], // um campo de imagem vazio por padrão
  price: null,
  promoPrice: null,
  category: ''
})

const dataItems = ref([])

// computed para prévia das imagens no formulário
const previewImages = computed(() => {
  const imgs = newItem.value.images
  if (!Array.isArray(imgs)) return []
  return imgs
    .map(v => (v || '').trim())
    .filter(Boolean)
})

// --------- Utilitários de snapshot de config ---------
function buildConfigSnapshot () {
  return {
    OPENAI_API_KEY: openaiApiKey.value,
    OPENAI_CHAT_MODEL: openaiChatModel.value,
    OPENAI_TEMPERATURE: openaiTemperature.value,
    OPENAI_MAX_TOKENS: openaiMaxTokens.value,
    TRANSCRIBE_MODEL: openaiTranscribeModel.value,
    MONGO_CONNECTION_STRING: mongoConnectionString.value
  }
}

function setSnapshotAsLastApplied () {
  const snap = JSON.stringify(buildConfigSnapshot())
  lastAppliedConfig.value = snap
  localStorage.setItem(STORAGE_KEYS.lastApplied, snap)
}

// --------- Computeds de estado visual / validação ---------
const isOpenAIMongoComplete = computed(() => {
  return (
    !!openaiApiKey.value &&
    !!openaiChatModel.value &&
    !!openaiTranscribeModel.value &&
    !!mongoConnectionString.value
  )
})

const isAIConfigComplete = computed(() => {
  return !!botName.value && (!!aiContext.value || !!aiRules.value)
})

const hasDataItems = computed(() => dataItems.value.length > 0)

const isRequiredConfigFilled = computed(() => isOpenAIMongoComplete.value)

const hasPendingChanges = computed(() => {
  if (!sessionStartedOnce.value || !lastAppliedConfig.value) return false
  const current = JSON.stringify(buildConfigSnapshot())
  return current !== lastAppliedConfig.value
})

const mainActionLabel = computed(() => 'Nova Sessão')

const mainActionColor = computed(() => {
  if (!isRequiredConfigFilled.value) return 'grey-7'
  if (!sessionStartedOnce.value) return 'green-14'   // primeira vez
  if (hasPendingChanges.value) return 'orange-5'    // tem mudança pendente
  return 'grey'                                     // sessão ativa
})

const canClickMainAction = computed(() => {
  return isRequiredConfigFilled.value
})

const syncAIAndDataToBackend = async (showSuccess = true) => {
  const payload = {
    openai: {
      OPENAI_API_KEY: openaiApiKey.value,
      OPENAI_CHAT_MODEL: openaiChatModel.value,
      OPENAI_TEMPERATURE: openaiTemperature.value,
      OPENAI_MAX_TOKENS: openaiMaxTokens.value,
      TRANSCRIBE_MODEL: openaiTranscribeModel.value,
      MONGO_CONNECTION_STRING: mongoConnectionString.value
    },
    ai: {
      IA_CONTEXT_MAX_MINUTES: Number(iaContextMinutes.value) || 0,
      HUMAN_HOLD_MS: Number(humanHoldMs.value) || 0,
      AI_CONTEXT: aiContext.value,
      AI_RULES: aiRules.value,
      AI_METADATA: aiMetadata.value,
      BOT_NAME: botName.value || 'IANO Bot'
    },
    data: Array.isArray(dataItems.value) ? dataItems.value : []
  }

  try {
    const { data } = await api.post('/config/ai', payload)
    if (!data?.ok) {
      throw new Error(data?.error || 'Falha ao salvar configuração no banco')
    }

    if (showSuccess) {
      $q.notify({
        color: 'green',
        icon: 'save',
        position: 'top',
        message: 'Configurações de IA e catálogo salvas no banco. Aplicação em tempo real.'
      })
    }
  } catch (err) {
    console.error(err)
    $q.notify({
      type: 'negative',
      position: 'top',
      message: 'Erro ao salvar configurações de IA no banco: ' + (err?.message || '')
    })
  }
}

const loadAIAndDataFromBackend = async () => {
  try {
    const { data } = await api.get('/config/ai')

    if (data?.ok && data.config) {
      const cfg = data.config

      if (cfg.openai) {
        const o = cfg.openai
        openaiApiKey.value = o.OPENAI_API_KEY || openaiApiKey.value
        openaiChatModel.value = o.OPENAI_CHAT_MODEL || openaiChatModel.value
        openaiTemperature.value = o.OPENAI_TEMPERATURE ?? openaiTemperature.value
        openaiMaxTokens.value = o.OPENAI_MAX_TOKENS ?? openaiMaxTokens.value
        openaiTranscribeModel.value = o.TRANSCRIBE_MODEL || openaiTranscribeModel.value
        mongoConnectionString.value = o.MONGO_CONNECTION_STRING || mongoConnectionString.value

        const openaiPayload = {
          OPENAI_API_KEY: openaiApiKey.value,
          OPENAI_CHAT_MODEL: openaiChatModel.value,
          OPENAI_TEMPERATURE: openaiTemperature.value,
          OPENAI_MAX_TOKENS: openaiMaxTokens.value,
          TRANSCRIBE_MODEL: openaiTranscribeModel.value,
          MONGO_CONNECTION_STRING: mongoConnectionString.value
        }
        localStorage.setItem(STORAGE_KEYS.openai, JSON.stringify(openaiPayload))
      }

      if (cfg.ai) {
        const a = cfg.ai
        iaContextMinutes.value = a.IA_CONTEXT_MAX_MINUTES ?? iaContextMinutes.value
        humanHoldMs.value = a.HUMAN_HOLD_MS ?? humanHoldMs.value
        aiContext.value = a.AI_CONTEXT || aiContext.value
        aiRules.value = a.AI_RULES || aiRules.value
        aiMetadata.value = a.AI_METADATA || aiMetadata.value
        botName.value = a.BOT_NAME || botName.value || 'IANO Bot'
      }

      if (Array.isArray(cfg.data)) {
        dataItems.value = cfg.data
      }

      const aiPayload = {
        IA_CONTEXT_MAX_MINUTES: iaContextMinutes.value,
        HUMAN_HOLD_MS: humanHoldMs.value,
        AI_CONTEXT: aiContext.value,
        AI_RULES: aiRules.value,
        AI_METADATA: aiMetadata.value,
        BOT_NAME: botName.value
      }
      localStorage.setItem(STORAGE_KEYS.ai, JSON.stringify(aiPayload))
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(dataItems.value))
    }
  } catch (err) {
    console.error('Erro ao carregar IA/Data do backend', err)
  }
}

// --------- LOCALSTORAGE: salvar configs individuais ---------
const saveOpenAIConfig = () => {
  try {
    const payload = {
      OPENAI_API_KEY: openaiApiKey.value,
      OPENAI_CHAT_MODEL: openaiChatModel.value,
      OPENAI_TEMPERATURE: openaiTemperature.value,
      OPENAI_MAX_TOKENS: openaiMaxTokens.value,
      TRANSCRIBE_MODEL: openaiTranscribeModel.value,
      MONGO_CONNECTION_STRING: mongoConnectionString.value
    }
    localStorage.setItem(STORAGE_KEYS.openai, JSON.stringify(payload))
    $q.notify({
      color: 'green',
      icon: 'save',
      position: 'top',
      message: 'Configuração da OpenAI/Mongo salva no LocalStorage.'
    })
  } catch (err) {
    console.error(err)
    $q.notify({
      type: 'negative',
      position: 'top',
      message: 'Falha ao salvar configuração OpenAI/Mongo.'
    })
  }
}

const resetOpenAIConfig = () => {
  openaiApiKey.value = ''
  openaiChatModel.value = 'gpt-4.1-mini'
  openaiTemperature.value = 0.8
  openaiMaxTokens.value = 900
  openaiTranscribeModel.value = 'whisper-1'
  mongoConnectionString.value = ''
  saveOpenAIConfig()
}

const saveAIConfig = async () => {
  try {
    savingAI.value = true

    const payload = {
      IA_CONTEXT_MAX_MINUTES: Number(iaContextMinutes.value) || 0,
      HUMAN_HOLD_MS: Number(humanHoldMs.value) || 0,
      AI_CONTEXT: aiContext.value,
      AI_RULES: aiRules.value,
      AI_METADATA: aiMetadata.value,
      BOT_NAME: botName.value || 'IANO Bot'
    }
    localStorage.setItem(STORAGE_KEYS.ai, JSON.stringify(payload))

    await syncAIAndDataToBackend(true)
  } catch (err) {
    console.error(err)
  } finally {
    savingAI.value = false
  }
}

const resetAIConfig = () => {
  iaContextMinutes.value = 5
  humanHoldMs.value = 300000
  aiContext.value = ''
  aiRules.value = ''
  aiMetadata.value = ''
  botName.value = 'IANO Bot'

  const payload = {
    IA_CONTEXT_MAX_MINUTES: iaContextMinutes.value,
    HUMAN_HOLD_MS: humanHoldMs.value,
    AI_CONTEXT: aiContext.value,
    AI_RULES: aiRules.value,
    AI_METADATA: aiMetadata.value,
    BOT_NAME: botName.value
  }
  localStorage.setItem(STORAGE_KEYS.ai, JSON.stringify(payload))

  syncAIAndDataToBackend(false)
}

// salvar itens
const persistDataItems = async (showSuccess = true) => {
  try {
    savingData.value = true
    localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(dataItems.value))

    await syncAIAndDataToBackend(showSuccess)
  } catch (err) {
    console.error(err)
  } finally {
    savingData.value = false
  }
}

const addImageInput = () => {
  if (!Array.isArray(newItem.value.images)) {
    newItem.value.images = []
  }
  newItem.value.images.push('')
}

const removeImageInput = (index) => {
  if (!Array.isArray(newItem.value.images)) return
  newItem.value.images.splice(index, 1)
  if (!newItem.value.images.length) {
    newItem.value.images.push('')
  }
}

const addDataItem = async () => {
  const imagesArray = Array.isArray(newItem.value.images)
    ? newItem.value.images
      .map(v => (v || '').trim())
      .filter(Boolean)
    : []

  const item = {
    title: newItem.value.title?.trim(),
    description: newItem.value.description?.trim(),
    images: imagesArray,
    price: newItem.value.price,
    promoPrice: newItem.value.promoPrice,
    category: newItem.value.category?.trim()
  }

  if (!item.title && !item.description) {
    $q.notify({
      type: 'warning',
      position: 'top',
      message: 'Preencha pelo menos o título ou a descrição.'
    })
    return
  }

  dataItems.value.push(item)

  newItem.value = {
    title: '',
    description: '',
    images: [''],
    price: null,
    promoPrice: null,
    category: ''
  }

  await persistDataItems(true)
}

const removeDataItem = async (index) => {
  dataItems.value.splice(index, 1)
  await persistDataItems(false)
  $q.notify({
    color: 'green',
    icon: 'delete',
    position: 'top',
    message: 'Item removido e configurações atualizadas no banco.'
  })
}

const clearDataItems = async () => {
  dataItems.value = []
  await persistDataItems(true)
}

// normaliza imagens
function normalizedImages (item) {
  if (!item || !item.images) return []
  if (Array.isArray(item.images)) {
    return item.images
      .map(v => (v || '').trim())
      .filter(Boolean)
  }
  if (typeof item.images === 'string') {
    return item.images
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
  }
  return []
}

// --------- Exportar / Importar JSON ---------
const exportConfigToFile = () => {
  try {
    const snap = {
      openai: {
        OPENAI_API_KEY: openaiApiKey.value,
        OPENAI_CHAT_MODEL: openaiChatModel.value,
        OPENAI_TEMPERATURE: openaiTemperature.value,
        OPENAI_MAX_TOKENS: openaiMaxTokens.value,
        TRANSCRIBE_MODEL: openaiTranscribeModel.value,
        MONGO_CONNECTION_STRING: mongoConnectionString.value
      },
      ai: {
        IA_CONTEXT_MAX_MINUTES: Number(iaContextMinutes.value) || 0,
        HUMAN_HOLD_MS: Number(humanHoldMs.value) || 0,
        AI_CONTEXT: aiContext.value,
        AI_RULES: aiRules.value,
        AI_METADATA: aiMetadata.value,
        BOT_NAME: botName.value || 'IANO Bot'
      },
      data: Array.isArray(dataItems.value) ? dataItems.value : []
    }

    const jsonStr = JSON.stringify(snap, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'iano-whatsapp-config.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    $q.notify({
      color: 'green',
      position: 'top',
      message: 'Configuração exportada para iano-whatsapp-config.json'
    })
  } catch (err) {
    console.error(err)
    $q.notify({
      type: 'negative',
      position: 'top',
      message: 'Erro ao exportar configuração para JSON.'
    })
  }
}

const triggerImport = () => {
  if (fileInput.value) {
    fileInput.value.value = ''
    fileInput.value.click()
  }
}

function sanitizeImportedConfig (raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('JSON inválido.')
  }

  const out = {
    openai: {
      OPENAI_API_KEY: '',
      OPENAI_CHAT_MODEL: '',
      OPENAI_TEMPERATURE: 0.8,
      OPENAI_MAX_TOKENS: 900,
      TRANSCRIBE_MODEL: 'whisper-1',
      MONGO_CONNECTION_STRING: ''
    },
    ai: {
      IA_CONTEXT_MAX_MINUTES: 5,
      HUMAN_HOLD_MS: 300000,
      AI_CONTEXT: '',
      AI_RULES: '',
      AI_METADATA: '',
      BOT_NAME: 'IANO Bot'
    },
    data: []
  }

  if (raw.openai && typeof raw.openai === 'object') {
    const o = raw.openai
    out.openai.OPENAI_API_KEY = String(o.OPENAI_API_KEY || '')
    out.openai.OPENAI_CHAT_MODEL = String(o.OPENAI_CHAT_MODEL || '')
    out.openai.OPENAI_TEMPERATURE = Number(o.OPENAI_TEMPERATURE ?? 0.8)
    out.openai.OPENAI_MAX_TOKENS = Number(o.OPENAI_MAX_TOKENS ?? 900)
    out.openai.TRANSCRIBE_MODEL = String(o.TRANSCRIBE_MODEL || 'whisper-1')
    out.openai.MONGO_CONNECTION_STRING = String(o.MONGO_CONNECTION_STRING || '')
  }

  if (raw.ai && typeof raw.ai === 'object') {
    const a = raw.ai
    out.ai.IA_CONTEXT_MAX_MINUTES = Number(a.IA_CONTEXT_MAX_MINUTES ?? 5)
    out.ai.HUMAN_HOLD_MS = Number(a.HUMAN_HOLD_MS ?? 300000)
    out.ai.AI_CONTEXT = String(a.AI_CONTEXT || '')
    out.ai.AI_RULES = String(a.AI_RULES || '')
    out.ai.AI_METADATA = String(a.AI_METADATA || '')
    out.ai.BOT_NAME = String(a.BOT_NAME || 'IANO Bot')
  }

  if (Array.isArray(raw.data)) {
    out.data = raw.data.map((item) => ({
      title: item?.title ? String(item.title) : '',
      description: item?.description ? String(item.description) : '',
      images: Array.isArray(item?.images)
        ? item.images.map(v => String(v || '')).filter(Boolean)
        : [],
      price: typeof item?.price === 'number' ? item.price : null,
      promoPrice: typeof item?.promoPrice === 'number' ? item.promoPrice : null,
      category: item?.category ? String(item.category) : ''
    }))
  }

  return out
}

const handleFileChange = (evt) => {
  const file = evt.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const text = String(e.target?.result || '')
      const parsed = JSON.parse(text)
      const cfg = sanitizeImportedConfig(parsed)

      openaiApiKey.value = cfg.openai.OPENAI_API_KEY
      openaiChatModel.value = cfg.openai.OPENAI_CHAT_MODEL || 'gpt-4.1-mini'
      openaiTemperature.value = cfg.openai.OPENAI_TEMPERATURE ?? 0.8
      openaiMaxTokens.value = cfg.openai.OPENAI_MAX_TOKENS ?? 900
      openaiTranscribeModel.value = cfg.openai.TRANSCRIBE_MODEL || 'whisper-1'
      mongoConnectionString.value = cfg.openai.MONGO_CONNECTION_STRING || ''

      iaContextMinutes.value = cfg.ai.IA_CONTEXT_MAX_MINUTES ?? 5
      humanHoldMs.value = cfg.ai.HUMAN_HOLD_MS ?? 300000
      aiContext.value = cfg.ai.AI_CONTEXT || ''
      aiRules.value = cfg.ai.AI_RULES || ''
      aiMetadata.value = cfg.ai.AI_METADATA || ''
      botName.value = cfg.ai.BOT_NAME || 'IANO Bot'

      dataItems.value = cfg.data || []

      saveOpenAIConfig()
      const aiPayload = {
        IA_CONTEXT_MAX_MINUTES: iaContextMinutes.value,
        HUMAN_HOLD_MS: humanHoldMs.value,
        AI_CONTEXT: aiContext.value,
        AI_RULES: aiRules.value,
        AI_METADATA: aiMetadata.value,
        BOT_NAME: botName.value
      }
      localStorage.setItem(STORAGE_KEYS.ai, JSON.stringify(aiPayload))
      localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(dataItems.value))

      await syncAIAndDataToBackend(false)

      $q.notify({
        color: 'green',
        position: 'top',
        icon: 'save',
        message: 'Configuração importada. Se necessário, clique em "Nova Sessão" para aplicar OpenAI/Mongo.'
      })
    } catch (err) {
      console.error(err)
      $q.notify({
        type: 'negative',
        position: 'top',
        message: 'Erro ao ler/validar o JSON de configuração.'
      })
    } finally {
      evt.target.value = ''
    }
  }
  reader.readAsText(file)
}

// --------- Iniciar / Nova Sessão no backend ---------
const startSession = async () => {
  if (!isRequiredConfigFilled.value) {
    $q.notify({
      type: 'warning',
      position: 'top',
      message: 'Preencha as configurações obrigatórias de OpenAI & Mongo antes de resetar a sessão.'
    })
    return
  }

  const payload = {
    mongoUri: (mongoConnectionString.value || '').trim(),
    openai: {
      OPENAI_API_KEY: (openaiApiKey.value || '').trim(),
      OPENAI_CHAT_MODEL: openaiChatModel.value || 'gpt-4.1-mini',
      OPENAI_TEMPERATURE: Number(openaiTemperature.value) || 0.8,
      OPENAI_MAX_TOKENS: Number(openaiMaxTokens.value) || 900,
      TRANSCRIBE_MODEL: openaiTranscribeModel.value || 'whisper-1'
    }
    // IA + data são lidas do banco pelo backend usando mongoUri como token
  }

  const wasStarted = sessionStartedOnce.value
  const hadPendingChanges = hasPendingChanges.value

  try {
    startSessionLoading.value = true

    if (wasStarted) {
      try {
        await api.post('/reset-session')
      } catch (e) {
        console.error('Falha ao Nova Sessão antes de iniciar novamente', e)
      }
    }

    const { data } = await api.post('/start-session', payload)
    if (!data?.ok) {
      throw new Error(data?.error || 'Erro ao Nova Sessão.')
    }

    sessionStartedOnce.value = true
    localStorage.setItem(STORAGE_KEYS.sessionStarted, '1')
    setSnapshotAsLastApplied()

    let msg
    if (!wasStarted) {
      msg = 'Sessão iniciada! Escaneie o QR Code para conectar o WhatsApp.'
    } else if (hadPendingChanges) {
      msg = 'Sessão resetada e mudanças de OpenAI/Mongo aplicadas! Escaneie o QR Code novamente.'
    } else {
      msg = 'Sessão resetada! Escaneie o QR Code novamente.'
    }

    $q.notify({
      color: 'green',
      position: 'top',
      icon: 'refresh',
      message: msg
    })

    router.push('/iniciar')
  } catch (err) {
    console.error(err)
    $q.notify({
      type: 'negative',
      position: 'top',
      message: 'Erro ao resetar/iniciar a sessão: ' + (err?.message || 'verifique o backend.')
    })
  } finally {
    startSessionLoading.value = false
  }
}

// --- Carrega dados do localStorage e backend ao montar ---
onMounted(async () => {
  try {
    const rawOpenai = localStorage.getItem(STORAGE_KEYS.openai)
    if (rawOpenai) {
      const parsed = JSON.parse(rawOpenai)
      openaiApiKey.value = parsed.OPENAI_API_KEY || ''
      openaiChatModel.value = parsed.OPENAI_CHAT_MODEL || 'gpt-4.1-mini'
      openaiTemperature.value = parsed.OPENAI_TEMPERATURE ?? 0.8
      openaiMaxTokens.value = parsed.OPENAI_MAX_TOKENS ?? 900
      openaiTranscribeModel.value = parsed.TRANSCRIBE_MODEL || 'whisper-1'
      mongoConnectionString.value = parsed.MONGO_CONNECTION_STRING || ''
    }

    const rawAI = localStorage.getItem(STORAGE_KEYS.ai)
    if (rawAI) {
      const parsed = JSON.parse(rawAI)
      iaContextMinutes.value = parsed.IA_CONTEXT_MAX_MINUTES ?? 5
      humanHoldMs.value = parsed.HUMAN_HOLD_MS ?? 300000
      aiContext.value = parsed.AI_CONTEXT || ''
      aiRules.value = parsed.AI_RULES || ''
      aiMetadata.value = parsed.AI_METADATA || ''
      botName.value = parsed.BOT_NAME || 'IANO Bot'
    }

    const rawData = localStorage.getItem(STORAGE_KEYS.data)
    if (rawData) {
      const parsed = JSON.parse(rawData)
      if (Array.isArray(parsed)) {
        dataItems.value = parsed
      }
    }

    const started = localStorage.getItem(STORAGE_KEYS.sessionStarted)
    sessionStartedOnce.value = started === '1'

    const last = localStorage.getItem(STORAGE_KEYS.lastApplied)
    if (last) {
      lastAppliedConfig.value = last
    } else {
      setSnapshotAsLastApplied()
    }

    if (mongoConnectionString.value) {
      await loadAIAndDataFromBackend()
    }
  } catch (err) {
    console.error('Erro ao carregar configs iniciais', err)
  }
})
</script>

<style scoped>
.settings-page {
  max-width: 1100px;
  margin: 0 auto;
}

/* Header do expansion com card glass esverdeado */
.expansion-header {
  margin: 4px;
  padding: 4px 8px;
  border-radius: 14px;
  background: radial-gradient(circle at top left,
  rgba(16, 185, 129, 0.2),
  rgba(15, 23, 42, 0.9));
  border: 1px solid rgba(45, 212, 191, 0.35);
}

/* Estado: completo (verde) */
.expansion-header--ok {
  box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.5);
}

/* Estado: obrigatório pendente (amarelo) */
.expansion-header--warn {
  box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.45);
}

/* Estado: neutro */
.expansion-header--neutral {
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.4);
}

/* deixa conteúdo interno transparente pro glass funcionar */
.section-card :deep(.q-expansion-item__container),
.section-card :deep(.q-item) {
  background: transparent;
}

/* bordas arredondadas em listas/carrossel */
.section-card :deep(.rounded-borders) {
  border-radius: 14px;
}

/* esconde input de upload */
.hidden {
  display: none;
}

/* barra sticky dos botões de ação (mobile + desktop) */
.sticky-actions {
  position: sticky;
  bottom: 0;
  z-index: 5;
  padding: 12px;
  margin-top: 8px;
  background: linear-gradient(to top,
  #151515,
  #15151579,
  transparent);
  backdrop-filter: blur(12px);
}
</style>