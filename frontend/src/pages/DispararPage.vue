<template>
  <q-page class="bg-primary disparo-page q-pa-md q-pa-lg-md">
    <div class="row justify-center q-pt-md">
      <div class="col-12 col-md-10 col-lg-8">

        <!-- Cabeçalho / Hero -->
        <div class="q-mb-lg">
          <div class="row items-center justify-between q-gutter-sm">
            <div class="col">
              <div class="text-h5 text-weight-bold q-mt-xs">
                Disparo para múltiplos contatos
              </div>
              <div class="text-grey q-mt-xs">
                Envie mensagens de texto, imagens ou documentos para grupos de contatos
                de forma simples, organizada e reutilizável.
              </div>
            </div>
          </div>
        </div>

        <!-- CARD PRINCIPAL -->
        <q-card class="q-pa-md q-pa-lg-md rounded-borders">
          <div class="col-auto q-mb-md">
            <q-btn-toggle
              v-model="contactMode"
              dense
              rounded
              unelevated
              color="grey"
              text-color="white"
              toggle-color="accent"
              class="bg-grey-10"
              :options="[
                { label: 'ㅤLista manualㅤ', value: 'manual' },
                { label: 'ㅤGrupo salvoㅤ', value: 'group' }
              ]"
            />
          </div>

          <!-- PASSO 1: DESTINATÁRIOS -->
          <div class="q-mb-lg">
            <!-- MODE: GRUPO -->
            <div v-if="contactMode === 'group'" class="q-mt-sm">
              <div class="row items-center q-gutter-sm q-mb-sm">
                <div class="col">
                  <q-select
                    v-model="selectedGroupLabel"
                    :options="groupOptions"
                    outlined
                    dense
                    emit-value
                    map-options
                    popup-content-class="disparo-select-popup"
                    label="Selecione um grupo de contatos"
                    :loading="groupsLoading"
                    :clearable="!!selectedGroupLabel"
                    use-input
                    input-debounce="0"
                    @filter="onFilterGroups"
                    class="bg-grey rounded-borders"
                  >
                    <template #prepend>
                      <q-icon name="groups" />
                    </template>
                  </q-select>
                </div>

                <div class="col-auto">
                  <q-btn
                    flat
                    round
                    dense
                    icon="refresh"
                    color="grey-4"
                    @click="loadContactGroups"
                    :loading="groupsLoading"
                  >
                    <q-tooltip>Recarregar grupos</q-tooltip>
                  </q-btn>
                </div>
              </div>

              <div v-if="groupsError" class="text-negative text-caption q-mb-xs">
                {{ groupsError }}
              </div>

              <q-banner
                v-if="!groupsLoading && !groups.length"
                dense
                class="bg-grey-9 text-grey-4 q-mt-xs rounded-borders"
              >
                <template #avatar>
                  <q-icon name="info" color="accent" />
                </template>
                Nenhum grupo cadastrado ainda.
                <span class="text-grey-5">
                  Monte uma lista manual e clique em
                  <strong>Salvar grupo</strong> para reutilizar os contatos.
                </span>
              </q-banner>

              <q-banner
                v-else-if="selectedGroup"
                dense
                class="bg-grey-9 text-grey-3 q-mt-sm rounded-borders"
              >
                <template #avatar>
                  <q-icon name="check_circle" color="accent" />
                </template>
                Grupo
                <span class="text-accent text-weight-medium">{{ selectedGroup.label }}</span>
                selecionado com
                <span class="text-accent text-weight-medium">
                  {{ selectedGroup.contacts?.length || 0 }}
                </span>
                contato(s).
                <div
                  v-if="selectedGroup.contacts && selectedGroup.contacts.length"
                  class="text-caption text-grey-4 q-mt-xs"
                >
                  <div class="q-mt-xs">
                    <q-chip
                      v-for="(c, idx) in selectedGroup.contacts"
                      :key="idx"
                      dense
                      color="grey-10"
                      text-color="grey-2"
                      class="q-mr-xs q-mb-xs"
                    >
                      {{ c.name || c.phone || c.chatId }}
                    </q-chip>
                  </div>
                </div>
              </q-banner>

              <!-- AÇÕES DO GRUPO SELECIONADO -->
              <div
                v-if="selectedGroup"
                class="row items-center q-mt-sm q-gutter-sm"
              >
                <div class="col-auto">
                  <q-btn
                    outline
                    dense
                    color="negative"
                    icon="delete"
                    label="Excluir grupo"
                    :loading="deleteGroupLoading"
                    @click="confirmDeleteGroup"
                  />
                </div>
                <div class="col text-caption text-grey-5">
                  A exclusão remove apenas o grupo salvo para disparos.
                  O histórico de mensagens e contatos no WhatsApp permanece intacto.
                </div>
              </div>
            </div>

            <!-- MODE: MANUAL -->
            <div v-else class="q-mt-sm">
              <div class="row items-center q-mb-xs">
                <div class="col">
                  <div class="text-subtitle2 text-grey-2">
                    1. Lista de Contatos
                  </div>
                  <div class="text-caption text-grey-5">
                    Um por linha ou separado por vírgulas
                  </div>
                </div>
                <div class="col-auto text-right">
                  <q-badge color="primary" outline class="q-mr-xs">
                    Válidos: {{ validContactsCount }}
                  </q-badge>
                  <q-badge
                    v-if="invalidContacts.length"
                    color="negative"
                    outline
                  >
                    Inválidos: {{ invalidContacts.length }}
                  </q-badge>
                </div>
              </div>

              <q-input
                v-model="bulkForm.contactsRaw"
                type="textarea"
                autogrow
                outlined
                dense
                class="bg-grey rounded-borders"
                placeholder="+5511999999999
