// Toggle do menu mobile
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const header = document.querySelector('.top-nav');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  // Fechar menu ao clicar em um link
  navLinks.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      navLinks.classList.remove('open');
    }
  });
}

// Sombra no header ao rolar
window.addEventListener('scroll', () => {
  if (window.scrollY > 12) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// Preencher ano no footer
const footer = document.querySelector('.footer');
if (footer) {
  footer.innerHTML = footer.innerHTML.replace('{{year}}', new Date().getFullYear());
}

// Dados do "mindmap" dos fluxos
const flowData = {
  overview: {
    title: 'Visão geral do fluxo',
    description:
      'Cada mensagem que entra pelo WhatsApp passa por um fluxo de orquestração: deduplicação, fila por chat, cooldown humano e, só então, segue para a IA ou para um humano.',
    items: [
      'Mensagens chegam do WhatsApp Web via whatsapp-web.js.',
      'O engine decide se a IA responde ou se entrega para atendimento humano.',
      'Toda a conversa fica registrada no MongoDB, pronta para ser usada em contexto.'
    ]
  },
  entry: {
    title: 'Entrada via WhatsApp Web',
    description:
      'O cliente envia texto, áudio ou imagem. O IANO escuta tudo em tempo real.',
    items: [
      'Suporte a texto, áudios, imagens e outros tipos de mídia.',
      'Áudios podem ser transcritos localmente antes de ir para a IA.',
      'Imagens podem acionar o fluxo de visão (describe / OCR) com instruções do usuário.'
    ]
  },
  queue: {
    title: 'Fila por chat & cooldown humano',
    description:
      'Cada chat tem uma fila própria, garantindo ordem das mensagens e respeito ao takeover humano.',
    items: [
      'Mensagens duplicadas são ignoradas por um tempo configurável.',
      'Quando um humano responde, a IA entra em cooldown para não “competir” com o atendente.',
      'Fila assíncrona por chat, evitando race conditions.'
    ]
  },
  ai: {
    title: 'IA OpenAI (texto + visão)',
    description:
      'Com o contexto recente e as regras configuradas no painel, a IA gera uma ou mais respostas possíveis.',
    items: [
      'Uso de modelos da OpenAI configuráveis (por ex. gpt-4.1-mini).',
      'Contexto recente é extraído do MongoDB e enviado no prompt.',
      'Respostas podem ser múltiplas (lista de ia_reply_messages) para simular diálogo mais natural.'
    ]
  },
  integrations: {
    title: 'Integrações HTTP e regras de negócio',
    description:
      'Do lado da IA, você pode instruir o modelo a chamar endpoints seus para buscar dados, gerar links, abrir tickets etc.',
    items: [
      'Metadados e “dataItems” configurados via painel indicam para onde integrar.',
      'Fácil de plugar ERPs, CRMs, gateways de pagamento ou qualquer API REST.',
      'Ideal para construir produtos white-label de atendimento com IA.'
    ]
  },
  campaigns: {
    title: 'Disparos em massa e grupos',
    description:
      'Além do atendimento reativo, o IANO também cuida de disparos em massa para campanhas e notificações.',
    items: [
      'Envio de texto simples com /send-bulk.',
      'Envio de imagens/documentos via URL ou upload com /send-bulk-upload.',
      'Grupos de contatos nomeados via /contact-groups para campanhas recorrentes.'
    ]
  },
  observability: {
    title: 'Logs, QR-Code e monitoramento',
    description:
      'Acompanhe a saúde da sessão, erros e QR-Code em tempo real via SSE.',
    items: [
      'Stream SSE em /events, com logs, status e QR-Code em base64.',
      'Perfeito para montar um dashboard de monitoramento em Vue/Quasar.',
      'Facilita suporte para múltiplos clientes usando a mesma base de código.'
    ]
  }
};

// Lógica do mindmap / detalhes de fluxo
const flowNodes = document.querySelectorAll('.flow-node');
const flowTitleEl = document.getElementById('flowTitle');
const flowDescriptionEl = document.getElementById('flowDescription');
const flowListEl = document.getElementById('flowList');

function setActiveFlow(id) {
  const data = flowData[id] || flowData.overview;

  // Atualiza textos
  if (flowTitleEl) flowTitleEl.textContent = data.title;
  if (flowDescriptionEl) flowDescriptionEl.textContent = data.description;

  if (flowListEl) {
    flowListEl.innerHTML = '';
    (data.items || []).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      flowListEl.appendChild(li);
    });
  }

  // Estado visual
  flowNodes.forEach((node) => {
    if (node.dataset.flowId === id) {
      node.classList.add('flow-node--active');
    } else if (!node.classList.contains('flow-node--main')) {
      node.classList.remove('flow-node--active');
    }
  });
}

// Inicializar listeners dos nós
flowNodes.forEach((node) => {
  const id = node.dataset.flowId;
  if (!id || id === 'overview') return;

  node.addEventListener('click', () => setActiveFlow(id));
});

// Estado inicial
setActiveFlow('overview');
