# Desafio Front-end · Pigz

Olá! Que bom ter você por aqui. 👋

Este é o desafio técnico para a vaga de **Front-end Pleno/Sênior** na Pigz. Ele não é um teste de "você sabe escrever esse código?". É um teste de **julgamento**: a gente te dá uma dor real de um lojista e quer ver como você a transforma em produto — do entendimento do problema à tela funcionando.

> **Não existe um spec pronto aqui.** Você é a pessoa dona da solução. Parte do que avaliamos é justamente o que você decide construir, o que decide deixar de fora e como defende essas escolhas.

---

## 🤖 Sobre usar IA

**Pode e recomendamos.** Use Claude, Copilot, v0, o que você usa no dia a dia. Aqui na Pigz a gente trabalha com IA o tempo todo, e não faria sentido avaliar você num cenário que não é o real.

O que a gente **não** está medindo é "você digitou o código na mão?". O que a gente mede é: **você sabe dirigir a IA, revisar o que ela cospe, descartar o que não presta e defender cada decisão?**

Por isso, no seu README, reserve um espaço contando **como usou IA**: onde ela te ajudou, onde ela errou e você corrigiu, e o que você fez questão de decidir sozinho. Ser transparente aqui conta **a favor**. Entregar código que você não sabe explicar conta contra.

---

## 🍔 O cenário: Brasa do Jorge

A **Brasa do Jorge** é uma hamburgueria artesanal de bairro, ponto de rua, 4 anos de casa, fama de "melhor smash da região". Você foi até lá conhecer a operação. Segue o que você viu e ouviu.

### Os números (mês passado)
- ~**3.200 pedidos/mês** (~110 por dia), ticket médio **R$ 52**
- Faturamento ~**R$ 166 mil/mês**
- **60% do movimento** se concentra sexta e sábado, das **19h às 22h30**
- Canais de pedido: **Salão/balcão 35%** · **WhatsApp 25%** · **Apps (iFood + Pigz) 40%**
- No pico, chegam **até 14 pedidos em 20 minutos** — todos na mesma cozinha

### A equipe (8 pessoas)
- **Cozinha (4):** 1 chapeiro, 1 auxiliar de chapa, 1 na fritadeira (batata/frango), 1 na montagem/finalização
- **Salão (2):** 2 garçons, que também levam o pedido de delivery até o balcão de retirada
- **Frente (1):** 1 caixa/atendente de balcão
- **Seu Jorge:** circula, apaga incêndio, às vezes monta lanche

### O layout da cozinha (linha de produção)
```
[ CHAPA ] → [ FRITADEIRA ] → [ BANCADA DE MONTAGEM ] → [ EXPEDIÇÃO / balcão de saída ]
```
- Salão com **10 mesas**; balcão de retirada separado para delivery
- Hoje o único vínculo entre cozinha, salão e delivery é **uma impressora térmica** cuspindo comanda de papel

### Seu Jorge desabafa (na visita, ele disse:)

> *"Sexta à noite chega pedido do balcão, do zap e do app tudo junto. Vira uma pilha de papel na bancada. Semana passada uma comanda caiu atrás da chapa e o cara esperou 40 minutos."*

> *"Meu problema não é fazer o lanche, é **saber qual fazer primeiro**. Às vezes o último a chegar sai antes e quem tá esperando há meia hora fica pra trás."*

> *"Tem pedido que é **uma coca** e pedido que é **quatro combos**. Na pilha de papel parece tudo igual, aí a gente se atrapalha."*

> *"A batata sai da fritadeira e o hambúrguer ainda tá na chapa — ou o contrário. **Nada sincroniza**, um dos dois sempre esfria esperando o outro."*

> *"Quando fica pronto, o garçom não sabe. Ou ele **fica vindo na cozinha toda hora perguntar**, ou o lanche **esfria no balcão** esperando alguém perceber."*

> *"Cliente pede **sem cebola, ponto mal passado, cheddar extra** — isso se perde no papel. Volta o prato, é retrabalho e prejuízo."*

> *"Delivery e salão brigam pela mesma cozinha. Não sei o que priorizar: o cara que tá na mesa olhando pra mim ou o motoboy que já chegou?"*

> *"A impressora **vive travando e acabando papel** no pior momento."*

> *"Meus funcionários **não podem ficar clicando** — mão suja, correria. Tem que ser no olhar."*

> *"Às vezes o cliente **desiste** e a cozinha já começou o pedido. Ninguém avisa."*

---

## 🎯 A missão

Seu Jorge ouviu falar de um tal de **KDS** (*Kitchen Display System* — painel de pedidos da cozinha) e acha que pode ser a salvação. Mas ele não sabe o que é, nem o que precisa ter.

**É com você.** Sua missão tem quatro partes:

1. **Entender a dor.** Leia o cenário acima e identifique o que realmente dói. Nem tudo tem o mesmo peso.
2. **Decidir o escopo.** Defina o que o KDS precisa resolver *agora* e o que fica para depois. Cortar bem é parte da nota.
3. **Projetar.** Desenhe como esse KDS funciona — o fluxo, as telas, a hierarquia da informação. Não precisa ser um mockup lindo no Figma; pode ser esboço, wireframe ou já direto no código. Mas queremos entender **por que** ficou assim.
4. **Construir.** Entregue uma versão **navegável e funcional** do KDS, consumindo o back que já deixamos pronto pra você (veja abaixo).

