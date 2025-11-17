<template>
  <q-page class="bg-dark q-pa-md">
    <div class="settings-page">

      <!-- Header -->
      <div class="q-mb-lg">
        <div class="text-h4 text-grey-3 q-mb-xs">
          Configurações
        </div>
        <div class="text-subtitle2 text-grey-7">
          Ajuste as chaves da OpenAI, conexão com banco, regras da IA e os dados que ela vai usar.
        </div>
      </div>

      <!-- CARD: API -->
      <q-card class="q-mb-md shadow-2 section-card">
        <q-expansion-item
          dense-toggle
          expand-separator
          icon="vpn_key"
          label="Configurar OpenAI"
          caption="Chaves de API e Modelo do Chat"
          default-opened
        >
          <q-card-section>
            <q-form class="q-gutter-md" @submit="saveOpenAIConfig">

              <!-- OPENAI_API_KEY -->
              <q-input
                v-model="openaiApiKey"
                label="OPENAI_API_KEY"
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
                label="OPENAI_CHAT_MODEL"
                outlined
                dense
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

              <div class="row justify-end q-gutter-sm q-mt-md">
                <q-btn
                  flat
                  color="primary"
                  icon="restore"
                  label="Resetar"
                  @click="resetOpenAIConfig"
                />
                <q-btn
                  class="bg-accent text-white"
                  icon-right="save"
                  label="Salvar"
                  type="submit"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-expansion-item>
      </q-card>

      <!-- CARD: Configurações da IA -->
      <q-card class="q-mb-md shadow-2 section-card">
        <q-expansion-item
          dense-toggle
          expand-separator
          icon="smart_toy"
          label="Configurações da IA"
          caption="Janela de contexto, cooldown e prompt"
        >
          <q-card-section>
            <q-form class="q-gutter-md" @submit="saveAIConfig">

              <!-- IA_CONTEXT_MAX_MINUTES -->
              <q-input
                v-model.number="iaContextMinutes"
                type="number"
                label="IA_CONTEXT_MAX_MINUTES"
                outlined
                dense
                :min="0"
              >
                <template #append>
                  <q-icon name="help_outline" class="cursor-pointer">
                    <q-tooltip>
                      Minutos de histórico da conversa considerados para a IA. Ex.: 5 = mensagens dos últimos 5 minutos.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>

              <!-- HUMAN_HOLD_MS -->
              <q-input
                v-model.number="humanHoldMs"
                type="number"
                label="HUMAN_HOLD_MS (ms)"
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

              <div class="row justify-end q-gutter-sm q-mt-md">
                <q-btn
                  flat
                  color="primary"
                  icon="restore"
                  label="Resetar"
                  @click="resetAIConfig"
                />
              </div>
              <div class="row justify-end q-gutter-sm q-mt-xs">
                <q-btn
                  class="bg-accent text-white"
                  icon-right="save"
                  label="Salvar"
                  type="submit"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-expansion-item>
      </q-card>

      <!-- CARD: Dados para a IA (catálogo etc.) -->
      <q-card class="q-mb-md shadow-2 section-card">
        <q-expansion-item
          dense-toggle
          expand-separator
          icon="dataset"
          label="Dados da IA (itens com título, preço etc.)"
          caption="Informações que podem ser usadas no contexto"
        >
          <q-card-section>
            <q-form class="q-gutter-md" @submit="addDataItem">

              <div class="row q-col-gutter-sm">
                <div class="col-12 col-md-6">
                  <!-- Título -->
                  <q-input
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
                    <div class="text-caption text-grey-6">
                      Imagens (uma URL por campo)
                    </div>
                    <q-btn
                      dense
                      flat
                      icon="add_photo_alternate"
                      label="Adicionar imagem"
                      @click="addImageInput"
                    />
                  </div>

                  <div
                    v-for="(img, idx) in newItem.images"
                    :key="idx"
                    class="row items-center q-mb-xs no-wrap"
                  >
                    <div class="col">
                      <q-input
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
                        color="negative"
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
                      :ratio="16/9"
                    />
                  </div>
                </div>

                <div class="col-6 col-md-3">
                  <!-- Preço -->
                  <q-input
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

              <div class="row justify-end q-gutter-sm q-mt-md">
                <q-btn
                  flat
                  color="primary"
                  icon="delete_sweep"
                  label="Limpar itens"
                  @click="clearDataItems"
                />
                <q-btn
                  class="bg-accent text-white"
                  icon-right="save"
                  label="Salvar"
                  type="submit"
                />
              </div>
            </q-form>

            <!-- Lista de itens salvos -->
            <div v-if="dataItems.length" class="q-mt-lg">
              <div class="text-subtitle2 text-grey-7 q-mb-sm">
                Itens cadastrados (JSON salvo em localStorage)
              </div>
              <q-list bordered separator class="rounded-borders">
                <q-item
                  v-for="(item, index) in dataItems"
                  :key="index"
                  clickable
                >
                  <q-item-section>
                    <q-item-label class="text-weight-medium">
                      {{ item.title || 'Sem título' }}
                    </q-item-label>
                    <q-item-label caption>
                      {{ item.description || 'Sem descrição' }}
                    </q-item-label>
                    <q-item-label caption class="q-mt-xs">
                      <span v-if="item.category">Categoria: {{ item.category }} • </span>
                      <span v-if="item.price">Preço: R$ {{ Number(item.price).toFixed(2) }}</span>
                      <span v-if="item.promoPrice">
                        &nbsp;| Promo: R$ {{ Number(item.promoPrice).toFixed(2) }}
                      </span>
                    </q-item-label>

                    <!-- Carrossel de imagens + prévia -->
                    <div v-if="normalizedImages(item).length" class="q-mt-sm">
                      <q-carousel
                        swipeable
                        animated
                        infinite
                        navigation
                        arrows
                        height="200px"
                        class="rounded-borders"
                      >
                        <q-carousel-slide
                          v-for="(src, imgIdx) in normalizedImages(item)"
                          :key="imgIdx"
                          :name="imgIdx"
                        >
                          <q-img
                            :src="src"
                            :alt="item.title || `Imagem ${imgIdx + 1}`"
                            class="fit rounded-borders"
                            :ratio="16/9"
                          />
                        </q-carousel-slide>
                      </q-carousel>

                      <div class="q-mt-sm">
                        <div class="text-caption text-grey-7 q-mb-xs">
                          Prévia da primeira imagem
                        </div>
                        <q-img
                          :src="normalizedImages(item)[0]"
                          :alt="item.title || 'Prévia'"
                          class="rounded-borders"
                          style="max-width: 180px"
                          :ratio="16/9"
                        />
                      </div>
                    </div>
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
import { ref, onMounted, computed } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const STORAGE_KEYS = {
  openai: 'config_openai',
  ai: 'config_ai_settings',
  data: 'config_ai_data_items'
};