+5562999999999
(11) 99999-9999"
              >
                <template #prepend>
                  <q-icon name="group" />
                </template>
              </q-input>

              <div
                v-if="invalidContacts.length"
                class="text-caption text-negative q-mt-xs"
              >
                Alguns números parecem inválidos (menos de 10 dígitos):
                <span class="text-grey-3">
                  {{ invalidContacts.join(', ') }}
                </span>
              </div>

              <div class="row items-center justify-between q-mt-sm q-gutter-sm">
                <div class="col-12 col-sm-auto">
                  <q-btn
                    outline
                    dense
                    color="accent"
                    icon="save"
                    label="Salvar grupo"
                    @click="openSaveGroupDialog"
                    :disable="parsedContacts.length === 0"
                  />
                </div>
                <div class="col text-caption text-grey-5">
                  Use essa opção para reaproveitar essa lista em futuras campanhas
                  sem precisar colar os números novamente.
                </div>
              </div>
            </div>
          </div>

          <q-separator dark class="q-my-md" />

          <!-- PASSO 2: CONTEÚDO -->
          <div class="q-mb-md">
            <div class="text-subtitle2 text-grey-2 q-mb-xs">
              2. Conteúdo
            </div>

            <q-tabs
              v-model="bulkMode"
              dense
              class="text-grey-3 bg-grey-10 rounded-borders q-mb-sm"
              indicator-color="accent"
            >
              <q-tab name="text" label="Texto" icon="chat_bubble_outline" />
              <q-tab name="upload" label="Upload Arquivo" icon="cloud_upload" />
              <q-tab name="media" label="URL" icon="image" />
            </q-tabs>

            <q-tab-panels v-model="bulkMode" animated class="bg-transparent">
              <!-- TAB TEXTO -->
              <q-tab-panel name="text" class="q-pa-none q-pt-sm">
                <q-input
                  v-model="bulkForm.text"
                  type="textarea"
                  autogrow
                  outlined
                  dense
                  class="bg-grey rounded-borders"
                  label="Mensagem de texto"
                  placeholder="Ex: Olá! Estamos com uma condição especial para você hoje 🚀"
                >
                  <template #prepend>
                    <q-icon name="chat" />
                  </template>
                </q-input>
                <div class="text-caption text-grey-5 q-mt-xs">
                  Esta mensagem será enviada como texto para todos os contatos.
                </div>
              </q-tab-panel>

              <!-- TAB MÍDIA POR URL -->
              <q-tab-panel name="media" class="q-pa-none q-pt-sm">
                <q-input
                  v-model="bulkForm.mediaUrl"
                  outlined
                  dense
                  class="bg-grey rounded-borders q-mb-sm"
                  label="URL da imagem ou documento"
                  placeholder="https://meus-arquivos.com/imagem.jpg"
                >
                  <template #prepend>
                    <q-icon name="link" />
                  </template>
                </q-input>

                <q-input
                  v-model="bulkForm.caption"
                  type="textarea"
                  autogrow
                  outlined
                  dense
                  class="bg-grey rounded-borders"
                  label="Legenda (opcional)"
                  placeholder="Ex: Segue o material da campanha 📎"
                >
                  <template #prepend>
                    <q-icon name="notes" />
                  </template>
                </q-input>

                <div class="text-caption text-grey-5 q-mt-xs">
                  O WhatsApp irá baixar a mídia a partir da URL informada
                  e enviar com a legenda (se preenchida).
                </div>
              </q-tab-panel>

              <!-- TAB UPLOAD ARQUIVO -->
              <q-tab-panel name="upload" class="q-pa-none q-pt-sm">
                <q-file
                  v-model="bulkForm.file"
                  outlined
                  dense
                  class="bg-grey-8 rounded-borders q-mb-sm"
                  label="Arquivo para enviar (imagem / PDF / etc)"
                  clearable
                  use-chips
                  accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                >
                  <template #prepend>
                    <q-icon name="attach_file" />
                  </template>
                </q-file>

                <q-input
                  v-model="bulkForm.caption"
                  type="textarea"
                  autogrow
                  outlined
                  dense
                  class="bg-grey rounded-borders"
                  label="Legenda (opcional)"
                  placeholder="Ex: Segue o documento da campanha 🔎"
                >
                  <template #prepend>
                    <q-icon name="notes" />
                  </template>
                </q-input>

                <div class="text-caption text-grey-5 q-mt-xs">
                  O arquivo será enviado como mídia para todos os contatos.
                  A legenda é opcional.
                </div>
              </q-tab-panel>
            </q-tab-panels>
          </div>

          <q-separator dark class="q-my-md" />

          <!-- PASSO 3: RESUMO + AÇÕES -->
          <div class="row items-center justify-between q-gutter-sm">
            <div class="col-12 col-md">
              <div class="text-caption text-grey-5 q-mb-xs">
                3. Resumo da Campanha
              </div>
              <div class="text-caption">
                {{ effectiveContacts.length }} contato(s) destinatário(s).
                <span
                  v-if="contactMode === 'manual' && invalidContacts.length"
                  class="text-negative"
                >
                  {{ invalidContacts.length }} inválido(s).
                </span>
              </div>
              <div class="text-caption text-grey-5">
                Destinatários:
                <span class="text-accent text-weight-medium">
                  {{ contactMode === 'manual' ? 'Lista manual' : (selectedGroupLabel || 'Grupo não selecionado') }}
                </span>
              </div>
              <div class="text-caption text-grey-5">
                Conteúdo:
                <span class="text-accent text-weight-medium">{{ modeLabel }}</span>
              </div>
            </div>

            <div class="col-12 col-md-auto text-right q-gutter-sm q-mt-sm q-mt-md-none">
              <q-btn
                flat
                dense
                color="grey-5"
                icon="cleaning_services"
                label="Limpar campos"
                @click="resetForm"
              />
              <q-btn
                unelevated
                color="accent"
                :disable="!canSendBulk || bulkLoading"
                :loading="bulkLoading"
                :icon-right="bulkMode === 'text' ? 'send' : 'rocket_launch'"
                label="Enviar campanha"
                @click="onSubmitBulk"
              />
            </div>
          </div>

          <!-- Resposta da API -->
          <div v-if="bulkResponse" class="q-mt-lg">
            <q-expansion-item
              icon="analytics"
              label="Resultado da última campanha"
              header-class="text-grey-2"
              expand-icon-class="text-grey-4"
              default-opened
            >
              <q-card flat bordered class="q-mt-sm bg-grey-10">
                <q-card-section class="q-pa-sm">
                  <pre
                    class="text-caption text-grey-2"
                    style="white-space: pre-wrap; max-height: 280px; overflow: auto;"
                  >{{ formattedBulkResponse }}</pre>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </div>
        </q-card>
      </div>
    </div>

    <!-- DIALOG: SALVAR GRUPO -->
    <q-dialog v-model="saveGroupDialog" persistent>
      <q-card class="save-group-card q-pa-md q-pa-lg-md">
        <q-card-section class="row items-center justify-between q-pb-sm">
          <div class="text-subtitle1 text-grey-2">
            Salvar grupo de contatos
          </div>
          <q-btn
            flat
            round
            dense
            icon="close"
            color="grey-5"
            @click="saveGroupDialog = false"
          />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="saveGroupLabel"
            outlined
            dense
            class="bg-grey rounded-borders q-mb-sm"
            label="Nome do grupo (obrigatório)"
            placeholder="Ex: Clientes ativos, Leads Outubro, VIPs..."
          >
            <template #prepend>
              <q-icon name="label" />
            </template>
          </q-input>

          <q-input
            v-model="saveGroupDescription"
            type="textarea"
            outlined
            dense
            autogrow
            class="bg-grey rounded-borders q-mb-md"
            label="Descrição do grupo (opcional)"
            placeholder="Ex: Contatos que aceitaram receber novidades da campanha X."
          >
            <template #prepend>
              <q-icon name="notes" />
            </template>
          </q-input>

          <div class="text-caption text-grey-5 q-mb-xs">
            Revise os contatos e, se quiser, associe nomes a cada número
            para facilitar o reconhecimento no futuro.
          </div>

          <div class="save-group-list q-mt-sm">
            <q-list dense>
              <q-item
                v-for="(c, idx) in saveGroupContactsForm"
                :key="idx"
                class="q-px-none"
              >
                <q-item-section>
                  <div class="row q-col-gutter-sm">
                    <div class="col-12 col-sm-5">
                      <q-input
                        v-model="c.phone"
                        dense
                        outlined
                        class="bg-grey rounded-borders"
                        label="Telefone"
                        placeholder="+5511999999999"
                      >
                        <template #prepend>
                          <q-icon name="phone" />
                        </template>
                      </q-input>
                    </div>
                    <div class="col-12 col-sm-7">
                      <q-input
                        v-model="c.name"
                        dense
                        outlined
                        class="bg-grey rounded-borders"
                        label="Nome (opcional)"
                        placeholder="Ex: João Silva"
                      >
                        <template #prepend>
                          <q-icon name="person" />
                        </template>
                      </q-input>
                    </div>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pt-md">
          <q-btn
            flat
            dense
            color="grey-5"
            label="Cancelar"
            @click="saveGroupDialog = false"
          />
          <q-btn
            unelevated
            color="accent"
            :disable="!canSaveGroup || saveGroupLoading"
            :loading="saveGroupLoading"
            icon="save"
            label="Salvar grupo"
            @click="onSaveGroup"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onBeforeMount } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useRouter } from 'vue-router'

