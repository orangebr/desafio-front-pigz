# Mock server — KDS Brasa do Jorge

Backend falso para o desafio. **Não tem dependências**: roda só com Node (>= 18).

```bash
node mock/server.js
```

Sobe em `http://localhost:4000` (mude com a env `PORT`).

## Endpoints

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/orders` | Lista os pedidos ativos |
| `GET` | `/orders/:id` | Um pedido |
| `PATCH` | `/orders/:id` | Muda o status — corpo `{ "status": "PREPARING" }` |
| `GET` | `/events` | Stream **SSE** em tempo real |
| `GET` | `/health` | Healthcheck |

Status válidos: `RECEIVED`, `PREPARING`, `READY`, `DONE`, `CANCELLED`.

## Tempo real (SSE)

`GET /events` abre um stream. No connect, ele manda um evento `snapshot` com a
lista atual; depois vai empurrando:

- `order.created` — pedido novo entrou na cozinha
- `order.updated` — pedido mudou de status (inclui cancelamento pelo cliente)

Exemplo no browser/React Native:

```js
const es = new EventSource('http://localhost:4000/events');
es.addEventListener('order.created', (e) => console.log('novo', JSON.parse(e.data)));
es.addEventListener('order.updated', (e) => console.log('mudou', JSON.parse(e.data)));
```

Um pedido novo entra a cada **5s** por padrão. Ajuste com a env `EVENT_INTERVAL_MS`
(em milissegundos), ex.: `EVENT_INTERVAL_MS=2000 node mock/server.js`.

## Formato do pedido

```json
{
  "id": "#0007",
  "channel": "APP_IFOOD",
  "table": 4,
  "status": "RECEIVED",
  "createdAtOffsetSeconds": 35,
  "notes": null,
  "items": [
    {
      "id": "7-0",
      "name": "Smash Duplo Cheddar",
      "station": "CHAPA",
      "quantity": 1,
      "modifiers": ["sem cebola", "ponto mal passado"]
    }
  ]
}
```

- `channel`: `BALCAO` | `WHATSAPP` | `APP_IFOOD` | `APP_PIGZ`
- `table`: número da mesa do salão, ou `null` (delivery/balcão)
- `station`: `CHAPA` | `FRITADEIRA` | `MONTAGEM` (a linha de produção da cozinha)
- `createdAtOffsetSeconds`: segundos desde que o server subiu — use para calcular o tempo de espera do pedido

> Este mock é de propósito simples e sem firulas. **Pode mexer nele** — adicionar
> campo, endpoint, mudar a cadência dos eventos. Ler e estender código alheio faz
> parte do desafio.
