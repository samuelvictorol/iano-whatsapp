<!-- DocPage.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="doc-page">

      <!-- HERO / CABEÇALHO -->
      <q-card class="q-mb-md shadow section-card doc-hero">
        <q-card-section>
          <div class="row items-center justify-between q-col-gutter-md">
            <div class="col-12 col-md-7">
              <div class="text-h4 text-weight-bold text-white q-mb-xs row items-center">
                <q-icon name="mdi-whatsapp" class="q-pr-sm"/> IanoWhatsapp
              </div>
              <div class="text-overline text-green-14 doc-pill q-mb-xs">
                IANO WhatsApp · Open source · Multi-tenant · Plugável
              </div>
              <div class="text-subtitle1 text-grey-3 q-mb-md">
                Agente de IA para WhatsApp
              </div>

              <div class="text-grey-4">
                O IanoWhatsapp conecta o WhatsApp Web, OpenAI e os seus sistemas via HTTP.
                Você controla contexto, regras e integrações direto pelo frontend
              </div>

              <div class="row q-mt-md doc-chip-list">
                <q-chip outline color="orange" text-color="black" icon="support_agent">
                  SDR configurável
                </q-chip>
                <q-chip outline color="teal-14" text-color="teal-3" icon="graphic_eq">
                  Áudio + Visão (OpenAI)
                </q-chip>
                <q-chip outline color="blue" text-color="blue-3" icon="cloud_queue">
                  Pronto para SaaS
                </q-chip>
              </div>
            </div>

            <div class="col-12 col-md-5">
              <div class="doc-code q-mt-sm">
                <div class="text-green-14 text-caption q-mb-xs">
                  Exemplo de payload para /start-session
                </div>
                <pre><code>{
  "mongoUri": "mongodb+srv://...",
  "openai": {
    "OPENAI_API_KEY": "sk-...",
    "OPENAI_CHAT_MODEL": "gpt-4.1-mini"
  },
  "ai": {
    "BOT_NAME": "IANO Bot",
    "IA_CONTEXT_MAX_MINUTES": 5,
    "HUMAN_HOLD_MS": 300000
  }
}</code></pre>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-separator dark inset />

        <q-card-section>
          <div class="row items-center justify-between q-col-gutter-sm">
            <div class="col-auto">
            </div>
            <div class="col-auto">
              <div class="row q-gutter-sm">
                <q-btn  outline  icon="mdi-github" label="Repositório no GitHub"
                  class="text-white" @click="openGithub" />
                <q-btn outline icon-right="mdi-robot-happy-outline" label="Configurar minha I.A" class="text-accent text-weight-bold"
                  to="/configurar" />
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- CONTEÚDO PRINCIPAL EM TABS -->
      <q-card class="section-card">
        <q-tabs v-model="activeTab" dense align="justify" narrow-indicator class="text-grey-4" indicator-color="accent">
          <q-tab dense class="q-py-xs" name="sobre" label="Sobre" icon="info" />
          <q-tab dense class="q-py-xs" name="fluxos" label="Fluxos" icon="timeline" />
          <q-tab dense class="q-py-xs" name="api" label="API" icon="api" />
          <q-tab dense class="q-py-xs" name="rodar" label="Como rodar" icon="terminal" />
          <q-tab dense class="q-py-xs" name="stack" label="Stack" icon="layers" />
          <q-tab dense class="q-py-xs" name="contato" label="Contato" icon="alternate_email" />
        </q-tabs>

        <q-separator dark />

        <q-tab-panels v-model="activeTab" animated class="bg-transparent doc-tab-panels">
          <!-- SOBRE -->
          <q-tab-panel name="sobre" class="q-pa-md">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-7">
                <div class="doc-section-title text-h6 text-white q-mb-sm">
                  O que é o IanoWhatsapp?
                </div>
                <div class="doc-section-subtitle q-mb-md">
                  Um engine de automação focado em WhatsApp que centraliza IA, histórico de conversas
                  e integrações em um único backend em Node.js — pronto para virar seu SaaS.
                </div>

                <q-list dense class="doc-list q-py-sm">
                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="smart_toy" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-white">Agente de IA plugável</q-item-label>
                      <q-item-label caption class="text-grey q-py-xs">
                        Conecta ao WhatsApp Web via <code>whatsapp-web.js</code>, recebe mensagens,
                        gerencia cooldown humano e envia o contexto para a OpenAI com regras configuráveis.
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="chat" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-white">
                        Contexto recente por chat armazenado em MongoDB
                      </q-item-label>
                      <q-item-label caption class="text-grey q-py-xs">
                        Cada conversa é guardada por chat, permitindo contexto recente,
                        tratamento de eco e deduplicação de mensagens.
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="badge" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-white">
                        Prefixo de IA e persona customizáveis
                      </q-item-label>
                      <q-item-label caption class="text-grey q-py-xs">
                        Configure nome do bot, tom de voz, persona, regras e metadados direto pelo painel.
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="dashboard_customize" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-white">
                        Configuração 100% via frontend
                      </q-item-label>
                      <q-item-label caption class="text-grey q-py-xs">
                        Em vez de poluir o <code>.env</code>, você envia configurações de IA, OpenAI e dados
                        de negócio pelo painel, em JSON, pronto para multi-tenant.
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>

              <div class="col-12 col-md-5">
                <div class="doc-section-title text-subtitle1 text-white q-mb-sm">
                  Casos de uso
                </div>
                <q-list dense class="doc-list q-py-sm">
                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="campaign" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label caption class="text-grey q-py-xs">
                        <strong>SDR de WhatsApp</strong> para captar e qualificar leads 24/7.
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="storefront" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label caption class="text-grey q-py-xs">
                        <strong>Atendimento automatizado</strong> para lojas, clínicas, agências e produtoras.
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="hub" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label caption class="text-grey q-py-xs">
                        <strong>Hub de integrações</strong> chamando seus endpoints HTTP a partir da IA.
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
            </div>
          </q-tab-panel>

          <!-- FLUXOS -->
          <q-tab-panel name="fluxos" class="q-pa-md">
            <div class="doc-section-title text-h6 text-white q-mb-xs">
              Fluxo de mensagens e regras de negócio
            </div>
            <div class="doc-section-subtitle q-mb-md">
              Veja o caminho que cada mensagem percorre dentro do IANO WhatsApp — da chegada no
              WhatsApp Web até a IA e os seus sistemas.
            </div>

            <div class="doc-code q-mb-md">
              <pre><code>WhatsApp → Engine IANO → IA OpenAI → Integrações HTTP
              ↘ Disparos em massa & Logs em tempo real</code></pre>
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-list dense class="doc-list q-py-sm">
                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="download" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-white">Entrada</q-item-label>
                      <q-item-label caption class="text-grey">
                        Mensagens chegam do WhatsApp Web via <code>whatsapp-web.js</code>
                        e são enfileiradas por chat.
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="schedule" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-white">Fila & Cooldown</q-item-label>
                      <q-item-label caption class="text-grey">
                        O engine aplica cooldown humano, evita flood de mensagens da IA
                        e controla concorrência por chat.
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="psychology" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-white">IA OpenAI (Texto & Visão)</q-item-label>
                      <q-item-label caption class="text-grey">
                        A mensagem é enviada para os modelos de chat/visão da OpenAI com contexto
                        recente e regras definidas no painel.
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>

              <div class="col-12 col-md-6">
                <q-list dense class="doc-list q-py-sm">
                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="http" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-white">Integrações HTTP</q-item-label>
                      <q-item-label caption class="text-grey">
                        A partir das decisões da IA, o backend pode chamar webhooks/endpoints
                        para criar leads, abrir chamados, atualizar ERPs etc.
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="send" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-white">Disparos em massa</q-item-label>
                      <q-item-label caption class="text-grey">
                        A mesma sessão é reaproveitada para campanhas de texto, imagem ou documentos,
                        usando listas de contatos ou grupos nomeados.
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="monitor_heart" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-white">Logs & Monitoramento</q-item-label>
                      <q-item-label caption class="text-grey">
                        Eventos e QR-Code são enviados via SSE, permitindo dashboards em tempo real
                        no frontend Quasar.
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
            </div>
          </q-tab-panel>

          <!-- API -->
          <q-tab-panel name="api" class="q-pa-md">
            <div class="doc-section-title text-h6 text-white q-mb-xs">
              Endpoints principais da API
            </div>
            <div class="doc-section-subtitle q-mb-md">
              A API HTTP é simples e direta para integrar com qualquer backend ou frontend.
            </div>

            <q-markup-table dark flat dense class="rounded-borders q-mb-lg">
              <thead>
                <tr>
                  <th class="text-left">Método</th>
                  <th class="text-left">Rota</th>
                  <th class="text-left">Descrição</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>POST</td>
                  <td>/start-session</td>
                  <td>Inicializa a sessão do IANO com MongoDB e OpenAI.</td>
                </tr>
                <tr>
                  <td>POST</td>
                  <td>/reset-session</td>
                  <td>Limpa a sessão do WhatsApp Web e força novo QR-Code.</td>
                </tr>
                <tr>
                  <td>GET</td>
                  <td>/events</td>
                  <td>Stream SSE com logs, status e QR em base64.</td>
                </tr>
                <tr>
                  <td>POST</td>
                  <td>/send-text</td>
                  <td>Envio de mensagem simples para um único contato.</td>
                </tr>
                <tr>
                  <td>POST</td>
                  <td>/send-bulk</td>
                  <td>Disparo em massa com texto ou mídia por URL.</td>
                </tr>
                <tr>
                  <td>POST</td>
                  <td>/send-bulk-upload</td>
                  <td>Campanhas com upload de arquivos (imagem, PDF, DOCX etc.).</td>
                </tr>
                <tr>
                  <td>GET</td>
                  <td>/token-usage</td>
                  <td>Consumo de tokens da OpenAI da instância atual.</td>
                </tr>
                <tr>
                  <td>GET / POST</td>
                  <td>/contact-groups</td>
                  <td>Listagem e criação de grupos de contatos nomeados.</td>
                </tr>
              </tbody>
            </q-markup-table>

            <div class="text-subtitle2 text-white q-mb-xs">
              Exemplo: iniciar sessão
            </div>
            <div class="doc-code q-mb-md">
              <pre><code>POST /start-session