Não esperamos que você resolva *todas* as falas do Seu Jorge. Esperamos que você escolha as certas, com critério, e explique o porquê.

---

## 🛠️ Requisitos técnicos

O KDS roda numa cozinha, num **tablet Android** (e a gente sonha em ver rodando também no **telefone** e quem sabe numa **TV** na parede). Ou seja: é um app, não um site.

### Stack

Escolha **uma**:

- ✅ **React Native + TypeScript** — *preferida.* É o que usamos nos nossos fronts mobile, então conseguimos avaliar suas decisões lado a lado com as nossas.
- ✅ **Kotlin nativo (Jetpack Compose)** — totalmente aceito e **não penaliza**. Só saiba que, por não ser a stack do nosso dia a dia, você precisará ser mais autossuficiente ao justificar sua arquitetura.

Use **TypeScript com `strict` ligado** (ou o equivalente em tipagem forte no Kotlin). É o nosso padrão.

### O que vamos olhar de perto

Estes são os pontos onde um trabalho Pleno/Sênior se destaca:

- **Tempo real de verdade.** Pedido novo tem que **aparecer sozinho** na tela, sem ninguém dar refresh. Você escolhe a técnica (WebSocket, SSE, polling…) — mas queremos ver você **justificar a escolha** e tratar o que costuma ser esquecido:
  - **Reconexão** quando a internet da cozinha cai (e ela cai).
  - **Sem duplicar pedido** quando o mesmo evento chega duas vezes.
- **Aguentar o pico.** A tela precisa continuar fluida com a fila cheia (pense em dezenas/centenas de pedidos ativos e um novo a cada poucos segundos). Renderização de lista pensada para escala.
- **Ciclo de vida do pedido claro.** Ex.: `Recebido → Em preparo → Pronto → Entregue/Retirado`. Modele as transições com intenção, não com `if` espalhado.
- **Responsividade por contexto de uso.** O tablet fica em pé, na horizontal (**landscape**), no calor da cozinha. Pense em como isso muda no telefone e numa TV vista de longe.
- **Não morrer quando o back falha.** Internet caiu? Avise ("reconectando…"), mantenha o último estado conhecido. Nunca tela branca, nunca um erro cru na cara do cozinheiro.
- **UX de cozinha de verdade.** Mão suja, correria, sem tempo de "clicar direitinho": alvos de toque grandes, informação legível à distância, e estados que se distinguem **sem depender só de cor**. Um contador de tempo do pedido correndo à vista ajuda muito.
- **Testes onde importa.** Não queremos cobertura de enfeite. Queremos teste na **lógica que quebra em produção** — as transições de estado, o tratamento de um evento duplicado, um componente central.

### O back (você vai "encostar no back")

A gente já deixou um **mock server pronto** na pasta [`/mock`](./mock) deste repositório. Ele:

- Expõe uma **API REST** para listar pedidos e mudar o status de um pedido.
- Empurra **eventos em tempo real** (pedidos novos e atualizações) via **SSE**.
- Roda **sem instalar nada** — só precisa de Node. Veja o [README do mock](./mock/README.md).

O "encostar no back **com supervisão**" deste desafio é literal: sinta-se à vontade para **ler, ajustar e estender esse mock** (adicionar um campo, um endpoint, mudar a cadência dos eventos) para servir a sua solução. A gente quer ver como você **lê código que não é seu e mexe nele com cirurgia** — não que você escreva um backend do zero.

> Você **não** precisa (nem deve) construir um backend próprio. O foco do desafio é o front.

---

## 📦 Como entregar

- **Repositório Git público** no seu GitHub, com o **histórico de commits preservado**. Commits pequenos e com mensagem clara valem a favor; um único commit gigante "primeira versão" conta contra.
- Um **README** seu explicando:
  - **Como rodar** — comandos reais, testados numa máquina limpa. Se não roda pra gente, não conseguimos avaliar.
  - **Suas decisões e trade-offs** — o que você priorizou, o que cortou, por que escolheu tal técnica de tempo real, o que faria numa "v2".
  - **Como você usou IA** (veja a seção lá em cima).
- Um **vídeo/GIF curto** mostrando o KDS reagindo a um pedido novo em tempo real é opcional, mas ajuda muito.

Se não der tempo de fazer tudo, **entregue mesmo assim** e conte o que ficou de fora e por quê. Preferimos ver um recorte bem-feito e bem explicado do que tudo pela metade.

---

## ⏱️ Uma palavra sobre tempo

Não cronometramos. Mas é um desafio pensado para caber num fim de semana sem virar noites. Se você está indo muito além disso, provavelmente está construindo mais do que a gente pediu — e **saber parar no ponto certo também é uma decisão de sênior**.

Qualquer dúvida sobre o cenário, decida como você acha melhor e **anote a premissa** no seu README. Interpretar a ambiguidade faz parte.

Boa sorte, e divirta-se resolvendo o problema do Seu Jorge. 🍔🔥
