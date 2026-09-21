#!/usr/bin/env node
/**
 * Mock server do desafio KDS — Brasa do Jorge.
 *
 * Sem dependências: roda só com Node (>= 18).
 *   node mock/server.js
 *
 * Expõe:
 *   GET   /orders            → lista os pedidos ativos (JSON)
 *   GET   /orders/:id        → um pedido
 *   PATCH /orders/:id        → muda o stage  { "stage": "PREPARING" }
 *   GET   /events            → stream SSE de eventos em tempo real
 *   GET   /health            → { ok: true }
 *
 * Eventos SSE (event: <tipo>, data: <json>):
 *   snapshot       → lista atual, enviada assim que o cliente conecta
 *   order.created  → um pedido novo entrou na cozinha
 *   order.updated  → um pedido mudou (inclusive cancelamento)
 *
 * Os nomes de campos e valores seguem, de propósito, as convenções REAIS do
 * back da Pigz (o que já é público no app) para o desafio ficar próximo da
 * realidade — veja mock/README.md para a lista do que é nosso de verdade e do
 * que é específico deste KDS. É um mock simples e cru: leia, ajuste e estenda
 * à vontade, isso faz parte do desafio.
 */

const http = require('http');

const PORT = process.env.PORT || 4000;

// ---------------------------------------------------------------------------
// Vocabulário (convenções do pigz-api, quando existem)
// ---------------------------------------------------------------------------

// origin: canal de onde o pedido veio. Todos abaixo são valores ORIGIN_* reais.
const ORIGINS = ['POS', 'WHATSAPP_AI', 'IFOOD', 'MARKETPLACE_V2'];

// stage: estágio do pedido. PENDING/CONFIRMED/PREPARING/CANCELED são valores
// reais do back (note: CANCELED com um L só). READY e DONE são específicos
// deste KDS de cozinha — o back real não tem "pronto na cozinha".
const STAGES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DONE', 'CANCELED'];

// status: status de pagamento (valores reais STATUS_PAID / STATUS_NO_PAID).
const PAYMENT_STATUSES = ['PAID', 'NO_PAID'];

const MENU = [
  { name: 'Smash Clássico', station: 'CHAPA', price: 26.0, customizable: true },
  { name: 'Smash Duplo Cheddar', station: 'CHAPA', price: 34.0, customizable: true },
  { name: 'Smash Bacon', station: 'CHAPA', price: 32.0, customizable: true },
  { name: 'Frango Crocante', station: 'FRITADEIRA', price: 30.0, customizable: false },
  { name: 'Batata Rústica', station: 'FRITADEIRA', price: 18.0, customizable: false },
  { name: 'Onion Rings', station: 'FRITADEIRA', price: 20.0, customizable: false },
  { name: 'Coca-Cola Lata', station: 'MONTAGEM', price: 7.0, customizable: false },
  { name: 'Suco de Laranja', station: 'MONTAGEM', price: 12.0, customizable: false },
  { name: 'Milkshake Ovomaltine', station: 'MONTAGEM', price: 22.0, customizable: false },
];

// Complementos no formato OrderItemAttribute (grupo) -> items (opções escolhidas),
// espelhando a hierarquia do back.
const ATTRIBUTE_GROUPS = [
  { name: 'Ponto da carne', options: ['Mal passado', 'Ao ponto', 'Bem passado'] },
  { name: 'Adicionais', options: ['Cheddar extra', 'Bacon extra', 'Ovo'] },
  { name: 'Remover', options: ['Sem cebola', 'Sem picles', 'Sem maionese'] },
];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

// Gerador pseudo-aleatório com semente, para o conteúdo dos pedidos ser
// reproduzível entre execuções.
let seed = 42;
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function money(value) {
  return value.toFixed(2); // decimal em string "34.00" — como o back guarda
}
// data no formato do back: ISO 8601 sem timezone (Y-m-dTH:i:s)
function isoNoTz(date) {
  return date.toISOString().slice(0, 19);
}

let nextId = 1;

function makeItem(orderId, index) {
  const m = pick(MENU);
  const quantity = 1 + Math.floor(rand() * 2);
  const attributes = [];
  if (m.customizable && rand() > 0.4) {
    const group = pick(ATTRIBUTE_GROUPS);
    attributes.push({
      name: group.name,
      items: [{ name: pick(group.options) }],
    });
  }
  return {
    id: `${orderId}-${index}`,
    name: m.name,
    station: m.station, // campo específico deste KDS (linha de produção da cozinha)
    quantity,
    price: money(m.price),
    total: money(m.price * quantity),
    note: rand() > 0.85 ? 'Caprichar no ponto' : null,
    attributes,
  };
}

