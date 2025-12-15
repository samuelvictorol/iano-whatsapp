<img width="230" height="45" alt="image" src="https://github.com/user-attachments/assets/4fdca155-54a8-489c-8c52-fcbbb634ab66" />
<br>

# 🤖 Crie sua própria I.A para WhatsApp

> Configure a persona da sua I.A, objetivos, metadados, produtos, conecte seu WhatsApp via QR Code e acompanhe tudo em tempo real em um painel com interface amigável.  
> Controle quando a IA responde e quando o humano assume.  
> Dispare campanhas de mensagens para múltiplos contatos ou grupos de contatos.

> [🌐 Documentação / Protótipo do Painel](https://iano-whatsapp-frontend.onrender.com) •  
> [⚙️ Backlog e Kanban](https://github.com/users/samuelvictorol/projects/6)

---

## ⚙ Requisitos

Para rodar o **IanoWhatsapp** em modo completo (backend + painel):

- [ ] **Docker** (recomendado: Docker + Docker Compose)  
- [ ] **OpenAI API Key**  
- [ ] **MongoDB Connection String** (MongoDB Atlas ou instância própria)  
- [ ] Navegador moderno (para acessar o painel Quasar)  
- [ ] (Opcional) **Node.js 18+** caso queira rodar sem Docker (dev mode)

---

## 📚 Visão Geral

O **IanoWhatsapp** é um *engine* de automação para WhatsApp que:

- Centraliza **IA + WhatsApp Web + catálogo de itens + disparos em massa** em um único backend Node.js.  
- Disponibiliza um painel em **Quasar + Vue 3** para configurar a IA, acompanhar conversas e disparos.  
- Permite uso como base para um **SaaS multi-cliente/multi-bot**, com configuração dinâmica via API (`/start-session`, `/config/ai`).

O protótipo de painel está disponível em:

- **Frontend (demo Render)**:  
  https://iano-whatsapp-frontend.onrender.com  

> 💡 No plano gratuito do Render, a RAM é limitada → o QR Code pode demorar, falhar ou não persistir entre reinícios. Use como **demonstração visual**, não como ambiente de produção.

---

## ✨ Principais Funcionalidades

- **Assistente IA no WhatsApp**  
  - Recebe mensagens, consulta a OpenAI com *system prompt* personalizado e responde no mesmo chat.

- **Configuração dinâmica da IA**  
  - Defina contexto (`AI_CONTEXT`), regras (`AI_RULES`), metadados (`AI_METADATA`) e catálogo (`dataItems`) via painel ou via `/config/ai`.

- **Catálogo de itens / produtos**  
  - Estrutura para cadastrar itens com:
    - `title`, `description`, `images`, `price`, `promoPrice`, `category`  
  - A IA pode usar esses dados para responder com detalhes e imagens.

- **Disparos em massa (bulk)**  
  - Envio de campanhas de texto ou mídia para listas de contatos via:
    - `/send-bulk`
    - `/send-bulk-upload`
    - `/contact-groups`

- **Visão computacional (imagens)**  
  - O usuário envia uma imagem (ex.: produto, documento, foto) e uma instrução.  
  - O backend chama OpenAI Vision, descreve a imagem e devolve uma resposta contextualizada.

- **Transcrição de áudio**  
  - Áudios recebidos são transcritos localmente e passam a ser tratados como texto de entrada para a IA.

- **Painel em tempo real (SSE)**  
  - Endpoint `/events` expõe:
    - QR Code  
    - Logs  
    - Status dos chats  
  - O frontend consome via **Server-Sent Events**.

- **Dashboard de tokens / custos**  
  - Endpoint `/token-usage` agrega consumo de tokens da OpenAI (texto + visão) por período.

---

## 🧱 Arquitetura em Alto Nível

### Backend

- **Node.js + Express**  
- **whatsapp-web.js** (Puppeteer / Chromium headless) para integração com WhatsApp Web  
- **OpenAI** (chat + visão)  
- **MongoDB** para:
  - Histórico de mensagens (`messages`)  
  - Configuração dinâmica (`runtime_config`)  
  - Grupos de contatos (`contact_groups`)  
  - Uso de tokens (coleções auxiliares)

### Frontend

- **Quasar Framework + Vue 3 + Pinia + Vue Router**  
- SPA que consome os endpoints do backend e exibe:
  - Tela de conexão / QR Code  
  - Status de chats e fila da IA  
  - Configuração da IA e catálogo  
  - Gestão de grupos e disparos em massa  
  - Uso de tokens

### Infra

- `docker-compose.yml`:
  - Sobe backend + frontend integrados  
  - Configura Chromium (para WhatsApp Web)  
- `render.yaml` (branch `render-deploy`):
  - Descreve serviços no Render (backend em Docker, frontend estático)  
  - **Infra as Code** para reprodutibilidade do deploy

---

## 🔄 Fluxo Básico de Funcionamento

1. O usuário acessa o painel e informa:
   - `MONGO_CONNECTION_STRING`  
   - `OPENAI_API_KEY`  
   - Modelo, temperatura, número máximo de tokens  
   - Contexto e regras da IA  
   - Itens de catálogo (opcional)

2. O painel chama o backend via:

   ```http
   POST /start-session
   ```

   ou

   ```http
   POST /config/ai
   ```

   para inicializar/atualizar o `runtimeConfig`.

3. O backend:
   - Conecta no Mongo  
   - Armazena as configurações de IA e OpenAI  
   - Inicializa o cliente WhatsApp (`getClient()`) em background  
   - Emite QR Code para o frontend via `/events` (SSE)

4. Após o QR ser lido no app WhatsApp:
   - O cliente passa a receber eventos de mensagem  
   - Opcionalmente transcreve áudios  
   - Monta o contexto (histórico recente)  
   - Chama OpenAI passando o contexto e o prompt de sistema  
   - Interpreta a resposta (lista `ia_reply_messages`) e envia texto/imagens para o usuário

5. Todas as mensagens são:
   - Persistidas no Mongo  
   - Consideradas no contexto recente  
   - Exibidas no painel em tempo real

---

## 📦 Estrutura do Projeto (resumo)

- `server.js`  
  - API HTTP (Express)  
  - Integração com MongoDB  
  - Rotas `/start-session`, `/reset-session`, `/config/ai`, `/token-usage`, `/send-bulk`, `/send-bulk-upload`, `/contact-groups`, `/events`, etc.  
  - Fila de mensagens e controle de IA/humano

- `whatsapp.js`  
  - Cria e gerencia o cliente `whatsapp-web.js`  
  - Emite eventos via `wbus` (log, qr, message)

- `src/services/ai.js`  
  - Monta prompts  
  - Chama OpenAI (chat e visão)  
  - Define o contrato `ia_reply_messages` (lista de mensagens que a IA quer enviar)

- `src/config/runtime-config.js`  
  - Gerencia (em memória) o `runtimeConfig`:
    - `mongoUri`
    - `openai` (modelo, key, etc.)
    - `ai` (contexto, regras, metadados, catálogo)

- `frontend/`  
  - SPA em Quasar + Vue 3  
  - Tela de conexão, painel de status, configuração de IA, disparos em massa, dashboard de tokens

---

## 🧪 Como Rodar Localmente

### Opção A – Usando Docker Compose (recomendado)

1. Clone o repositório:

   ```bash
   git clone https://github.com/samuelvictorol/iano-whatsapp.git
   cd iano-whatsapp
   ```

2. Crie o arquivo `.env` (se existir `.env.example`, use como base):

   ```bash
   cp .env.example .env
   ```

   Ajuste, se necessário:

   ```env
   PORT=10000
   MSG_TTL_DAYS=0
   DASH_TOKEN= # opcional, para proteger as rotas do painel
   ```

3. Suba os serviços com Docker Compose:

   ```bash
   docker compose up -d --build
   ```

   - Backend: geralmente em `http://localhost:10000`  
   - Frontend: conforme configuração do `docker-compose.yml` (ex.: `http://localhost:9000`)

4. Acesse o painel no navegador, configure:
   - String de conexão do Mongo  
   - OpenAI API Key / modelo  
   - Contexto e regras da IA  

5. Escaneie o QR Code exibido no painel com o WhatsApp instalado no celular.

---

### Opção B – Dev local (sem Docker)

> Requer Node.js 18+ e npm.

**Backend**

```bash
git clone https://github.com/samuelvictorol/iano-whatsapp.git
cd iano-whatsapp

cp .env.example .env   # se existir
npm install
npm run dev            # ou npm start
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

O Quasar geralmente sobe em `http://localhost:9000` (ou porta indicada no terminal).

---

## 🔑 Configuração da IA e do Catálogo

As configurações podem ser feitas via painel ou diretamente pela API.

### `POST /start-session`

Inicializa uma sessão completa (Mongo + OpenAI + IA + WhatsApp).

```http
POST /start-session
Content-Type: application/json
```

```json
{
  "mongoUri": "sua_mongo_connection_string",
  "openai": {
    "OPENAI_API_KEY": "sk-****",
    "OPENAI_CHAT_MODEL": "gpt-4.1-mini",
    "OPENAI_TEMPERATURE": 0.8,
    "OPENAI_MAX_TOKENS": 900,
    "TRANSCRIBE_MODEL": "whisper-1"
  },
  "ai": {
    "IA_CONTEXT_MAX_MINUTES": 5,
    "HUMAN_HOLD_MS": 300000,
    "AI_CONTEXT": "Contexto do seu bot...",
    "AI_RULES": "Regras específicas...",
    "AI_METADATA": "Informações adicionais...",
    "BOT_NAME": "IANO Bot",
    "dataItems": [
      {
        "title": "Exemplo de Produto",
        "description": "Descrição do produto...",
        "images": [
          "https://exemplo.com/imagem.jpg"
        ],
        "price": 100,
        "promoPrice": 80,
        "category": "categoria"
      }
    ]
  }
}
```

---

### `GET /config/ai`

Retorna as configurações atuais:

```http
GET /config/ai
```

```json
{
  "ok": true,
  "config": {
    "openai": {
      "OPENAI_API_KEY": "sk-****",
      "OPENAI_CHAT_MODEL": "gpt-4.1-mini",
      "OPENAI_TEMPERATURE": 0.8,
      "OPENAI_MAX_TOKENS": 900,
      "TRANSCRIBE_MODEL": "whisper-1",
      "MONGO_CONNECTION_STRING": "mongodb+srv://..."
    },
    "ai": {
      "IA_CONTEXT_MAX_MINUTES": 5,
      "HUMAN_HOLD_MS": 300000,
      "AI_CONTEXT": "Contexto atual...",
      "AI_RULES": "Regras...",
      "AI_METADATA": "Metadados...",
      "BOT_NAME": "IANO Bot"
    },
    "data": [
      {
        "title": "Exemplo de Produto",
        "description": "Descrição do produto...",
        "images": [
          "https://exemplo.com/imagem.jpg"
        ],
        "price": 100,
        "promoPrice": 80,
        "category": "categoria"
      }
    ]
  }
}
```

---

### `POST /config/ai`

Atualiza partes da configuração sem reiniciar tudo:

```http
POST /config/ai
Content-Type: application/json
```

```json
{
  "openai": {
    "MONGO_CONNECTION_STRING": "mongodb+srv://..."
  },
  "ai": {
    "AI_CONTEXT": "Novo contexto...",
    "AI_RULES": "Novas regras...",
    "BOT_NAME": "Novo Nome do Bot"
  },
  "data": [
    {
      "title": "Novo Item",
      "description": "Descrição...",
      "images": [],
      "price": 50,
      "promoPrice": null,
      "category": "servico"
    }
  ]
}
```

---

## 📡 Endpoints Principais

> Se você definir `DASH_TOKEN` no `.env`, a maioria das rotas exige o header `x-token`.

### 1. `POST /start-session`

- Inicializa sessão (Mongo + OpenAI + IA) e inicia cliente WhatsApp.  

---

### 2. `POST /reset-session`

Reinicia a sessão do WhatsApp (fecha e recria o cliente, forçando novo QR):

```http
POST /reset-session
Headers:
  x-token: SE_CONFIGURADO
```

---

### 3. `POST /send-text`

Envia uma mensagem de texto para um único `chatId`:

```http
POST /send-text
Headers:
  x-token: SE_CONFIGURADO
Content-Type: application/json
```

```json
{
  "chatId": "5511999999999@c.us",
  "text": "Olá! Essa mensagem foi enviada via API."
}
```

---

### 4. `POST /send-bulk`

Envio em massa de texto e/ou mídia via URL:

```http
POST /send-bulk
Headers:
  x-token: SE_CONFIGURADO
Content-Type: application/json
```

```json
{
  "contacts": ["11999999999", "61988887777"],
  "text": "Campanha especial!",
  "mediaUrl": "https://exemplo.com/imagem.jpg",
  "caption": "Legenda opcional"
}
```

---

### 5. `POST /send-bulk-upload`

Envio em massa com upload de arquivo:

```http
POST /send-bulk-upload
Headers:
  x-token: SE_CONFIGURADO
Content-Type: multipart/form-data
```

Campos:

- `file`: arquivo (imagem, PDF, etc.)  
- `contacts`: array JSON ou CSV/linhas (números)  
- `caption` (opcional)  
- `text` (opcional)

---

### 6. `/contact-groups`

Gerenciamento de grupos de contatos:

- **Criar/atualizar grupo**

  ```http
  POST /contact-groups
  Headers:
    x-token: SE_CONFIGURADO
  Content-Type: application/json
  ```

  ```json
  {
    "label": "clientes_vip",
    "contacts": [
      "11999999999",
      {
        "name": "Fulano",
        "phone": "61988887777"
      }
    ]
  }
  ```

- **Listar grupos**

  ```http
  GET /contact-groups
  Headers:
    x-token: SE_CONFIGURADO
  ```

- **Remover grupo**

  ```http
  DELETE /contact-groups/clientes_vip
  Headers:
    x-token: SE_CONFIGURADO
  ```

---

### 7. `GET /token-usage`

Resumo de uso de tokens (texto + visão):

```http
GET /token-usage?range=7d
Headers:
  x-token: SE_CONFIGURADO
  x-openai-key: SUA_OPENAI_KEY (opcional, para validação)
```

---

### 8. `GET /events` (SSE)

Canal de eventos em tempo real utilizado pelo painel:

```http
GET /events
```

Eventos típicos enviados pelo backend:

- `type: "qr"` → dados do QR Code (imagem em dataUrl)  
- `type: "log"` → logs do backend  
- `type: "status"` / `"status_one"` → status dos chats (hold, título, etc.)

---

## 🛣 Roadmap / Próximos Passos Sugeridos

- [ ] Separar multi-bot por *tenant* (vários clientes/setores usando a mesma infra, com configs isoladas).  
- [ ] Introduzir fila (Redis / Rabbit / Kafka) para alto volume de mensagens.  
- [ ] Criar painel multi-usuário com autenticação (admin, operadores, etc.).  
- [ ] Disponibilizar templates de bots prontos por segmento (suporte, vendas, e-commerce, tribunais, etc.).  
- [ ] Integrar monitoramento (Prometheus/Grafana) para acompanhar saúde do Chromium e da sessão WhatsApp.  

---

## ✅ Conclusão

O **IanoWhatsapp** oferece uma base sólida para construir seu próprio SaaS de automação no WhatsApp:  
ele centraliza IA, catálogo, disparos em massa e painel de controle em uma arquitetura organizada, extensível e pronta para produção (com pequenos ajustes de infraestrutura).  
A partir deste projeto, você pode criar desde bots de suporte e vendas até soluções mais específicas, como assistentes para tribunais, atendimento interno de TI ou integrações com ERPs e CRMs, simplesmente ajustando o `AI_CONTEXT`, as regras e os endpoints de integração.