const $q = useQuasar()
const router = useRouter()
const apiBaseUrl = api.defaults.baseURL || 'http://localhost:10000'

// modo de disparo
const bulkMode = ref('text') // 'text' | 'media' | 'upload'

// modo de destinatários
const contactMode = ref('manual') // 'manual' | 'group'

// grupos de contatos
const groups = ref([])
const groupsLoading = ref(false)
const groupsError = ref('')
const selectedGroupLabel = ref(null)
const deleteGroupLoading = ref(false)

// formulário principal
const bulkForm = ref({
  contactsRaw: '',
  text: '',
  mediaUrl: '',
  caption: '',
  file: null // File (no modo upload)
})

const bulkLoading = ref(false)
const bulkResponse = ref(null)

// mobile?
const isMobile = computed(() => $q.screen.lt.md)

// ===== CONTATOS MANUAIS =====
const parsedContacts = computed(() => {
  const raw = bulkForm.value.contactsRaw || ''
  return raw
    .split(/[\n,;,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
})

// inválido = menos de 10 dígitos numéricos (apenas no modo manual)
const invalidContacts = computed(() => {
  if (contactMode.value !== 'manual') return []
  return parsedContacts.value.filter((raw) => {
    const digits = raw.replace(/\D/g, '')
    return digits.length < 10
  })
})

// ===== GRUPOS =====
const groupOptions = computed(() =>
  groups.value.map((g) => ({
    label: `${g.label} (${g.contacts?.length || 0})`,
    value: g.label
  }))
)

const selectedGroup = computed(() => {
  if (!selectedGroupLabel.value) return null
  return groups.value.find((g) => g.label === selectedGroupLabel.value) || null
})

// contatos efetivos usados no disparo (grupo OU manual)
const effectiveContacts = computed(() => {
  if (contactMode.value === 'group') {
    if (!selectedGroup.value) return []
    return (selectedGroup.value.contacts || [])
      .map((c) => c.chatId || c.phone)
      .filter(Boolean)
  }
  return parsedContacts.value
})

const validContactsCount = computed(() => {
  const total = effectiveContacts.value.length
  const invalid = invalidContacts.value.length
  return Math.max(0, total - invalid)
})

const canSendBulk = computed(() => {
  const hasContacts = effectiveContacts.value.length > 0
  if (!hasContacts) return false

  if (contactMode.value === 'manual' && invalidContacts.value.length > 0) {
    return false
  }

  if (bulkMode.value === 'text') {
    return !!bulkForm.value.text.trim()
  }
  if (bulkMode.value === 'media') {
    return !!bulkForm.value.mediaUrl.trim()
  }
  if (bulkMode.value === 'upload') {
    return !!bulkForm.value.file
  }
  return false
})

const modeLabel = computed(() => {
  if (bulkMode.value === 'text') return 'Somente texto'
  if (bulkMode.value === 'media') return 'Mídia por URL'
  if (bulkMode.value === 'upload') return 'Upload de arquivo'
  return bulkMode.value
})

const formattedBulkResponse = computed(() => {
  if (!bulkResponse.value) return ''
  try {
    return JSON.stringify(bulkResponse.value, null, 2)
  } catch {
    return String(bulkResponse.value)
  }
})

function resetForm () {
  bulkForm.value = {
    contactsRaw: '',
    text: '',
    mediaUrl: '',
    caption: '',
    file: null
  }
  bulkResponse.value = null
  contactMode.value = 'manual'
  selectedGroupLabel.value = null
}

// carregar grupos da API
async function loadContactGroups () {
  try {
    groupsLoading.value = true
    groupsError.value = ''
    const resp = await api.get('/contact-groups')
    const list = Array.isArray(resp.data?.groups) ? resp.data.groups : []
    groups.value = list

    if (!selectedGroupLabel.value && list.length) {
      selectedGroupLabel.value = list[0].label
    } else if (
      selectedGroupLabel.value &&
      !list.some((g) => g.label === selectedGroupLabel.value)
    ) {
      selectedGroupLabel.value = list.length ? list[0].label : null
    }
  } catch (err) {
    console.error('[contact-groups] error', err)
    groupsError.value =
      'Escaneie o QR Code na aba INICIAR para efetuar disparos em massa.'
    $q.notify({
      color: 'primary',
      position: 'top',
      textColor: 'white',
      icon: 'qr_code',
      message: groupsError.value
    })
  } finally {
    groupsLoading.value = false
  }
}

// filter do q-select (cliente-side apenas)
function onFilterGroups (val, update) {
  update(() => {
    if (!val) {
      return
    }
    // Mantido simples (q-select já filtra pelo label)
    const needle = val.toLowerCase()
    void needle
  })
}

// confirmar exclusão de grupo
function confirmDeleteGroup () {
  if (!selectedGroup.value) return

  $q.dialog({
    title: 'Excluir grupo',
    message: `Tem certeza que deseja excluir o grupo "${selectedGroup.value.label}"?`,
    cancel: true,
    class: 'text-white',
    persistent: true,
    ok: {
      label: 'Excluir',
      color: 'negative',
      iconRight: 'delete'
    },
    cancel: {
      label: 'Cancelar',
      flat: true,
      color: 'grey-5'
    }
  }).onOk(() => {
    onDeleteGroup()
  })
}

// efetivamente excluir grupo
async function onDeleteGroup () {
  if (!selectedGroup.value) return

  const label = selectedGroup.value.label

  try {
    deleteGroupLoading.value = true

    const resp = await api.delete(`/contact-groups/${encodeURIComponent(label)}`)
    const data = resp.data

    if (!data?.ok) {
      throw new Error(data?.error || 'Falha ao excluir grupo.')
    }

    groups.value = groups.value.filter((g) => g.label !== label)

    if (groups.value.length > 0) {
      selectedGroupLabel.value = groups.value[0].label
    } else {
      selectedGroupLabel.value = null
      contactMode.value = 'manual'
    }

    $q.notify({
      color: 'positive',
      position: 'top',
      icon: 'delete',
      message: `Grupo "${label}" excluído com sucesso.`
    })
  } catch (err) {
    console.error('[delete-group] error', err)
    $q.notify({
      type: 'negative',
      position: 'top',
      icon: 'error',
      message:
        err?.response?.data?.error ||
        err?.message ||
        'Erro ao excluir grupo.'
    })
  } finally {
    deleteGroupLoading.value = false
  }
}

// enviar campanha
const onSubmitBulk = async () => {
  if (!canSendBulk.value) return

  const contacts = effectiveContacts.value

  if (contactMode.value === 'group' && !selectedGroup.value) {
    $q.notify({
      type: 'warning',
      position: 'top',
      message: 'Selecione um grupo de contatos antes de enviar.'
    })
    return
  }

  if (!contacts.length) {
    $q.notify({
      type: 'warning',
      position: 'top',
      message: 'Nenhum contato válido encontrado para o disparo.'
    })
    return
  }

  if (contactMode.value === 'manual' && invalidContacts.value.length) {
    $q.notify({
      type: 'warning',
      position: 'top',
      message:
        'Existem números inválidos na lista manual. Corrija antes de enviar.'
    })
    return
  }

  try {
    bulkLoading.value = true
    bulkResponse.value = null

    let data

    if (bulkMode.value === 'upload') {
      // modo upload: multipart/form-data → /send-bulk-upload
      const formData = new FormData()
      formData.append('contacts', JSON.stringify(contacts))
      formData.append('file', bulkForm.value.file)

      const caption =
        (bulkForm.value.caption && bulkForm.value.caption.trim()) ||
        (bulkForm.value.text && bulkForm.value.text.trim()) ||
        ''

      if (caption) {
        formData.append('caption', caption)
      }

      const resp = await api.post('/send-bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      data = resp.data
    } else {
      // modos text/media via /send-bulk
      const payload = {
        contacts
      }

      if (bulkMode.value === 'media' && bulkForm.value.mediaUrl.trim()) {
        payload.mediaUrl = bulkForm.value.mediaUrl.trim()
        const caption =
          (bulkForm.value.caption && bulkForm.value.caption.trim()) ||
          (bulkForm.value.text && bulkForm.value.text.trim()) ||
          ''
        if (caption) payload.caption = caption
      } else {
        payload.text = bulkForm.value.text.trim()
      }

      const resp = await api.post('/send-bulk', payload)
      data = resp.data
    }

    bulkResponse.value = data

    if (data?.ok) {
      $q.notify({
        color: 'positive',
        position: 'top',
        icon: 'check_circle',
        message: `Disparo concluído: ${data.success || 0}/${data.count || contacts.length} contatos OK.`
      })
    } else {
      $q.notify({
        type: 'negative',
        position: 'top',
        icon: 'error',
        message: data?.error || 'Falha ao enviar campanha.'
      })
    }
  } catch (err) {
    console.error('[send-bulk] error', err)
    bulkResponse.value = err?.response?.data || { error: err?.message }
    $q.notify({
      type: 'negative',
      position: 'top',
      icon: 'error',
      message:
        err?.response?.data?.error ||
        err?.message ||
        'Erro ao enviar campanha.'
    })
  } finally {
    bulkLoading.value = false
  }
}

function formatDate (d) {
  try {
    const date = new Date(d)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString('pt-BR')
  } catch {
    return ''
  }
}

// ====== MODAL DE SALVAR GRUPO ======
const saveGroupDialog = ref(false)
const saveGroupLabel = ref('')
const saveGroupDescription = ref('')
const saveGroupContactsForm = ref([])
const saveGroupLoading = ref(false)

const canSaveGroup = computed(() => {
  if (!saveGroupLabel.value.trim()) return false
  const contacts = saveGroupContactsForm.value || []
  const valid = contacts.filter((c) => {
    const digits = (c.phone || '').replace(/\D/g, '')
    return digits.length >= 10
  })
  return valid.length > 0
})

function openSaveGroupDialog () {
  if (!parsedContacts.value.length) {
    $q.notify({
      type: 'warning',
      position: 'top',
      message: 'Preencha ao menos um contato na lista manual.'
    })
    return
  }

  saveGroupLabel.value = ''
  saveGroupDescription.value = ''
  saveGroupContactsForm.value = parsedContacts.value.map((phone) => ({
    phone,
    name: ''
  }))

  saveGroupDialog.value = true
}

async function onSaveGroup () {
  if (!canSaveGroup.value) return

  try {
    saveGroupLoading.value = true

    const cleanedContacts = (saveGroupContactsForm.value || [])
      .map((c) => {
        const digits = (c.phone || '').replace(/\D/g, '')
        if (digits.length < 10) return null
        return {
          name: (c.name || '').trim() || null,
          phone: digits
        }
      })
      .filter(Boolean)

    const payload = {
      label: saveGroupLabel.value.trim(),
      description: saveGroupDescription.value.trim() || undefined,
      contacts: cleanedContacts
    }

    const resp = await api.post('/contact-groups', payload)
    const data = resp.data

    if (!data?.ok) {
      throw new Error(data?.error || 'Falha ao salvar grupo.')
    }

    $q.notify({
      color: 'positive',
      position: 'top',
      icon: 'check_circle',
      message:
        'Grupo salvo com sucesso! Ele já está disponível na aba "Grupo salvo".'
    })

    saveGroupDialog.value = false

    // recarrega grupos e já seleciona o grupo recém-criado
    await loadContactGroups()
    selectedGroupLabel.value = payload.label
    contactMode.value = 'group'
  } catch (err) {
    console.error('[save-group] error', err)
    $q.notify({
      color: 'negative',
      position: 'top',
      icon: 'error',
      message:
        err?.response?.data?.error ||
        err?.message ||
        'Erro ao salvar grupo.'
    })
  } finally {
    saveGroupLoading.value = false
  }
}

onBeforeMount(() => {
  loadContactGroups()
})
</script>

<style scoped>
.disparo-page {
  color: #e5e7eb;
}

.disparo-select-popup {
  background: #020617;
  color: #e5e7eb;
}

code {
  font-family: 'JetBrains Mono', Menlo, Monaco, Consolas, 'Courier New',
    monospace;
  font-size: 0.75rem;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.9);
}

/* Dialog de salvar grupo */
.save-group-card {
  width: 100%;
  max-width: 720px;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.4);
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
}

.save-group-list {
  max-height: 320px;
  overflow-y: auto;
  border-radius: 12px;
  border: 1px solid rgba(30, 64, 175, 0.4);
  padding: 4px 10px;
  background: radial-gradient(
    circle at top left,
    rgba(30, 64, 175, 0.25),
    transparent 60%
  );
}
</style>
