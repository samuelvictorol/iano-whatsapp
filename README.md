# WhatsApp Logger IA Integrado (v4)

- QR + Logs em tempo real (SSE)
- Título do chat com **nome** do contato ou **telefone formatado** (inclusive `@lid`)
- Prefixo do bot em **negrito** e detecção robusta do bot
- **Typing (digitando…)** durante respostas da IA
- **Cancelamento imediato** da IA quando humano assume: invalida jobs em curso (token/versão) e entra cooldown 5min
- Transcrição de **áudio** (Whisper) antes de salvar (IA responde áudios)
- Ignora imagem/vídeo/sticker para IA
- Fila por chat (respostas ordenadas por conversa)

## Rodar
```bash
cp .env.example .env
# edite MONGODB_URI e OPENAI_API_KEY
npm i
npm start
# ou docker compose up -d --build
```

## Como funciona o "humano tomou conta"
- Sempre que chega uma mensagem **fromMe** sem o prefixo do bot:
  - **bumpVersion(chatId)** → invalida qualquer job da IA já em execução/na fila.
  - **setHold(5min)** → a IA só volta depois do timer terminar.
- No fluxo da IA:
  - Tiramos snap **versionAtStart** antes de chamar o modelo.
  - Após a IA responder (e entre cada mensagem), verificamos se a versão **mudou** ou se **acabou a permissão** (hold ativo). Se mudou, **aborta** silenciosamente.


### Ajustar janela de contexto
- `IA_CONTEXT_MAX_MINUTES=5` (padrão). Apenas mensagens dos **últimos 5 minutos** entram no contexto da IA.
