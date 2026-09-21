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
 *   PATCH /orders/:id        → muda o status  { "status": "PREPARING" }
 *   GET   /events            → stream SSE de eventos em tempo real
 *   GET   /health            → { ok: true }
 *
 * Eventos SSE (event: <tipo>, data: <json>):
 *   order.created  → um pedido novo entrou na cozinha
 *   order.updated  → um pedido mudou (inclusive cancelamento)
 *
 * De propósito, este mock é simples e "cru". Sinta-se à vontade para lê-lo,
 * ajustá-lo e estendê-lo para servir a sua solução — isso faz parte do desafio.
 */

const http = require('http');

const PORT = process.env.PORT || 4000;

// ---------------------------------------------------------------------------
// Estado em memória
// ---------------------------------------------------------------------------

const STATUSES = ['RECEIVED', 'PREPARING', 'READY', 'DONE', 'CANCELLED'];
const CHANNELS = ['BALCAO', 'WHATSAPP', 'APP_IFOOD', 'APP_PIGZ'];

const MENU = [
  { name: 'Smash Clássico', station: 'CHAPA' },
  { name: 'Smash Duplo Cheddar', station: 'CHAPA' },
  { name: 'Smash Bacon', station: 'CHAPA' },
  { name: 'Frango Crocante', station: 'FRITADEIRA' },
  { name: 'Batata Rústica', station: 'FRITADEIRA' },
  { name: 'Onion Rings', station: 'FRITADEIRA' },
  { name: 'Coca-Cola Lata', station: 'MONTAGEM' },
  { name: 'Suco de Laranja', station: 'MONTAGEM' },
  { name: 'Milkshake Ovomaltine', station: 'MONTAGEM' },
];

const MODIFIERS = [
  'sem cebola',
  'ponto mal passado',
  'ponto bem passado',
  'cheddar extra',
  'sem picles',
  'pão sem glúten',
  'maionese à parte',
];

// Gerador determinístico simples (sem depender de Math.random do relógio),
// para o stream ficar reproduzível entre execuções.
let seed = 42;
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function pickSome(arr, max) {
  const n = Math.floor(rand() * (max + 1));
  const out = [];
  for (let i = 0; i < n; i++) out.push(pick(arr));
  return [...new Set(out)];
}

let nextId = 1;
let elapsedSeconds = 0; // "relógio" lógico do server

function makeOrder() {
  const itemCount = 1 + Math.floor(rand() * 4); // 1 a 4 itens
  const items = [];
  for (let i = 0; i < itemCount; i++) {
    const m = pick(MENU);
    items.push({
      id: `${nextId}-${i}`,
      name: m.name,
      station: m.station,
      quantity: 1 + Math.floor(rand() * 2),
      modifiers: pickSome(MODIFIERS, 2),
    });
  }
  const order = {
    id: `#${String(nextId).padStart(4, '0')}`,
    channel: pick(CHANNELS),
    table: rand() > 0.6 ? Math.ceil(rand() * 10) : null, // mesa do salão, ou null (delivery/balcão)
    status: 'RECEIVED',
    items,
    createdAtOffsetSeconds: elapsedSeconds, // segundos desde que o server subiu
    notes: rand() > 0.8 ? 'Cliente com pressa' : null,
  };
  nextId += 1;
  return order;
}

// Alguns pedidos já "na cozinha" quando o KDS abre.
const orders = new Map();
for (let i = 0; i < 6; i++) {
  const o = makeOrder();
  // espalha os status iniciais para a tela abrir com fila realista
  o.status = pick(['RECEIVED', 'RECEIVED', 'PREPARING', 'PREPARING', 'READY']);
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

// A cozinha recebe pedido novo em intervalos irregulares. No pico da sexta,
// "até 14 pedidos em 20 minutos". Aqui aceleramos para o desafio: ~1 a cada 5s.
const EVENT_INTERVAL_MS = Number(process.env.EVENT_INTERVAL_MS || 5000);

setInterval(() => {
  elapsedSeconds += EVENT_INTERVAL_MS / 1000;

  // 20% de chance de, em vez de criar, cancelar um pedido ativo (o cliente desistiu).
  const active = [...orders.values()].filter(
    (o) => o.status !== 'DONE' && o.status !== 'CANCELLED',
  );
  if (rand() < 0.2 && active.length > 3) {
    const victim = pick(active);
    victim.status = 'CANCELLED';
    broadcast('order.updated', victim);
    return;
  }

  const order = makeOrder();
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
    return send(res, 200, [...orders.values()]);
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
    // manda um "snapshot" inicial para o cliente que acabou de conectar
    res.write(`event: snapshot\ndata: ${JSON.stringify([...orders.values()])}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  // /orders/:id
  const match = path.match(/^\/orders\/(.+)$/);
  if (match) {
    const id = decodeURIComponent(match[1]);
    const order = orders.get(id);
    if (!order) return send(res, 404, { error: 'order not found', id });

    if (method === 'GET') return send(res, 200, order);

    if (method === 'PATCH') {
      const body = await readBody(req);
      if (!STATUSES.includes(body.status)) {
        return send(res, 400, {
          error: 'invalid status',
          received: body.status,
          allowed: STATUSES,
        });
      }
      order.status = body.status;
      broadcast('order.updated', order);
      return send(res, 200, order);
    }
  }

  return send(res, 404, { error: 'not found', path });
});

server.listen(PORT, () => {
  console.log(`\n🍔 Mock KDS da Brasa do Jorge rodando em http://localhost:${PORT}`);
  console.log(`   GET   /orders          lista pedidos`);
  console.log(`   PATCH /orders/:id      muda status  { "status": "PREPARING" }`);
  console.log(`   GET   /events          stream SSE (order.created / order.updated)`);
  console.log(`   Novo pedido a cada ${EVENT_INTERVAL_MS / 1000}s (env EVENT_INTERVAL_MS)\n`);
});