Content-Type: application/json

{
  "mongoUri": "mongodb+srv://...",
  "openai": {
    "OPENAI_API_KEY": "sk-...",
    "OPENAI_CHAT_MODEL": "gpt-4.1-mini",
    "OPENAI_TEMPERATURE": 0.8,
    "OPENAI_MAX_TOKENS": 900,
    "TRANSCRIBE_MODEL": "whisper-1"
  },
  "ai": {
    "BOT_NAME": "IANO Bot",
    "IA_CONTEXT_MAX_MINUTES": 5,
    "HUMAN_HOLD_MS": 300000,
    "AI_CONTEXT": "...",
    "AI_RULES": "...",
    "AI_METADATA": "...",
    "dataItems": [ /* catálogo */ ]
  }
}</code></pre>
            </div>

            <div class="text-caption text-grey-4">
              A documentação detalhada de cada campo pode ser expandida no próprio painel de
              configuração (inputs com tooltip).
            </div>
          </q-tab-panel>

          <!-- COMO RODAR -->
          <q-tab-panel name="rodar" class="q-pa-md">
            <div class="doc-section-title text-h6 text-white q-mb-xs">
              Como rodar o IanoWhatsapp
            </div>
            <div class="doc-section-subtitle q-mb-md">
              O projeto foi pensado para subir rápido: poucos comandos, poucos envs e tudo
              que é sensível configurado via painel.
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <div class="text-subtitle2 text-green-14 q-mb-sm">
                  Rodar local (Node.js / API)
                </div>
                <div class="doc-code">
                  <pre><code># 1. Tenha Node.js 18+ instalado

