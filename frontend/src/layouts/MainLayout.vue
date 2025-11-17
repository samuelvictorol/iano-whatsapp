<template>
  <q-layout view="hHh lpR fFf">

    <q-header elevated class="bg-glass text-white" height-hint="98">
      <q-toolbar @click="goTo('/')" class="cursor-pointer">
        <q-toolbar-title class="row items-center">
          <!-- <q-img src="/fav2.png" width="50px"></q-img> -->
           <q-icon name="mdi-whatsapp" size="lg" class="q-pr-sm"></q-icon>
          IANO WhatsApp
        </q-toolbar-title>

        <q-btn dense flat round icon="help" to="/help" />
      </q-toolbar>
      <q-tabs align="center">
        <q-route-tab to="/configurar" label="Configurar" />
        <q-route-tab to="/iniciar" label="Iniciar" />
      </q-tabs>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

  </q-layout>
</template>

<script setup>
import { ref, } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

function goTo(path) {
  router.push(path)
}

</script>