function makeOrder({ ageSeconds = 0, stage = 'PENDING' } = {}) {
  const id = nextId++;
  const itemCount = 1 + Math.floor(rand() * 4); // 1 a 4 itens
  const orderItems = [];
  for (let i = 0; i < itemCount; i++) orderItems.push(makeItem(id, i));
  const total = orderItems.reduce((sum, it) => sum + Number(it.total), 0);
  const created = new Date(Date.now() - ageSeconds * 1000);
  const origin = pick(ORIGINS);
  return {
    id,
    reference: `#${String(id).padStart(4, '0')}`,
    origin,
    stage,
    status: origin === 'POS' && rand() > 0.5 ? 'NO_PAID' : 'PAID',
    table: origin === 'POS' && rand() > 0.4 ? Math.ceil(rand() * 10) : null,
    total: money(total),
    created: isoNoTz(created),
    updated: isoNoTz(created),
    note: rand() > 0.8 ? 'Cliente com pressa' : null,
    orderItems,
  };
}

// ---------------------------------------------------------------------------
// Estado em memória: alguns pedidos já na cozinha quando o KDS abre
// ---------------------------------------------------------------------------

const orders = new Map();
const seedSpec = [
  { ageSeconds: 1500, stage: 'PREPARING' },
  { ageSeconds: 1200, stage: 'PREPARING' },
  { ageSeconds: 720, stage: 'CONFIRMED' },
  { ageSeconds: 400, stage: 'CONFIRMED' },
  { ageSeconds: 180, stage: 'PENDING' },
  { ageSeconds: 40, stage: 'PENDING' },
];
for (const spec of seedSpec) {
  const o = makeOrder(spec);
  orders.set(o.id, o);
}

// ---------------------------------------------------------------------------
// SSE
// ---------------------------------------------------------------------------

const clients = new Set();

function broadcast(event, payload) {
  const chunk = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) res.write(chunk);
}

// A cozinha recebe pedido novo em intervalos. No pico da sexta, "até 14 pedidos
// em 20 minutos". Aqui aceleramos para ~1 a cada 5s (ajuste com EVENT_INTERVAL_MS).
const EVENT_INTERVAL_MS = Number(process.env.EVENT_INTERVAL_MS || 5000);

setInterval(() => {
  const active = [...orders.values()].filter(
    (o) => o.stage !== 'DONE' && o.stage !== 'CANCELED',
  );

  // ~20% das vezes o cliente desiste e o pedido é cancelado.
  if (rand() < 0.2 && active.length > 3) {
    const victim = pick(active);
    victim.stage = 'CANCELED';
    victim.updated = isoNoTz(new Date());
    broadcast('order.updated', victim);
    return;
  }

  const order = makeOrder({ ageSeconds: 0, stage: 'PENDING' });
  orders.set(order.id, order);
  broadcast('order.created', order);
}, EVENT_INTERVAL_MS);

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
}

// Formato de erro de validação espelhando o back (identifier/code + errors[]).
function validationError(res, field, message) {
  return send(res, 400, {
    error: message,
    identifier: 'VALIDATION-400-001',
    code: 'VALIDATION-400-001',
    errors: [{ field, error: message }],
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const { method } = req;
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (method === 'OPTIONS') return send(res, 204, {});
  if (path === '/health') return send(res, 200, { ok: true });

  if (path === '/orders' && method === 'GET') {
    return send(res, 200, { pagination: null, orders: [...orders.values()] });
  }

  // /events → SSE
  if (path === '/events' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('retry: 3000\n\n'); // dica de reconexão para o EventSource
    res.write(`event: snapshot\ndata: ${JSON.stringify([...orders.values()])}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  // /orders/:id
  const match = path.match(/^\/orders\/(.+)$/);
  if (match) {
    const id = Number(decodeURIComponent(match[1]));
    const order = orders.get(id);
    if (!order) return send(res, 404, { error: 'Pedido não encontrado' });

    if (method === 'GET') return send(res, 200, order);

    if (method === 'PATCH') {
      const body = await readBody(req);
      if (!STAGES.includes(body.stage)) {
        return validationError(
          res,
          'stage',
          `stage inválido. Válidos: ${STAGES.join(', ')}`,
        );
      }
      order.stage = body.stage;
      order.updated = isoNoTz(new Date());
      broadcast('order.updated', order);
      return send(res, 200, order);
    }
  }

  return send(res, 404, { error: 'not found', path });
});

server.listen(PORT, () => {
  console.log(`\n🍔 Mock KDS da Brasa do Jorge rodando em http://localhost:${PORT}`);
  console.log(`   GET   /orders          lista pedidos`);
  console.log(`   PATCH /orders/:id      muda stage  { "stage": "PREPARING" }`);
  console.log(`   GET   /events          stream SSE (order.created / order.updated)`);
  console.log(`   Novo pedido a cada ${EVENT_INTERVAL_MS / 1000}s (env EVENT_INTERVAL_MS)\n`);
});