# 2. Clone o repositório
git clone https://github.com/samuelvictorol/iano-whatsapp.git
cd iano-whatsapp

# 3. Copie/Renomeie o ambiente padrão
cp .env.example .env

# 4. Instale dependências e suba o backend
npm install
node server.js</code></pre>
                </div>
                <div class="text-caption text-grey-4 q-mt-xs">
                  Depois é só abrir o frontend (Quasar) configurado no projeto, acessar a aba
                  <strong>Configurar</strong>, preencher OpenAI &amp; Mongo e clicar em
                  <strong>Resetar sessão</strong> para gerar o QR-Code.
                </div>
              </div>

              <div class="col-12 col-md-6">
                <div class="text-subtitle2 text-green-14 q-mb-sm">
                  Rodar com Docker (backend + frontend)
                </div>
                <div class="doc-code">
                  <pre><code># 1. Copie/Renomeie o ambiente
cp .env.example .env

# 2. Suba tudo com Docker Compose
docker compose up -d --build</code></pre>
                </div>
                <div class="text-caption text-grey-4 q-mt-xs">
                  O <code>docker-compose.yml</code> foi pensado para subir o backend e, se configurado,
                  o frontend que consome a API. Depois, é só acessar a URL do painel e operar tudo
                  via browser.
                </div>
              </div>
            </div>
          </q-tab-panel>

          <!-- STACK -->
          <q-tab-panel name="stack" class="q-pa-md">
            <div class="doc-section-title text-h6 text-white q-mb-xs">
              Stack, frameworks e dependências
            </div>
            <div class="doc-section-subtitle q-mb-md">
              Stack moderna, porém enxuta, focada em produtividade e fácil manutenção.
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <div class="text-subtitle2 text-green-14 q-mb-sm">
                  Backend
                </div>
                <q-list dense class="doc-list q-py-sm">
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">Node.js + Express</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">whatsapp-web.js (integração WhatsApp)</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">MongoDB para mensagens & contexto</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">OpenAI Chat + Whisper (texto & áudio)</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">multer para upload de arquivos</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">SSE para logs e QR em tempo real</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>

              <div class="col-12 col-md-4">
                <div class="text-subtitle2 text-green-14 q-mb-sm">
                  Frontend / Painel
                </div>
                <q-list dense class="doc-list q-py-sm">
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">Vue 3 + Quasar Framework</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">UX focada em configurar sem mexer em código</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">Disparos em massa com UI tipo “mini Swagger”</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">Monitoramento de sessão, QR-Code e filas</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>

              <div class="col-12 col-md-4">
                <div class="text-subtitle2 text-green-14 q-mb-sm">
                  DevOps & Deploy
                </div>
                <q-list dense class="doc-list q-py-sm">
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">Docker / Docker Compose</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">Arquitetura preparada para Render / AWS / VPS</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">Configuração multi-tenant via Mongo + painéis distintos</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">Poucas variáveis de ambiente, foco no frontend</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
            </div>
          </q-tab-panel>

          <!-- CONTATO -->
          <q-tab-panel name="contato" class="q-pa-md">
            <div class="doc-section-title text-h6 text-white q-mb-xs">
              Quem mantém o IanoWhatsapp?
            </div>
            <div class="doc-section-subtitle q-mb-md">
              Projeto criado e mantido por Samuel Victor Oliveira Lima — Founder da AITOSOFTWARES,
              desenvolvedor, especialista em automação e IA aplicada a negócios.
            </div>

            <q-list dense class="doc-list q-py-sm q-mb-md">
              <q-item>
                <q-item-section avatar>
                  <q-icon name="public" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-white">
                    Portfólio profissional
                  </q-item-label>
                  <q-item-label caption>
                    <a href="https://samuelvictorol.github.io/portfolio/" target="_blank" class="text-green-14">
                      samuelvictorol.github.io/portfolio
                    </a>
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section avatar>
                  <q-icon name="email" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-white">E-mail</q-item-label>
                  <q-item-label caption>
                    <a href="mailto:samuel.softdev@outlook.com" class="text-green-14">
                      samuel.softdev@outlook.com
                    </a>
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section avatar>
                  <q-icon name="mdi-github" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-white">GitHub</q-item-label>
                  <q-item-label caption>
                    <a href="https://github.com/samuelvictorol" target="_blank" class="text-green-14">
                      github.com/samuelvictorol
                    </a>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>

            <div class="text-grey-4 q-mt-md">
              📱 Ideal para: agências, produtoras, lojas, clínicas e qualquer operação que viva de
              atendimento via WhatsApp.
            </div>
            <div class="text-green-2 q-mt-sm">
              Pronto para transformar seu WhatsApp em um canal de vendas automatizado, com IA que responde,
              escuta e executa ações? Use o repositório, adapte para seu contexto e, se quiser, evolua para
              um SaaS de atendentes virtuais próprios.
            </div>

            <div class="text-caption text-grey-5 q-mt-lg">
              IanoWhatsapp · Open Source · 2025
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'

