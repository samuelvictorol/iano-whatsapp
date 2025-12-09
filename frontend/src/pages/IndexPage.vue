<!-- DocPage.vue -->
<template>
  <q-page class="q-pa-md">
    <q-breadcrumbs>
      <q-breadcrumbs-el class="text-green-14" label="Início" icon="home" to="/" />
    </q-breadcrumbs>
    <div class="doc-page">
      
      <!-- HERO / CABEÇALHO -->
      <q-card class="q-my-md shadow section-card doc-hero">
        <q-card-section>
          <div class="row items-center justify-between q-col-gutter-md">
            <!-- COL ESQUERDA: TÍTULO / COPY -->
            <div class="col-12 col-md-7">
              <div class="text-h4 text-weight-bold text-white q-mb-xs row items-center">
                <q-icon name="mdi-whatsapp" class="q-pr-sm" /> IanoWhatsapp
              </div>

              <div class="text-overline text-green-14 doc-pill q-mb-xs">
                IANO WhatsApp · Open source · Multi-tenant · Plugável
              </div>

              <div class="text-subtitle1 text-grey-3 q-mb-md">
                Agente de IA para WhatsApp com painel de configuração, disparos em massa
                e integrações HTTP plugáveis — atualizando IA e catálogo em tempo real.
              </div>

              <div class="text-green-3">
                A IanoWhatsapp conecta o WhatsApp Web, OpenAI e os seus sistemas via HTTP.
                Você controla contexto, regras e integrações direto pelo frontend, salva tudo no MongoDB
                e reaproveita a mesma infraestrutura para vários clientes (multi-tenant).
              </div>

              <div class="row q-mt-md doc-chip-list">
                <q-chip outline color="amber" text-color="black" icon="support_agent">
                  SDR configurável
                </q-chip>
                <q-chip outline color="teal-14" text-color="teal-3" icon="graphic_eq">
                  Áudio + Visão (OpenAI)
                </q-chip>
                <q-chip outline color="blue" text-color="blue-3" icon="cloud_queue">
                  API Integrável
                </q-chip>
                <q-chip outline color="purple-12" text-color="purple" icon="campaign">
                  Disparos em massa
                </q-chip>
              </div>
            </div>

            <!-- COL DIREITA: VÍDEO DEMO / PAYLOAD -->
            <div class="col-12 col-md-5">
              <div class="doc-video-wrapper q-mb-md">
                <div class="text-caption text-grey q-mb-xs">
                  Demonstração
                </div>
                <q-video :ratio="16 / 9" :src="heroVideoUrl" class="doc-video" />
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
                <q-btn outline icon="mdi-github" label="Repositório no GitHub" class="text-white" @click="openGithub" />
                <q-btn outline icon-right="mdi-robot-happy-outline" label="Configurar minha I.A"
                  class="text-accent text-weight-bold" to="/configurar" />
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
                  Um engine de automação focado em WhatsApp que centraliza IA, disparo de mensagens,
                  catálogo de produtos/serviços e integrações HTTP em um único backend em Node.js —
                  pronto para virar seu SaaS multi-cliente.
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
                        gerencia cooldown humano e envia o contexto para a OpenAI com regras configuráveis
                        por instância (por <code>mongoUri</code>).
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
                        tratamento de eco, deduplicação de mensagens e tomada de decisão da IA
                        baseada em histórico.
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="badge" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-white">
                        Prefixo de IA, persona e catálogo dinâmicos
                      </q-item-label>
                      <q-item-label caption class="text-grey q-py-xs">
                        Configure nome do bot, persona, regras, metadata e catálogo de produtos/serviços
                        direto pelo painel. Essas configurações são salvas no MongoDB e aplicadas
                        em tempo real, sem reiniciar o bot.
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
                        Em vez de depender de dezenas de variáveis no <code>.env</code>, você envia
                        configurações de IA, OpenAI e dados de negócio pelo painel. Apenas chaves sensíveis
                        (API keys, tokens) exigem uma nova sessão.
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>

              <div class="col-12 col-md-5">
                <div class="doc-section-title text-subtitle1 text-white q-mb-sm">
                  Como funciona na prática?
                </div>
                <div class="doc-section-subtitle q-mb-md">
                  O fluxo de onboarding foi pensado para ser simples e repetível para vários clientes.
                </div>

                <q-list dense class="doc-list q-py-sm">
                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="looks_one" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label caption class="text-grey q-py-xs">
                        Cadastre sua <code>OPENAI API KEY</code> e a
                        <code>MONGO CONNECTION STRING</code> na aba <strong>Configurar</strong>.
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="looks_two" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label caption class="text-grey q-py-xs">
                        Configure sua IA (contexto, regras, persona, metadata) e cadastre
                        produtos/serviços que a IA pode usar para responder e ofertar.
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="looks_3" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label caption class="text-grey q-py-xs">
                        Clique em <strong>Nova Sessão</strong>, vá na tela <strong>Iniciar</strong>
                        e escaneie o QR Code com o WhatsApp. A partir daí, a IA passa a atender automaticamente.
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="looks_4" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label caption class="text-grey q-py-xs">
                        Depois de conectado, você pode alterar contexto da IA e catálogo de produtos/serviços
                        a qualquer momento. O backend lê essas configs do Mongo e aplica em tempo real —
                        só exige uma nova sessão se mudar API keys/tokens.
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="campaign" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label caption class="text-grey q-py-xs">
                        Use os endpoints de <strong>disparo em massa</strong> para campanhas: promoções,
                        avisos, follow-up de leads, nutrição de base etc., reaproveitando a mesma sessão
                        que já atende o dia a dia.
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
            </div>
          </q-tab-panel>

          <!-- FLUXOS -->
          <q-tab-panel name="fluxos" class="q-pa-md text-white">
            <div class="doc-section-title text-h6 text-white q-mb-xs">
              Fluxos de uso e fluxo interno do sistema
            </div>
            <div class="doc-section-subtitle q-mb-md">
              Entenda o que acontece tanto do ponto de vista do usuário (cliente final) quanto dentro do engine,
              desde a mensagem recebida no WhatsApp até a IA e suas integrações HTTP.
            </div>

            <div class="doc-code q-mb-md">
              <pre><code>WhatsApp ⇄ Engine IANO ⇄ IA OpenAI ⇄ Integrações HTTP
              ↘ Disparos em massa & Logs em tempo real</code></pre>
            </div>

            <q-expansion-item icon="person" label="Fluxo para o usuário (experiência no WhatsApp)"
              header-class="expansion-header flux-header" expand-icon="expand_more" dense class="q-mb-md text-green-14">
              <q-card-section>
                <div class="doc-section-subtitle q-mb-sm">
                  Esse é o fluxo enxergado pelo cliente que fala com você no WhatsApp.
                </div>

                <q-list dense class="doc-list q-py-sm">
                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="login" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-white">1. Primeiro contato</q-item-label>
                      <q-item-label caption class="text-grey">
                        O usuário envia uma mensagem via WhatsApp (texto, áudio, imagem ou documento).
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="smart_toy" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-white">2. Atendimento automático da IA</q-item-label>
                      <q-item-label caption class="text-grey">
                        A IA responde seguindo o contexto e as regras configuradas, podendo usar
                        catálogo de produtos/serviços, links, scripts de venda e perguntas de qualificação.
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="person_pin_circle" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-white">3. Tomada pelo humano</q-item-label>
                      <q-item-label caption class="text-grey">
                        Se um humano responder no chat, o engine aplica <code>HUMAN_HOLD_MS</code> e
                        pausa a IA por um tempo configurável, para não competir com o atendente.
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="campaign" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-white">4. Campanhas e follow-up</q-item-label>
                      <q-item-label caption class="text-grey">
                        O mesmo número pode enviar campanhas em massa (texto, mídia, PDFs) usando listas
                        de contatos ou grupos de clientes, mantendo histórico e contexto por chat.
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-expansion-item>

            <q-expansion-item icon="timeline" label="Fluxo interno do sistema (engine, IA e integrações)"
              header-class="expansion-header flux-header text-amber" expand-icon="expand_more" dense>
              <q-card-section>
                <div class="row q-col-gutter-md">
                  <div class="col-12 col-md-6">
                    <div class="text-subtitle2 text-green-14 q-mb-sm">
                      Pipeline de mensagens
                    </div>
                    <q-list dense class="doc-list q-py-sm">
                      <q-item>
                        <q-item-section avatar>
                          <q-icon name="download" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="text-white">1. Entrada</q-item-label>
                          <q-item-label caption class="text-grey">
                            Mensagens chegam do WhatsApp Web via <code>whatsapp-web.js</code>
                            e são roteadas por <code>chatId</code>.
                          </q-item-label>
                        </q-item-section>
                      </q-item>

                      <q-item>
                        <q-item-section avatar>
                          <q-icon name="schedule" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="text-white">2. Fila & cooldown</q-item-label>
                          <q-item-label caption class="text-grey">
                            O engine aplica cooldown humano, evita flood de mensagens da IA,
                            controla concorrência por chat e ignora duplicatas/eco.
                          </q-item-label>
                        </q-item-section>
                      </q-item>

                      <q-item>
                        <q-item-section avatar>
                          <q-icon name="psychology" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="text-white">3. Montagem do prompt & contexto</q-item-label>
                          <q-item-label caption class="text-grey">
                            Carrega histórico recente do MongoDB respeitando
                            <code>IA_CONTEXT_MAX_MINUTES</code>, lê configurações de IA e
                            <code>dataItems</code> do Mongo para aquele <code>mongoUri</code> e monta o
                            prompt completo (persona, regras, metadata, catálogo) em tempo real.
                          </q-item-label>
                        </q-item-section>
                      </q-item>

                      <q-item>
                        <q-item-section avatar>
                          <q-icon name="auto_awesome" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="text-white">4. Chamada à OpenAI</q-item-label>
                          <q-item-label caption class="text-grey">
                            Envia a requisição para o modelo configurado
                            (<code>OPENAI_CHAT_MODEL</code>), podendo usar texto, visão e transcrição
                            de áudio (<code>TRANSCRIBE_MODEL</code>).
                          </q-item-label>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </div>

                  <div class="col-12 col-md-6">
                    <div class="text-subtitle2 text-green-14 q-mb-sm">
                      Configuração dinâmica & integrações
                    </div>
                    <q-list dense class="doc-list q-py-sm">
                      <q-item>
                        <q-item-section avatar>
                          <q-icon name="settings_suggest" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="text-white">Configs em tempo real</q-item-label>
                          <q-item-label caption class="text-grey">
                            As telas de <strong>Configurações da IA</strong> e
                            <strong>Produtos e Serviços</strong> salvam dados em
                            <code>config_ai</code> no Mongo. Ao receber mensagens, o backend sempre lê
                            a versão mais recente dessas configs, sem reiniciar a sessão.
                          </q-item-label>
                        </q-item-section>
                      </q-item>

                      <q-item>
                        <q-item-section avatar>
                          <q-icon name="vpn_key" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="text-white">Chaves e tokens</q-item-label>
                          <q-item-label caption class="text-grey">
                            Alterar <code>OPENAI_API_KEY</code>, <code>MONGO_CONNECTION_STRING</code>
                            ou outros tokens sensíveis exige apenas uma nova chamada de
                            <code>/start-session</code> (via botão “Nova Sessão”). O restante é hot reload.
                          </q-item-label>
                        </q-item-section>
                      </q-item>

                      <q-item>
                        <q-item-section avatar>
                          <q-icon name="http" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="text-white">Integrações HTTP</q-item-label>
                          <q-item-label caption class="text-grey">
                            A partir das decisões da IA, o backend pode chamar webhooks/endpoints
                            para criar leads, abrir chamados, atualizar ERPs ou CRMs.
                          </q-item-label>
                        </q-item-section>
                      </q-item>

                      <q-item>
                        <q-item-section avatar>
                          <q-icon name="send" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="text-white">Campanhas e disparos em massa</q-item-label>
                          <q-item-label caption class="text-grey">
                            Endpoints de disparo em massa reaproveitam a mesma sessão do WhatsApp,
                            permitindo enviar textos, imagens ou documentos para listas de contatos
                            ou grupos nomeados.
                          </q-item-label>
                        </q-item-section>
                      </q-item>

                      <q-item>
                        <q-item-section avatar>
                          <q-icon name="monitor_heart" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="text-white">Logs & monitoramento</q-item-label>
                          <q-item-label caption class="text-grey">
                            Eventos, QR-Code e status de chats são enviados via SSE para o frontend Quasar,
                            que exibe logs, contagem de takeover humano e estado da IA em tempo real.
                          </q-item-label>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </div>
                </div>
              </q-card-section>
            </q-expansion-item>
          </q-tab-panel>

          <!-- API -->
          <q-tab-panel name="api" class="q-pa-md">
            <div class="doc-section-title text-h6 text-white q-mb-xs">
              Endpoints principais da API
            </div>
            <div class="doc-section-subtitle q-mb-md">
              A API HTTP é simples e direta para integrar com qualquer backend ou frontend. Ideal para
              plugar em CRMs, ERPs, funis próprios e serviços externos.
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
                  <td>Inicializa a sessão do IANO com MongoDB e OpenAI (gera QR-Code novo).</td>
                </tr>
                <tr>
                  <td>POST</td>
                  <td>/reset-session</td>
                  <td>Limpa a sessão do WhatsApp Web e força novo QR-Code, mantendo configs no Mongo.</td>
                </tr>
                <tr>
                  <td>GET</td>
                  <td>/events</td>
                  <td>Stream SSE com logs, status de chats, QR em base64 e informações de takeover.</td>
                </tr>
                <tr>
                  <td>POST</td>
                  <td>/send-text</td>
                  <td>Envio de mensagem simples para um único contato (text-only).</td>
                </tr>
                <tr>
                  <td>POST</td>
                  <td>/send-bulk</td>
                  <td>
                    Disparo em massa com texto ou mídia por URL, ideal para campanhas segmentadas
                    reaproveitando a mesma sessão.
                  </td>
                </tr>
                <tr>
                  <td>POST</td>
                  <td>/send-bulk-upload</td>
                  <td>
                    Campanhas em massa com upload de arquivos (imagem, PDF, DOCX etc.), usando listas
                    de contatos ou grupos.
                  </td>
                </tr>
                <tr>
                  <td>GET</td>
                  <td>/token-usage</td>
                  <td>Consumo de tokens da OpenAI da instância atual (respeitando a API KEY configurada).</td>
                </tr>
                <tr>
                  <td>GET / POST</td>
                  <td>/contact-groups</td>
                  <td>Listagem e criação de grupos de contatos nomeados para campanhas.</td>
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
              A documentação detalhada de cada campo pode ser explorada direto no painel de
              configuração (inputs com tooltip) e, se quiser, estendida para expor mais endpoints
              específicos do seu negócio.
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
                  <strong>Nova Sessão</strong> para gerar o QR-Code.
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
                  via browser — inclusive campanhas de disparo em massa e monitoramento de sessão.
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
              Stack moderna, porém enxuta, focada em produtividade, testes rápidos e fácil manutenção.
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
                      <q-item-label caption class="text-grey-4">MongoDB para mensagens, contexto e
                        configs</q-item-label>
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
                      <q-item-label caption class="text-grey-4">SSE para logs, QR e status em tempo real</q-item-label>
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
                      <q-item-label caption class="text-grey-4">
                        UX focada em configurar sem mexer em código
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">
                        Disparos em massa com UI
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">
                        Monitoramento de sessão, QR-Code, filas e takeover humano
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4 q-mb-sm">
                        Telas de configuração plugadas no Mongo (hot reload de IA e catálogo)
                      </q-item-label>
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
                      <q-item-label caption class="text-grey-4">
                        Arquitetura preparada para Render / AWS / VPS
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4">
                        Configuração multi-tenant via Mongo + painéis distintos
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption class="text-grey-4 q-pb-sm">
                        Poucas variáveis de ambiente, foco no frontend para ajustes diários
                      </q-item-label>
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
              Projeto criado e mantido por Samuel Victor Oliveira Lima.
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
              📱 Ideal para: agências, produtoras, lojas, clínicas, escritórios e qualquer operação que viva de
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