// Opções de modelos da OpenAI
const openaiModelOptions = [
  { label: 'gpt-4.1-mini (padrão)', value: 'gpt-4.1-mini' },
  { label: 'gpt-4.1', value: 'gpt-4.1' },
  { label: 'gpt-4o-mini', value: 'gpt-4o-mini' },
  { label: 'gpt-4o', value: 'gpt-4o' },
  { label: 'gpt-3.5-turbo (legado)', value: 'gpt-3.5-turbo' }
];

// --- FORM 1: OpenAI ---
const openaiApiKey = ref('');
const openaiChatModel = ref('gpt-4.1-mini');

const saveOpenAIConfig = () => {
  try {
    const payload = {
      OPENAI_API_KEY: openaiApiKey.value,
      OPENAI_CHAT_MODEL: openaiChatModel.value,
    };
    localStorage.setItem(STORAGE_KEYS.openai, JSON.stringify(payload));
    $q.notify({ type: 'positive', message: 'Configuração da OpenAI salva no localStorage.' });
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: 'Falha ao salvar configuração OpenAI.' });
  }
};

const resetOpenAIConfig = () => {
  openaiApiKey.value = '';
  openaiChatModel.value = 'gpt-4.1-mini';
  saveOpenAIConfig();
};

// --- FORM 2: IA Settings ---
const iaContextMinutes = ref(5);        // default 5
const humanHoldMs = ref(300000);        // default 300000
const aiContext = ref('');
const aiRules = ref('');
const aiMetadata = ref('');

const saveAIConfig = () => {
  try {
    const payload = {
      IA_CONTEXT_MAX_MINUTES: Number(iaContextMinutes.value) || 0,
      HUMAN_HOLD_MS: Number(humanHoldMs.value) || 0,
      AI_CONTEXT: aiContext.value,
      AI_RULES: aiRules.value,
      AI_METADATA: aiMetadata.value
    };
    localStorage.setItem(STORAGE_KEYS.ai, JSON.stringify(payload));
    $q.notify({ type: 'positive', message: 'Configurações da IA salvas no localStorage.' });
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: 'Falha ao salvar configurações da IA.' });
  }
};

