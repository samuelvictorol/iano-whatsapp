<template>
  <q-page class="page-bg q-pa-md q-pa-xl">
    <div class="page-wrapper">

      <!-- HERO -->
      <section class="hero q-mb-xl">
        <div class="text-center">
          <div class="text-overline text-accent q-mb-sm">
            IANO WhatsApp • Agente para WhatsApp
          </div>
          <div class="text-h4 text-weight-bold text-grey-2 q-mb-sm">
            Agente de IA para WhatsApp
          </div>
          <div class="text-subtitle2 text-grey-5 hero-subtitle">
            Configure modelo, contexto, regras e dados em poucos cliques.
            O backend cuida do resto: escuta o WhatsApp, conversa com a OpenAI
            e registra tudo no banco.
          </div>
        </div>
      </section>

      <!-- GRID PRINCIPAL -->
      <section>
        <div class="row q-col-gutter-lg">

          <!-- Coluna 1: Sobre o projeto -->
          <div class="col-12 col-md-6">
            <q-card class="glass-card q-pa-md q-pa-lg">
              <div class="row items-center q-mb-md no-wrap">
                <q-icon name="smart_toy" size="md" class="text-accent q-mr-sm" />
                <div>
                  <div class="text-subtitle1 text-grey-2 text-weight-medium">
                    Sobre o projeto
                  </div>
                  <div class="text-caption text-grey-5">
                    Visão geral do agente de IA conectado ao WhatsApp
                  </div>
                </div>
              </div>

              <div class="text-body2 text-grey-4 q-mb-md">
                O <strong>Generic IA</strong> é um agente de inteligência artificial
                para WhatsApp, focado em ser <strong><a  class="text-purple-14 cursor-pointer" style="text-decoration: none;" href="https://www.google.com/search?q=sdr" target="_blank">SDR</a></strong> e <strong>facilmente configurável</strong>.
                Através de uma interface web, é possível:
              </div>

              <q-list dense padding class="text-grey-4">
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="tune" class="text-accent" />
                  </q-item-section>
                  <q-item-section>
                    Definir chaves da OpenAI e modelo de chat.
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="rule" class="text-accent" />
                  </q-item-section>
                  <q-item-section>
                    Configurar contexto, janela de histórico e cooldown humano da IA.
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="dataset" class="text-accent" />
                  </q-item-section>
                  <q-item-section>
                    Cadastrar itens de dados (título, descrição, imagens, preços) para
                    alimentar o raciocínio do agente.
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card>
          </div>
          <!-- Coluna 3: Fluxo -->
          <div class="col-12 col-md-6 q-mt-lg">
            <q-card class="glass-card q-pa-md q-pa-lg">
              <div class="row items-center q-mb-md no-wrap">
                <q-icon name="schema" size="md" class="text-accent q-mr-sm" />
                <div>
                  <div class="text-subtitle1 text-grey-2 text-weight-medium">
                    Fluxo de funcionamento
                  </div>
                  <div class="text-caption text-grey-5">
                    Do WhatsApp até a OpenAI e de volta ao cliente
                  </div>
                </div>
              </div>

              <q-timeline color="accent" layout="dense">
                <q-timeline-entry
                  icon="chat"
                  title="1. Mensagem recebida no WhatsApp"
                  subtitle="Cliente envia texto, áudio ou mídia"
                >
                  <div class="text-grey-4 text-body2">
                    O listener do WhatsApp captura novas mensagens, interpreta áudios e envia para o backend
                    junto com metadados da conversa.
                  </div>
                </q-timeline-entry>

                <q-timeline-entry
                  icon="tune"
                  title="2. Montagem do contexto da IA"
                  subtitle="Respeitando janela de tempo e regras"
                >
                  <div class="text-grey-4 text-body2">
                    O servidor carrega as configurações salvas (modelo, contexto, regras,
                    cooldown) e monta o prompt com histórico recente e itens de dados
                    relevantes.
                  </div>
                </q-timeline-entry>

                <q-timeline-entry
                  icon="psychology"
                  title="3. Chamada à OpenAI"
                  subtitle="Modelo configurável via painel"
                >
                  <div class="text-grey-4 text-body2">
                    O backend envia a requisição para a OpenAI usando o modelo escolhido
                    (por exemplo, <code>gpt-4.1-mini</code>) e aguarda a resposta.
                  </div>
                </q-timeline-entry>

                <q-timeline-entry
                  icon="send"
                  title="4. Resposta no WhatsApp"
                  subtitle="Mensagem automatizada para o usuário final"
                >
                  <div class="text-grey-4 text-body2">
                    A resposta é formatada, registrada no MongoDB e enviada automaticamente
                    para o cliente pelo WhatsApp.
                  </div>
                </q-timeline-entry>
              </q-timeline>
            </q-card>
          </div>

        </div>
      </section>
    </div>
  </q-page>
</template>

<script setup>
// nada específico por enquanto, página só informacional
</script>

<style scoped>
.page-bg {
  /* mesmo mood dark azulado da tela de Configurações */
  background: radial-gradient(circle at top, #111827 0, #020617 45%, #020617 100%);
  color: #e5e7eb;
}

.page-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

/* hero */
.hero-subtitle {
  max-width: 720px;
  margin: 0 auto;
}

/* glass cards reaproveitando o estilo da outra página */
.glass-card {
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.5);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

/* cor de destaque (accent) puxando pro verde/teal */
.text-accent {
  color: #22c55e;
}

/* responsividade extra em telas bem pequenas */
@media (max-width: 599px) {
  .page-bg {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }
}
</style>
