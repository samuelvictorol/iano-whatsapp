# 🤖 Aito WhatsApp IA – Agente SDR Autônomo no WhatsApp Web

> Conecte seu WhatsApp Web a uma IA SDR, veja tudo em tempo real num painel bonito, e controle quando a IA fala ou o humano assume – tudo via QR Code.

<p align="center">
  <a href="#-rodar-com-docker-local" style="text-decoration:none;">
    <kbd style="padding:10px 18px;border-radius:999px;background:linear-gradient(135deg,#22c55e,#0ea5e9);color:#0b1120;font-weight:600;">
      🚀 Rodar com Docker (local)
    </kbd>
  </a>
  &nbsp;
  <a href="#-endpoints-http" style="text-decoration:none;">
    <kbd style="padding:10px 18px;border-radius:999px;background:linear-gradient(135deg,#6366f1,#ec4899);color:#0b1120;font-weight:600;">
      📡 Endpoints HTTP
    </kbd>
  </a>
  &nbsp;
  <a href="#-roadmap--evolução" style="text-decoration:none;">
    <kbd style="padding:10px 18px;border-radius:999px;background:linear-gradient(135deg,#fbbf24,#f97316);color:#0b1120;font-weight:600;">
      🧭 Roadmap
    </kbd>
  </a>
</p>

---

## ✨ Visão Geral
<img width="1919" height="611" alt="image" src="https://github.com/user-attachments/assets/55c37b61-6074-4b01-b24b-7472dd75306d" />
<img width="1901" height="911" alt="image" src="https://github.com/user-attachments/assets/80c8d1c9-b613-4825-bef9-f0a371885156" />


Este projeto é um **agente de IA para WhatsApp Web**, focado em:

- Atuar como **SDR inteligente** (pré-atendimento comercial)  
- Responder com **IA (OpenAI)** usando contexto recente da conversa  
- Fazer **takeover humano** automático (quando alguém digita manualmente)  
- Expor **endpoints HTTP simples** para integração (ex.: `send-text`)  
- Oferecer um **painel em tempo real** com:
  - QR Code da sessão  
  - Logs de eventos  
  - Lista de chats, com status de IA ON/OFF e contagem de cooldown  

### Stack principal

- **Node.js + Express** – servidor HTTP e API  
- **whatsapp-web.js** – ponte com WhatsApp Web via QR Code  
- **OpenAI Chat Completions (JSON Schema)** – IA que sempre responde em JSON estruturado  
- **MongoDB** – store de mensagens e contexto por chat  
- **SSE (Server-Sent Events)** – streaming de logs, QR e status para o painel  
- **Frontend (Quasar/Vue3 buildado)** – painel web minimalista, dark, com grid de chats  

---

## 🧠 Como funciona o fluxo

1. **Sessão WhatsApp**  
   - O backend sobe o `whatsapp-web.js` com `LocalAuth`  
   - Um **QR Code** é gerado e enviado via SSE pro painel  
   - Você escaneia com o app do WhatsApp → sessão conectada

2. **Entrada de mensagens**  
   - Toda mensagem recebida (ou enviada pelo seu número) é normalizada em `whatsapp.js` (`toRec`)  
   - O servidor grava no Mongo (`messages`) com metadados (tipo, mídia, timestamp…)  
   - Se for áudio, o sistema roda **transcrição local** (`transcribeAudioLocal`) e substitui o `body`

3. **Roteamento para IA / Humano**  
   - Se a mensagem **não é mídia visual** e o body não está vazio:
     - Verifica se há **cooldown humano ativo** para aquele chat
     - Se a IA estiver liberada, pega o **contexto recente** (`getRecentContext`) filtrando por tempo
     - Chama `callAI` com payload `{ chat_id, text, context_messages }`

4. **IA (OpenAI) com JSON Schema**  
   - O `system` prompt (`Prompts.SDR_UNICO`) descreve:
     - Quem é a empresa (Aito Softwares, consultoria em nuvem + IA, etc.)
     - Público alvo, diferenciais, CTAs, regras de linguagem
   - A IA **é obrigada** a responder em JSON:

     ```jsonc
     {
       "intencao": "agente_ia",
       "ia_reply_messages": ["mensagem 1", "mensagem 2"],
       "perfil_cliente": "pequena_empresa"
     }
     ```

   - O servidor parseia, aplica prefixo do bot (`*Aito Bot:* ...`) e envia 1–3 mensagens no WhatsApp