const resetAIConfig = () => {
  iaContextMinutes.value = 5;
  humanHoldMs.value = 300000;
  aiContext.value = '';
  aiRules.value = '';
  aiMetadata.value = '';
  saveAIConfig();
};

// --- FORM 3: Dados (itens) ---
const newItem = ref({
  title: '',
  description: '',
  images: [''], // um campo de imagem vazio por padrão
  price: null,
  promoPrice: null,
  category: ''
});

const dataItems = ref([]);

// computed para prévia das imagens no formulário
const previewImages = computed(() => {
  const imgs = newItem.value.images;
  if (!Array.isArray(imgs)) return [];
  return imgs
    .map(v => (v || '').trim())
    .filter(Boolean);
});

const persistDataItems = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(dataItems.value));
    $q.notify({ type: 'positive', message: 'Itens salvos em localStorage (JSON atualizado).' });
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: 'Falha ao salvar itens no localStorage.' });
  }
};

const addImageInput = () => {
  if (!Array.isArray(newItem.value.images)) {
    newItem.value.images = [];
  }
  newItem.value.images.push('');
};

const removeImageInput = (index) => {
  if (!Array.isArray(newItem.value.images)) return;
  newItem.value.images.splice(index, 1);
  if (!newItem.value.images.length) {
    newItem.value.images.push('');
  }
};

const addDataItem = () => {
  const imagesArray = Array.isArray(newItem.value.images)
    ? newItem.value.images
        .map(v => (v || '').trim())
        .filter(Boolean)
    : [];

  const item = {
    title: newItem.value.title?.trim(),
    description: newItem.value.description?.trim(),
    images: imagesArray,
    price: newItem.value.price,
    promoPrice: newItem.value.promoPrice,
    category: newItem.value.category?.trim()
  };

  // não adiciona item vazio
  if (!item.title && !item.description) {
    $q.notify({ type: 'warning', message: 'Preencha pelo menos o título ou a descrição.' });
    return;
  }

  dataItems.value.push(item);

  // limpa form
  newItem.value = {
    title: '',
    description: '',
    images: [''],
    price: null,
    promoPrice: null,
    category: ''
  };

  persistDataItems();
};

const removeDataItem = (index) => {
  dataItems.value.splice(index, 1);
  persistDataItems();
};

const clearDataItems = () => {
  dataItems.value = [];
  persistDataItems();
};

// normaliza imagens (aceita string antiga separada por vírgula ou array novo)
function normalizedImages (item) {
  if (!item || !item.images) return [];
  if (Array.isArray(item.images)) {
    return item.images
      .map(v => (v || '').trim())
      .filter(Boolean);
  }
  if (typeof item.images === 'string') {
    return item.images
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
  }
  return [];
}

// --- Carrega dados do localStorage ao montar ---
onMounted(() => {
  try {
    const rawOpenai = localStorage.getItem(STORAGE_KEYS.openai);
    if (rawOpenai) {
      const parsed = JSON.parse(rawOpenai);
      openaiApiKey.value = parsed.OPENAI_API_KEY || '';
      openaiChatModel.value = parsed.OPENAI_CHAT_MODEL || 'gpt-4.1-mini';
    }

    const rawAI = localStorage.getItem(STORAGE_KEYS.ai);
    if (rawAI) {
      const parsed = JSON.parse(rawAI);
      iaContextMinutes.value = parsed.IA_CONTEXT_MAX_MINUTES ?? 5;
      humanHoldMs.value = parsed.HUMAN_HOLD_MS ?? 300000;
      aiContext.value = parsed.AI_CONTEXT || '';
      aiRules.value = parsed.AI_RULES || '';
      aiMetadata.value = parsed.AI_METADATA || '';
    }

    const rawData = localStorage.getItem(STORAGE_KEYS.data);
    if (rawData) {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed)) {
        dataItems.value = parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao carregar configs do localStorage', err);
  }
});
</script>

<style scoped>
.settings-page {
  max-width: 1100px;
  margin: 0 auto;
}

/* Glassmorphism nos cards/collapses */
.section-card {
  background: #f9fcffd0; /* fundo escuro translúcido */
  border: 1px solid rgba(148, 163, 184, 0.4); /* cinza azulado */
  box-shadow: 0 18px 45px #03183163;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

/* deixa conteúdo do expansion transparente pra aparecer o glass do card */
.section-card :deep(.q-expansion-item__container),
.section-card :deep(.q-item) {
  background: transparent;
}

/* bordas arredondadas mais suaves em listas/carrossel */
.section-card :deep(.rounded-borders) {
  border-radius: 14px;
}

</style>