// Substitua pela URL do seu vídeo de demo (YouTube embed ou outro)
const heroVideoUrl = ref('https://www.youtube.com/embed/SEU_VIDEO_AQUI')

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
  background: #0a0f13;
  border: 1px solid rgba(85, 85, 85, 0.6);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    'Liberation Mono', 'Courier New', monospace;
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
  background: #0a0f13;
  color: whitesmoke;
  border: 1px solid rgba(70, 70, 70, 0.8);
}

/* Garante altura mínima do conteúdo das tabs */
.doc-tab-panels {
  min-height: 320px;
}

/* Wrapper de vídeo no hero */
.doc-video-wrapper {
  border-radius: 12px;
  background: #0a0a0a;
  border: 1px solid rgba(75, 75, 75, 0.918);
  padding: 8px;
}

.doc-video {
  border-radius: 10px;
  overflow: hidden;
}

/* Header dos fluxos com visual glassy */
.flux-header {
  margin-top: 4px;
  margin-bottom: 4px;
  border-radius: 12px;
  background: radial-gradient(circle at top left, rgba(34, 197, 94, 0.18), rgba(15, 23, 42, 0.95));
  border: 1px solid rgba(34, 197, 94, 0.4);
}

/* Deixa conteúdo interno transparente pro glass funcionar */
.section-card :deep(.q-expansion-item__container),
.section-card :deep(.q-item) {
  background: transparent;
}

.section-card :deep(.rounded-borders) {
  border-radius: 14px;
}

a {
  text-decoration: none;
}
</style>
