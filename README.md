<div align="center">

<img src="public/nexos-mark.png" alt="Nexos" width="88" />

# Nexos

**Orçamentos com IA, financeiro e estoque para prestadores de serviço.**

O prestador fala o que vai fazer, a IA monta o orçamento, ele revisa e manda um link para o cliente aprovar.

![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)

</div>

---

## Sobre o projeto

Eletricistas, pintores, técnicos e outros autônomos costumam fazer orçamento no papel ou pelo WhatsApp, e acabam perdendo o controle do que foi aprovado, pago e gasto. O Nexos junta isso num lugar só.

1. **Relato por voz ou texto.** O prestador descreve o serviço do jeito que falaria com o cliente, por exemplo "troca de 3 tomadas e instalação de um chuveiro, uns 2 mil".
2. **Orçamento gerado pela IA.** O Gemini transforma o relato em itens, preços, prazo e materiais, num JSON validado por schema.
3. **Revisão humana.** O prestador corrige o que quiser antes de salvar. O total é sempre recalculado no servidor, então nunca vem direto do modelo.
4. **Link público para o cliente.** O cliente abre o orçamento com a marca da empresa e aprova ou recusa sem precisar criar conta.
5. **Financeiro e estoque.** Receita, valores a receber, custo e lucro por orçamento, além do controle de materiais com alerta de estoque baixo.

## Funcionalidades

| | |
| --- | --- |
| 🎙️ **Entrada por voz** | Reconhecimento de fala do navegador em `pt-BR`. Quando o navegador não tem esse recurso, o áudio gravado é transcrito pelo Gemini. |
| 🤖 **Geração estruturada** | Usa `responseSchema` e temperatura baixa. Quando um modelo não está disponível, o app tenta o próximo da lista, e os erros aparecem em português. |
| 🧾 **Orçamento público** | Página `/proposal/[id]` com logo e dados da empresa, além de Open Graph para o link ficar bonito no WhatsApp. |
| 💰 **Painel financeiro** | Receita paga, valores a receber, lucro realizado, ticket médio, receita por mês e itens mais vendidos (Recharts). |
| 📦 **Estoque** | Produtos com SKU, unidade, custo, preço de venda e quantidade mínima. |
| 🚚 **Frete e custos** | Frete opcional e custo por item, para calcular a margem de cada orçamento. |
| 💳 **Assinatura** | Planos mensal, trimestral e anual com checkout e webhooks da AbacatePay. |
| 🔐 **Autenticação** | NextAuth com credenciais, sessão JWT e senhas com bcrypt. As rotas são protegidas por middleware. |

## Stack

- **Front-end:** Next.js 14 (App Router), React 18, Tailwind CSS, componentes no estilo shadcn/ui, Lucide e Recharts
- **Back-end:** Route Handlers e Server Components do Next.js, NextAuth 4
- **Dados:** Prisma 6 com SQLite
- **IA:** Google Gemini (`@google/genai`) para gerar orçamentos e transcrever áudio
- **Pagamentos:** AbacatePay (checkout e webhooks)

## Decisões técnicas

- **Não confiar no total da IA.** O modelo devolve itens e um total, mas o servidor descarta esse total e soma os itens em centavos (`lib/money.ts`). O mesmo vale para o que chega do cliente.
- **Autorização em duas camadas.** O `middleware.ts` roda na edge e só lê o JWT. As regras finas, como quem é o dono do orçamento, ficam nos handlers. O cliente sem conta só consegue mudar o `status`, e mais nada.
- **Sem vazar existência.** Apagar o orçamento de outro usuário devolve `404`, não `403`.
- **Dinheiro em formato brasileiro.** `parseMoney` aceita `1.500`, `1,50` e `R$ 2.000,00`.
- **Leitura direta no servidor.** As páginas autenticadas leem o Prisma em Server Components. A API fica para as mutações.

A arquitetura completa, com diagramas de fluxo, modelo de dados e contrato das APIs, está em [ARQUITETURA.md](ARQUITETURA.md).

## Como rodar

Requisitos: Node.js 20+ e uma chave do [Google AI Studio](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/gamabryan/nexo.git
cd nexo
npm install
cp .env.example .env
```

Preencha o `.env`:

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Banco SQLite. O exemplo usa `file:./dev.db`. |
| `GEMINI_API_KEY` | Chave da API do Gemini. |
| `NEXTAUTH_URL` | URL do app. Em desenvolvimento, `http://localhost:3000`. |
| `NEXTAUTH_SECRET` | Segredo longo e aleatório para assinar a sessão. |
| `ABACATEPAY_API_KEY` | Chave da [AbacatePay](https://www.abacatepay.com). |
| `ABACATEPAY_WEBHOOK_SECRET` | Segredo para validar os webhooks da AbacatePay. |

Crie o banco e suba o servidor:

```bash
npm run db:push
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

<details>
<summary><strong>Configurar a assinatura (AbacatePay)</strong></summary>

1. Preencha `ABACATEPAY_API_KEY` e `ABACATEPAY_WEBHOOK_SECRET` no `.env`.
2. No painel da AbacatePay, cadastre o webhook:
   - URL: `https://SEU_DOMINIO/api/webhooks/abacatepay?webhookSecret=SEU_SECRET`
   - Eventos: `subscription.completed`, `subscription.renewed`, `subscription.cancelled`, `checkout.completed`
3. Ao criar a conta, o usuário escolhe o plano e paga no checkout da AbacatePay.
4. Sem assinatura ativa, o app redireciona para `/subscribe`. Em localhost, use um túnel HTTPS (ngrok, cloudflared) para receber o webhook.

</details>

## Rotas

| Rota | Acesso | Função |
| --- | --- | --- |
| `/` | Prestador | Lista de orçamentos e totais |
| `/new` | Prestador | Relato, geração e revisão |
| `/finance` | Prestador | Painel financeiro |
| `/stock` | Prestador | Estoque de produtos |
| `/settings` | Prestador | Dados e logo da empresa |
| `/subscribe` | Prestador | Pagamento ou reativação da assinatura |
| `/login`, `/register` | Público | Entrada e cadastro |
| `/proposal/[id]` | Público | Orçamento para o cliente aprovar ou recusar |

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Sobe o build |
| `npm run lint` | ESLint |
| `npm run db:push` | Aplica o schema do Prisma no SQLite |

## Estrutura

```text
app/          páginas e route handlers (app/api)
components/   UI e formulários ("use client")
lib/          domínio: auth, Prisma, Gemini, dinheiro, finanças, assinatura
prisma/       schema do banco
middleware.ts proteção de rotas
```

---

<div align="center">
Feito por <a href="https://github.com/gamabryan">Bryan</a>
</div>