5. **Takeover humano inteligente**  
   - Se o sistema detecta uma mensagem **fromMe** que NÃO foi enviada pela IA:
     - Marca takeover humano
     - Inicia um **cooldown (`HUMAN_HOLD_MS`)** naquele chat  
     - Durante esse tempo a IA não responde e a fila daquele chat é ignorada

6. **Dashboard / Painel**  
   - Um `EventSource` escuta `/events` e recebe:
     - `logs` e `log` → histórico + streaming em tempo real
     - `qr` → dataURL do QR Code atual
     - `status` e `status_one` → lista de chats com:
       - `chatId`, `title`, `holdUntil`, `aiInControl`, `remainingMs`
   - O painel exibe:
     - Card de QR, com status e botão **“Resetar sessão”**
     - Card de logs (autoscroll)
     - Grid de chats com **badge IA ON/OFF** + contagem até a IA retomar

---

## 📡 Endpoints HTTP

### `POST /send-text`

Envia uma mensagem de texto simples para um `chatId` via WhatsApp.

**Request**

```http
POST /send-text
X-Token: <DASH_TOKEN opcional>
Content-Type: application/json
```

```json
{
  "chatId": "5531999999999@c.us",
  "text": "Olá! Esta mensagem foi enviada pela API. 😄"
}
```

**Response**

```json
{ "ok": true }
```

---

### `POST /reset-session`

Reseta completamente a sessão do WhatsApp:

- Destrói o cliente atual (`client.destroy()`)
- Limpa diretórios `data/wwebjs` e `data/media`
- Recria diretórios
- Re-inicializa o cliente → **novo QR Code** é emitido

**Request**

```http
POST /reset-session
X-Token: <DASH_TOKEN opcional>
```

**Response**

```json
{ "ok": true }
```

---

### `GET /events` (SSE)

Stream contínuo para o painel:

- `logs` → últimos logs  
- `log` → log unitário em tempo real  
- `qr` → QR Code atual (dataURL)  
- `status` → snapshot de todos os chats  
- `status_one` → atualização pontual de um chat  

Uso típico no frontend:

```js
const eventSource = new EventSource(`${BASE_URL}/events`);
eventSource.onmessage = (e) => {
  const data = JSON.parse(e.data);
  // tratar tipos: status, status_one, qr, logs, log...
};
```

---

## 🧩 Roadmap & Evolução

O projeto hoje já entrega:

- IA SDR focada em **Aito Softwares**, consultoria em **nuvem + IA**  
- Contexto por chat com janela de tempo configurável  
- Takeover humano e cooldown  
- Painel de QR + Logs + Chats em tempo real  
- Reset de sessão por botão (sem apagar pasta manualmente)  

Próximos passos planejados:

1. **Configuração dinâmica no painel**  
   - Forms (via Quasar) salvando configuração em Mongo/JSON:
     - `OPENAI_API_KEY` / `OPENAI_CHAT_MODEL`
     - `IA_CONTEXT_MAX_MINUTES`
     - `HUMAN_HOLD_MS`
     - Contexto da IA / Regras / Metadata
     - Catálogo (título, descrição, imagens, preços, categoria)

2. **Agente auto configurável**  
   - Várias “personalidades” de IA no mesmo backend  
   - Configuração por `chatId`, loja ou tenant  
   - UI para criar/editar agentes sem mexer em código  

3. **Endoints públicos bem definidos para integrações**  
   - `POST /api/send-message`  
   - `POST /api/send-media`  
   - `POST /api/webhook` para integrações com CRM, ERP, etc.  
   - Tudo autenticado via token e documentado (OpenAPI/Swagger)  

4. **Templates de implantação “one-click”**  
   - Script para subir em máquinas locais de cliente (Windows)  
   - Atalho/ícone que sobe Docker + abre painel no navegador padrão  

---

## ⚙️ Variáveis de ambiente principais