const activeTab = ref('sobre')

function openGithub() {
  window.open('https://github.com/samuelvictorol/iano-whatsapp', '_blank')
}

function openDocOnline() {
  window.open('https://samuelvictorol.github.io/iano-whatsapp/', '_blank')
}
</script>

<style scoped>
.doc-page {
  max-width: 1100px;
  margin: 0 auto;
}


/* Deixa filhos dentro do card também transparentes */
.section-card :deep(.q-tab-panels),
.section-card :deep(.q-tab-panel),
.section-card :deep(.q-separator) {
  background: transparent;
}

.doc-hero {
  padding-bottom: 0;
}

/* "Pílula" de overline no topo */
.doc-pill {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* Chips / badges */
.doc-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Bloco de código estilizado */
.doc-code {
  margin-top: 8px;
  margin-bottom: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #0A0F13;
  border: 1px solid rgba(85, 85, 85, 0.6);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.4;
  color: #e5e7eb;
  overflow-x: auto;
}

/* Títulos e subtítulos das seções */
.doc-section-title {
  font-weight: 600;
}

.doc-section-subtitle {
  color: #9ca3af;
  font-size: 13px;
}

/* Listas internas com leve glass */
.doc-list {
  border-radius: 12px;
  background: #0A0F13;
  color: whitesmoke;
  border: 1px solid rgba(70, 70, 70, 0.8);
}

/* Garante altura mínima do conteúdo das tabs */
.doc-tab-panels {
  min-height: 320px;
}
a {
  text-decoration: none;
}
</style>
