# Nexos

Aplicação para prestadores de serviço: orçamentos com IA, receita e estoque. O prestador monta propostas, acompanha o financeiro e controla materiais no mesmo lugar.

## O que o produto faz

- Cadastro e login com e-mail e senha.
- Assinatura obrigatória na criação da conta (1 mês R$ 20, 3 meses R$ 50 ou anual R$ 100) via AbacatePay.
- Lista dos orçamentos do prestador logado, com total aprovado e status.
- Novo orçamento por texto ou microfone (reconhecimento de voz do navegador, em português).
- Geração estruturada com o Gemini, seguida de revisão manual antes de salvar.
- Página pública `/proposal/[id]` com os dados da empresa e os botões de aprovar ou recusar.
- Cadastro da empresa (nome, e-mail e nome fantasia) usado no orçamento enviado ao cliente.
- Controle de estoque de produtos e materiais, com alerta de estoque baixo.

A arquitetura, os fluxos e o modelo de dados estão em [arquitetura.md](arquitetura.md).

## Stack

- Next.js 14 (App Router) e React 18
- TypeScript, Tailwind CSS e componentes no estilo shadcn/ui
- NextAuth (credenciais, sessão JWT)
- Prisma com SQLite
- Google Gemini (`@google/genai`)

## Como rodar

Requisitos: Node.js 20+ e uma chave do [Google AI Studio](https://aistudio.google.com/apikey).

```bash
npm install
cp .env.example .env
```

Preencha o `.env`:

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Banco SQLite. O exemplo usa `file:./dev.db`. |
| `GEMINI_API_KEY` | Chave da API do Gemini. Sem ela, a geração de orçamento falha. |
| `NEXTAUTH_URL` | URL pública do app. Em desenvolvimento, `http://localhost:3000`. |
| `NEXTAUTH_SECRET` | Segredo longo e aleatório para assinar a sessão. |
| `ABACATEPAY_API_KEY` | Chave da [AbacatePay](https://www.abacatepay.com) para assinatura do prestador. |
| `ABACATEPAY_WEBHOOK_SECRET` | Secret para validar webhooks da AbacatePay. |

Crie o banco e suba o servidor:

```bash
npm run db:push
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Sem sessão, o app redireciona para `/login`.

### Assinatura (AbacatePay)

1. Preencha `ABACATEPAY_API_KEY` e `ABACATEPAY_WEBHOOK_SECRET` no `.env`.
2. No painel da AbacatePay, cadastre o webhook:
   - URL: `https://SEU_DOMINIO/api/webhooks/abacatepay?webhookSecret=SEU_SECRET`
   - Eventos: `subscription.completed`, `subscription.renewed`, `subscription.cancelled`, `checkout.completed`
3. Ao criar a conta, o usuário escolhe o plano (R$ 20 / R$ 50 / R$ 100) e paga no checkout da AbacatePay.
4. Sem assinatura ativa, o app redireciona para `/subscribe`. Em localhost, use um túnel HTTPS para o webhook.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento. |
| `npm run build` | Build de produção. |
| `npm start` | Sobe o build. |
| `npm run lint` | ESLint. |
| `npm run db:push` | Aplica o schema Prisma no SQLite, sem migrations. |

## Rotas principais

| Rota | Quem acessa | Função |
| --- | --- | --- |
| `/` | Prestador logado | Lista de orçamentos. |
| `/new` | Prestador logado | Relato, geração e revisão. |
| `/stock` | Prestador logado | Estoque de produtos. |
| `/settings` | Prestador logado | Dados da empresa. |
| `/login` e `/register` | Público | Entrada e cadastro (com escolha de plano). |
| `/subscribe` | Prestador logado | Pagamento/reativação da assinatura. |
| `/proposal/[id]` | Público | Orçamento para o cliente. |
