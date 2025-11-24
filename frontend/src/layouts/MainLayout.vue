<template>
  <q-layout view="hHh lpR fFf">

    <q-header elevated class="bg-glass text-white" height-hint="98">
      <div class="row no-wrap w100 justify-between q-px-sm">
        <q-toolbar @click="goToDoc()" class="cursor-pointer">
          <q-toolbar-title class="row items-center">
            <q-img src="https://static.whatsapp.net/rsrc.php/v4/yP/r/rYZqPCBaG70.png" width="30px" class="q-mr-sm" />
            IanoWhatsapp
          </q-toolbar-title>
        </q-toolbar>
        <q-btn  flat  icon="mdi-wallet" to="/tokens" />
      </div>

      <q-tabs align="center">
        <q-route-tab to="/" exact label="Configurar" class="text-grey-4" icon="settings" />
        <q-route-tab to="/iniciar" label="Iniciar"
          :icon="!canStart ? 'mdi-robot-dead-outline' : 'mdi-robot-happy-outline'" @click="onClickIniciarTab"
          :class="{ 'text-green-14  ': canStart }" />
      </q-tabs>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

  </q-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const router = useRouter()
const $q = useQuasar()

const STORAGE_KEYS = {
  openai: 'config_openai'
}

// controla se o tab "Iniciar" está habilitado (e verde)
const canStart = ref(false)

function goToDoc() {
  window.open('https://samuelvictorol.github.io/iano-whatsapp/', '_blank');
}

function hasRequiredConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.openai)
    if (!raw) return false

    const parsed = JSON.parse(raw)
    const hasKey = !!parsed.OPENAI_API_KEY
    const hasMongo = !!parsed.MONGO_CONNECTION_STRING

    return hasKey && hasMongo
  } catch (e) {
    console.error('Erro ao ler config_openai do localStorage', e)
    return false
  }
}

function onClickIniciarTab(evt) {
  // sempre recalcula antes
  canStart.value = hasRequiredConfig()

  if (!canStart.value) {
    evt?.preventDefault?.()
    evt?.stopPropagation?.()

    $q.notify({
      type: 'warning',
      position: 'top',
      message: 'Antes de iniciar, configure OPENAI_API_KEY e MONGO_CONNECTION_STRING na aba Configurar.'
    })

    router.push('/')
  }
  // se estiver tudo ok, o q-route-tab navega normalmente
}

onMounted(() => {
  // ao carregar a app, já tenta pintar corretamente
  canStart.value = hasRequiredConfig()
})
</script>