| Variável                    | Descrição                                                 | Exemplo                                       |
|-----------------------------|-----------------------------------------------------------|-----------------------------------------------|
| `PORT`                      | Porta HTTP do servidor                                   | `10000`                                       |
| `OPENAI_API_KEY`            | Chave da API da OpenAI                                  | `sk-...`                                      |
| `OPENAI_CHAT_MODEL`         | Modelo de chat                                           | `gpt-4.1-mini`                                |
| `MONGODB_URI`               | String de conexão com MongoDB                            | `mongodb+srv://user:pass@cluster/db`         |
| `MSG_TTL_DAYS`              | TTL dos documentos de mensagem (dias)                    | `7`                                           |
| `HUMAN_HOLD_MS`             | Cooldown em ms após takeover humano                      | `300000` (5 minutos)                          |
| `BOT_NAME`                  | Nome do bot usado no prefixo                             | `Aito Bot`                                    |
| `CATALOGO_BASE_URL`         | Base para montar links de catálogo                       | `https://aitosoftwares.com`                   |
| `DASH_TOKEN`                | Token opcional para proteger as rotas da dashboard/API   | `supersecreto123`                             |
| `WWEBJS_CLIENT_ID`          | ID da sessão LocalAuth do whatsapp-web.js                | `aito-whatsapp-bot`                           |
| `WWEBJS_STORE`              | Diretório de sessão do whatsapp-web.js                   | `/app/data/wwebjs`                            |
| `MEDIA_DIR`                 | Diretório para salvar mídias recebidas                   | `/app/data/media`                             |
| `WWEBJS_RESET_DATA_ON_START`| Se `1`, limpa diretórios de sessão/mídias no start      | `1` ou `0`                                    |

---

## 🐳 Rodar com Docker (local)

Aqui vai um fluxo direto pra rodar tudo localmente via Docker.

### 1. Clonar o projeto

```bash
git clone https://github.com/seu-usuario/aito-whatsapp-ia.git
cd aito-whatsapp-ia
```

### 2. Criar o arquivo `.env`

Crie um `.env` na raiz com algo assim:

```env
PORT=10000

OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4.1-mini

MONGODB_URI=mongodb://host.docker.internal:27017/iano_whatsapp
MSG_TTL_DAYS=7

BOT_NAME=Aito Bot
CATALOGO_BASE_URL=https://aitosoftwares.com

HUMAN_HOLD_MS=300000

DASH_TOKEN=meu-token-dashboard

WWEBJS_CLIENT_ID=aito-whatsapp-bot
WWEBJS_STORE=/app/data/wwebjs
MEDIA_DIR=/app/data/media

# opcional: limpar sessão sempre que subir o container
WWEBJS_RESET_DATA_ON_START=1
```

> Dica: se tiver um Mongo rodando na sua máquina via Docker, `host.docker.internal` geralmente resolve pro host no Windows/macOS.

### 3. `docker-compose.yml` simples

Crie um `docker-compose.yml` na raiz, se ainda não existir:

```yaml
version: '3.9'

services:
  app:
    build: .
    container_name: aito-whatsapp-ia
    env_file: .env
    ports:
      - "10000:10000"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

> O volume `./data:/app/data` garante que sessões e mídias fiquem persistidas entre rebuilds (a não ser que `WWEBJS_RESET_DATA_ON_START=1` ou você use o botão de `reset-session`).

### 4. Build + up

```bash
docker compose build
docker compose up -d
```

### 5. Abrir o painel e ler o QR

- Acesse: `http://localhost:10000`  
- O painel deve mostrar:
  - Card de **QR Code**
  - Card de **Logs**
  - Grid de **Chats**
- Escaneie o QR pelo WhatsApp no celular  
- Mande uma mensagem de teste → veja a IA respondendo e o typing aparecendo 👀  

---

## 💡 Ideias de uso

- Pré-atendimento para consultoria de **nuvem e IA**  
- SDR automático capturando:
  - Intenção (`intencao`)
  - Perfil do cliente (`perfil_cliente`)
  - Histórico (Mongo) para alimentar CRM depois  
- Bot “**semi-autônomo**”: IA cuida do volume, humano entra só quando quer assumir (takeover)  

---

Se quiser, você pode adaptar esse projeto pra outros nichos (clínicas, lojas locais, infoprodutos) trocando apenas o **prompt SDR** e algumas regras de negócio.  
A base já está pronta: **WhatsApp + IA + painel + endpoints** – o resto é criatividade. 🚀
