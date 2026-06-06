# Tiendanube AI Business Analyst — Concrete MVP Tracker

Date: 2026-06-04

## Current status snapshot (updated 2026-06-06)

What is ALREADY true in the repo right now:

- [x] Next.js App Router project exists in the repo root.
- [x] TypeScript is configured.
- [x] Tailwind CSS v4 is configured.
- [x] `.env.local` exists.
- [x] Tiendanube app was created in Partners.
- [x] Tiendanube `client_id` and `client_secret` are already available locally.
- [x] Supabase project was created.
- [x] Supabase URL and publishable/secret keys are already available locally.
- [x] Groq API key is already available locally.
- [x] `npm run build` passes.
- [x] Tiendanube OAuth start/callback flow is implemented.
- [x] Tiendanube OAuth flow was tested end-to-end against a real store.
- [x] `stores` row is persisted after OAuth success.
- [x] `store_connections` row is persisted after OAuth success.
- [x] Access token is stored encrypted, not plaintext.

What is NOT done yet:

- [x] MVP dependencies beyond the default Next.js setup are installed.
- [x] Drizzle is configured with migration generation and push scripts.
- [ ] Supabase client/server helpers are not created yet.
- [x] Tiendanube OAuth routes are implemented.
- [x] Product sync foundation is implemented and verified with a real store.
- [x] Dashboard sync controls/status are implemented.
- [ ] AI chat routes/tools are not implemented yet.
- [x] Store metadata hydration after OAuth is implemented and verified with a real store.
- [ ] Business logic outside the OAuth connection flow is still placeholder-only.

Important corrections:

- [x] `TIENDANUBE_REDIRECT_URI` points to the OAuth callback route.
- [x] `DATABASE_URL` uses the real database password.
- [x] `GROQ_MODEL` is filled explicitly.

## Immediate next implementation step

**Next up:** Tiendanube orders sync foundation.

Why this is next:

- OAuth connection already works end-to-end.
- We already persist `tiendanube_store_id`, encrypted token, store metadata, products, and product variants correctly.
- The next product milestone requires real orders/customers in Postgres so analytics can move beyond catalog trust checks.

What to add:

- [ ] Fetch orders for the last 90 days.
- [ ] Persist normalized orders and order items in Postgres.
- [ ] Attach customers to orders when scope/data is available.
- [ ] Extend sync job metadata for orders import counts/errors.

## Product goal

Build an MVP where a Tiendanube merchant connects their store and asks questions about sales, products, customers, stock, and weekly performance.

Positioning:

> Ask your Tiendanube what happened, what changed, and what to do next.

Important: this is **not** just a dashboard. The main difference is the **AI chat analyst**. The dashboard exists only so the user can manually verify the data.

---


### 0.2 Define MVP promise

- [ ] MVP promise: “Ask questions about your Tiendanube sales and get answers with tables/charts.”
- [ ] MVP does **read-only** analytics.
- [ ] MVP does **not** modify products, orders, prices, or stock.
- [ ] MVP does **not** connect Meta Ads, Google Analytics, or WhatsApp yet.

---

## 1. Accounts, API keys, and secrets needed

### 1.1 Tiendanube / Nuvemshop developer app

Create a Tiendanube/Nuvemshop app from the partner/developer area.

You need:

- [x] `TIENDANUBE_CLIENT_ID`
- [x] `TIENDANUBE_CLIENT_SECRET`
- [x] `TIENDANUBE_REDIRECT_URI`
- [x] App install/authorization URL
- [x] App scopes

Recommended MVP scopes:

- [x] `read_orders`
- [x] `read_products`
- [x] `read_customers` only if customer/repeat-buyer metrics are included

Confirmed from docs:

- Tiendanube uses OAuth authorization code flow.
- Access tokens do not expire normally; they become invalid if a new token is generated or the merchant uninstalls the app.
- The OAuth response includes `user_id`, which is the store ID used in API URLs.
- Webhooks require the matching resource permission.

### 1.2 Groq

You need:

- [x] `GROQ_API_KEY`
- [ ] `GROQ_MODEL`

Recommended starting model:

- [ ] `llama-3.3-70b-versatile` for better reasoning/tool-use quality.
- [ ] fallback for cheaper/faster tests: `llama-3.1-8b-instant`.
- [ ] evaluate Groq's currently available models before locking this for production.

Use Groq for:

- AI chat answer generation.
- Tool/function calling through Groq's OpenAI-compatible Chat Completions API.
- Fast streaming responses through Vercel AI SDK's Groq provider.

Important Groq limitation to design around:

- Groq Structured Outputs and tool use/streaming have documented compatibility limits. For MVP, use tool calls for metric fetching, then validate the final UI payload with Zod in your backend. Do not rely blindly on model-generated JSON.

Do **not** use Groq to calculate metrics from raw pasted data. Metrics must come from backend SQL/tool functions.

### 1.3 Supabase

You need:

- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [x] `SUPABASE_SECRET_KEY` or server-side database connection string
- [x] `DATABASE_URL`

Use Supabase Postgres for:

- normalized Tiendanube data,
- metric queries,
- chat history,
- AI tool-call logs,
- sync jobs.

### 1.4 App auth

MVP options:

- [ ] Option A: Supabase Auth magic link/email login.
- [ ] Option B: no separate user auth at first; login only through Tiendanube OAuth.

Recommended MVP:

- [x] Use Tiendanube OAuth as the first connection flow.
- [ ] Add Supabase Auth only if you need non-Tiendanube login/users.

### 1.5 Hosting/deployment

You need:

- [ ] Vercel project
- [ ] Vercel environment variables
- [ ] production domain or Vercel preview URL
- [ ] HTTPS redirect URL configured in Tiendanube app

Optional later:

- [ ] Sentry key for errors
- [ ] PostHog key for product analytics
- [ ] Resend key for weekly email reports
- [ ] WhatsApp Business API provider if reports move to WhatsApp

---

## 2. Recommended MVP technologies

### Core stack

- [x] Next.js App Router
- [x] TypeScript
- [x] Tailwind CSS
- [ ] shadcn/ui
- [x] Supabase Postgres
- [x] Drizzle ORM
- [ ] Vercel AI SDK
- [ ] Groq Chat Completions API / tool calling
- [ ] Recharts through shadcn/ui chart components
- [ ] Zod for validation

### Why this stack

- Next.js App Router: good for full-stack app, route handlers, server components, dashboard pages.
- Supabase Postgres: ecommerce metrics are relational; SQL is the right foundation.
- Drizzle: gives type-safe SQL while staying close to raw SQL for analytics.
- shadcn/ui + Recharts: fast dashboard UI with tables/cards/charts.
- Vercel AI SDK + Groq provider: streaming chat UI and Groq model integration.
- Zod: validate API input, AI tool args, and structured AI output.

---

## 3. Install dependencies

After creating the Next.js app:

```bash
npx create-next-app@latest tiendanube-ai-analyst --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
cd tiendanube-ai-analyst
```

Install app dependencies:

```bash
npm install drizzle-orm postgres zod ai @ai-sdk/groq recharts date-fns lucide-react
npm install @supabase/supabase-js
npm install -D drizzle-kit
```

Current repo status:

- [x] Next.js app itself is already created.
- [x] `drizzle-orm`
- [x] `postgres`
- [x] `zod`
- [x] `ai`
- [x] `@ai-sdk/groq`
- [x] `recharts`
- [x] `date-fns`
- [x] `lucide-react`
- [x] `@supabase/supabase-js`
- [x] `drizzle-kit`

Initialize shadcn/ui:

```bash
npx shadcn@latest init
npx shadcn@latest add button card input textarea table badge separator skeleton alert dialog dropdown-menu tabs chart
```

Optional, but useful:

```bash
npm install sonner
npx shadcn@latest add sonner
```

---

## 4. Environment variables

Create `.env.local`:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_SECRET=replace-with-random-secret

# Tiendanube
TIENDANUBE_CLIENT_ID=
TIENDANUBE_CLIENT_SECRET=
TIENDANUBE_REDIRECT_URI=http://localhost:3000/api/tiendanube/oauth/callback
TIENDANUBE_API_BASE_URL=https://api.tiendanube.com/v1

# Supabase / Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
DATABASE_URL=

# Groq
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
```

Production values go in Vercel Environment Variables.

Current repo status:

- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `APP_SECRET`
- [x] `TIENDANUBE_CLIENT_ID`
- [x] `TIENDANUBE_CLIENT_SECRET`
- [x] `TIENDANUBE_REDIRECT_URI` points to `/api/tiendanube/oauth/callback`
- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [x] `SUPABASE_SECRET_KEY`
- [x] `DATABASE_URL` uses the real password
- [x] `GROQ_API_KEY`
- [x] `GROQ_MODEL`

Never expose:

- `TIENDANUBE_CLIENT_SECRET`
- Tiendanube access tokens
- `GROQ_API_KEY`
- `DATABASE_URL`
- Supabase secret/server key

---

## 5. MVP architecture

```text
Merchant
  ↓
Next.js App Router
  ├─ Landing page
  ├─ Connect Tiendanube page
  ├─ Dashboard page
  ├─ AI chat page
  └─ API route handlers
       ├─ /api/tiendanube/oauth/start
       ├─ /api/tiendanube/oauth/callback
       ├─ /api/sync/run
       ├─ /api/chat
       └─ /api/webhooks/tiendanube later
  ↓
Application services
  ├─ Tiendanube API client
  ├─ Sync service
  ├─ Metrics service
  ├─ AI analyst service
  └─ Chart/table response builder
  ↓
Supabase Postgres
  ├─ stores
  ├─ store_connections
  ├─ products
  ├─ product_variants
  ├─ orders
  ├─ order_items
  ├─ customers
  ├─ sync_jobs
  ├─ chat_messages
  └─ ai_tool_calls
```

Rule:

> AI never queries Tiendanube directly. AI calls backend tools. Backend tools query Postgres.

---

## 6. Suggested project structure

```text
src/
  app/
    page.tsx
    connect/page.tsx
    dashboard/page.tsx
    chat/page.tsx
    api/
      tiendanube/oauth/start/route.ts
      tiendanube/oauth/callback/route.ts
      sync/run/route.ts
      chat/route.ts
      webhooks/tiendanube/route.ts
  components/
    dashboard/
      metric-card.tsx
      sales-trend-chart.tsx
      top-products-table.tsx
      insight-card.tsx
    chat/
      chat-panel.tsx
      message-bubble.tsx
      tool-result-table.tsx
      tool-result-chart.tsx
    layout/
      app-shell.tsx
  lib/
    ai/
      analyst.ts
      prompts.ts
      schemas.ts
      tools.ts
    db/
      client.ts
      schema.ts
      queries/
        metrics.ts
    tiendanube/
      client.ts
      oauth.ts
      sync.ts
      types.ts
    metrics/
      sales.ts
      products.ts
      stock.ts
    security/
      encryption.ts
    utils.ts
```

---

## 7. Database schema tracker

### 7.1 `stores`

- [ ] `id` uuid primary key
- [ ] `tiendanube_store_id` text unique not null
- [ ] `name` text
- [ ] `country` text
- [ ] `currency` text
- [ ] `created_at` timestamp
- [ ] `updated_at` timestamp

### 7.2 `store_connections`

- [ ] `id` uuid primary key
- [ ] `store_id` uuid references stores
- [ ] `access_token_encrypted` text not null
- [ ] `scopes` text[]
- [ ] `status` text: active/uninstalled/error
- [ ] `created_at` timestamp
- [ ] `updated_at` timestamp

### 7.3 `products`

- [ ] `id` uuid primary key
- [ ] `store_id` uuid references stores
- [ ] `tiendanube_product_id` text not null
- [ ] `name` text
- [ ] `handle` text
- [ ] `published` boolean
- [ ] `raw` jsonb
- [ ] unique index on `store_id, tiendanube_product_id`

### 7.4 `product_variants`

- [ ] `id` uuid primary key
- [ ] `store_id` uuid references stores
- [ ] `product_id` uuid references products
- [ ] `tiendanube_variant_id` text not null
- [ ] `sku` text
- [ ] `price` numeric
- [ ] `stock` integer nullable
- [ ] `raw` jsonb
- [ ] unique index on `store_id, tiendanube_variant_id`

### 7.5 `orders`

- [ ] `id` uuid primary key
- [ ] `store_id` uuid references stores
- [ ] `tiendanube_order_id` text not null
- [ ] `order_number` text
- [ ] `status` text
- [ ] `payment_status` text
- [ ] `shipping_status` text
- [ ] `total` numeric
- [ ] `currency` text
- [ ] `created_at_tiendanube` timestamp
- [ ] `paid_at` timestamp nullable
- [ ] `cancelled_at` timestamp nullable
- [ ] `customer_id` uuid nullable
- [ ] `raw` jsonb
- [ ] unique index on `store_id, tiendanube_order_id`

### 7.6 `order_items`

- [ ] `id` uuid primary key
- [ ] `store_id` uuid references stores
- [ ] `order_id` uuid references orders
- [ ] `product_id` uuid nullable
- [ ] `variant_id` uuid nullable
- [ ] `product_name` text
- [ ] `quantity` integer
- [ ] `unit_price` numeric
- [ ] `total_price` numeric

### 7.7 `customers`

- [ ] `id` uuid primary key
- [ ] `store_id` uuid references stores
- [ ] `tiendanube_customer_id` text not null
- [ ] `name` text nullable
- [ ] `email_hash` text nullable
- [ ] `phone_hash` text nullable
- [ ] `raw` jsonb without unnecessary PII if possible
- [ ] unique index on `store_id, tiendanube_customer_id`

### 7.8 `sync_jobs`

- [ ] `id` uuid primary key
- [ ] `store_id` uuid references stores
- [ ] `type` text: initial/orders/products/customers
- [ ] `status` text: pending/running/succeeded/failed
- [ ] `started_at` timestamp nullable
- [ ] `finished_at` timestamp nullable
- [ ] `error_message` text nullable
- [ ] `metadata` jsonb

### 7.9 `chat_messages`

- [ ] `id` uuid primary key
- [ ] `store_id` uuid references stores
- [ ] `role` text: user/assistant/system
- [ ] `content` text
- [ ] `structured_payload` jsonb nullable
- [ ] `created_at` timestamp

### 7.10 `ai_tool_calls`

- [ ] `id` uuid primary key
- [ ] `store_id` uuid references stores
- [ ] `chat_message_id` uuid nullable
- [ ] `tool_name` text
- [ ] `arguments` jsonb
- [ ] `result_summary` jsonb
- [ ] `created_at` timestamp

---

## 8. Tiendanube integration steps

### 8.1 OAuth start route

- [ ] Create `/api/tiendanube/oauth/start`.
- [ ] Generate a CSRF `state` value.
- [ ] Save `state` in secure cookie.
- [ ] Redirect to Tiendanube install/authorization URL.

Auth URL pattern from docs:

```text
https://www.tiendanube.com/apps/{app_id}/authorize
```

### 8.2 OAuth callback route

- [x] Create `/api/tiendanube/oauth/callback`.
- [x] Validate `state`.
- [x] Read `code` from query params.
- [x] Exchange `code` for access token.
- [x] Save `user_id` as Tiendanube store ID.
- [x] Encrypt and save access token.
- [x] Redirect to `/dashboard?sync=initial`.
- [x] Fetch store metadata after token exchange.
- [x] Persist `name`, `country`, and `currency` in `stores`.

### 8.3 API client

- [x] Build `lib/tiendanube/client.ts`.
- [x] Base URL: `https://api.tiendanube.com/v1/{store_id}`.
- [x] Add authentication bearer token header.
- [x] Add clear user-agent/app identification if required by app review.
- [x] Parse rate-limit headers:
  - `x-rate-limit-limit`
  - `x-rate-limit-remaining`
  - `x-rate-limit-reset`
- [x] Handle HTTP 429 with retry/backoff.

### 8.4 Initial sync

MVP initial sync:

- [x] Fetch products.
- [x] Fetch variants from product payload or variant endpoint if needed.
- [ ] Fetch orders for last 90 days.
- [ ] Fetch customers only if `read_customers` is enabled.
- [x] Upsert products and variants by Tiendanube IDs.
- [x] Save raw JSON in `raw` columns for debugging.

Rate-limit rule:

- [ ] Keep requests under default Tiendanube limit: 2 requests/sec per store/app.
- [ ] Do not fire 20+ parallel requests.

### 8.5 Webhooks later, not first

Production/webhook events to add later:

- [ ] `order/created`
- [ ] `order/paid`
- [ ] `order/cancelled`
- [ ] `product/updated`
- [ ] `customer/updated`
- [ ] `app/uninstalled`

MVP can start with manual sync button + initial sync.

---

## 9. Simple manual analytics dashboard

The dashboard is not the main product, but it is necessary for trust.

### 9.1 Dashboard cards

- [ ] Revenue this week
- [ ] Revenue previous week
- [ ] Revenue change percentage
- [ ] Orders this week
- [ ] Average order value
- [ ] Top product this week

### 9.2 Charts

Use shadcn/ui chart components with Recharts.

- [ ] Line chart: sales by day.
- [ ] Bar chart: top products by units sold.
- [ ] Bar chart: current period vs previous period.

### 9.3 Tables

- [ ] Top products table.
- [ ] Product comparison table.
- [ ] Low-stock opportunities table.
- [ ] Recent orders table.

### 9.4 Insight cards

- [ ] “Best product this week.”
- [ ] “Product losing momentum.”
- [ ] “Possible restock opportunity.”
- [ ] “Best day of sales.”

---

## 10. Metrics service tools

Build these as pure backend functions first. The AI chat will call them later.

### 10.1 `getSalesSummary`

Inputs:

- [ ] `storeId`
- [ ] `startDate`
- [ ] `endDate`

Returns:

- [ ] total revenue
- [ ] order count
- [ ] average order value
- [ ] units sold

### 10.2 `getTopProducts`

Inputs:

- [ ] `storeId`
- [ ] `startDate`
- [ ] `endDate`
- [ ] `limit`

Returns:

- [ ] product name
- [ ] units sold
- [ ] revenue
- [ ] order count

### 10.3 `comparePeriods`

Inputs:

- [ ] `storeId`
- [ ] `currentStart`
- [ ] `currentEnd`
- [ ] `previousStart`
- [ ] `previousEnd`

Returns:

- [ ] current metrics
- [ ] previous metrics
- [ ] absolute difference
- [ ] percentage difference

### 10.4 `compareProductSales`

Returns:

- [ ] product
- [ ] current units/revenue
- [ ] previous units/revenue
- [ ] change percentage

### 10.5 `getLowStockOpportunities`

Returns products where:

- [ ] stock is low or below threshold
- [ ] recent demand is high
- [ ] product is active/published

### 10.6 `generateWeeklyBusinessSnapshot`

Returns:

- [ ] summary
- [ ] top wins
- [ ] warnings
- [ ] recommended actions
- [ ] tables/charts payloads

---

## 11. AI chat design with Groq

### 11.1 Chat behavior

The chat should answer business questions like:

- [ ] “What were my best-selling products this month?”
- [ ] “Compare this week vs last week.”
- [ ] “Which products should I restock?”
- [ ] “What changed this week?”
- [ ] “Give me 3 actions for this week.”

If unsupported:

- [ ] Say it cannot answer that yet.
- [ ] Suggest one supported question.

### 11.2 AI tool-calling architecture

```text
User asks question
  ↓
/api/chat
  ↓
AI model decides tool call
  ↓
Validated Zod schema for tool args
  ↓
Backend metric function runs SQL
  ↓
Tool result returned to AI
  ↓
AI creates short explanation
  ↓
UI renders answer + structured table/chart
```

### 11.3 Allowed AI tools for MVP

- [ ] `get_sales_summary`
- [ ] `get_top_products`
- [ ] `compare_periods`
- [ ] `compare_product_sales`
- [ ] `get_low_stock_opportunities`
- [ ] `get_weekly_business_snapshot`

### 11.4 AI response schema

Every assistant response should become structured UI:

```ts
type AiAnalystResponse = {
  answer: string
  confidence: 'high' | 'medium' | 'low'
  tables?: Array<{
    title: string
    columns: string[]
    rows: Array<Array<string | number>>
  }>
  charts?: Array<{
    type: 'line' | 'bar'
    title: string
    xKey: string
    yKeys: string[]
    data: Array<Record<string, string | number>>
  }>
  recommendedActions: string[]
  evidence: Array<{
    metric: string
    value: string | number
    period?: string
  }>
}
```

### 11.5 AI system rules

- [ ] Answer in simple Spanish first.
- [ ] Never invent numbers.
- [ ] Use tools for metrics.
- [ ] If the data is missing, say what sync/data is missing.
- [ ] Keep answers short.
- [ ] Always include evidence when giving a recommendation.
- [ ] Prefer tables for comparisons.
- [ ] Prefer charts for trends over time.

### 11.6 Groq implementation notes

- [ ] Install `@ai-sdk/groq` instead of `@ai-sdk/openai`.
- [ ] Use `GROQ_API_KEY` in `.env.local`.
- [ ] In `/api/chat`, import `groq` from `@ai-sdk/groq`.
- [ ] Use `streamText` from `ai` for streaming chat responses.
- [ ] Start with `groq(process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile')`.
- [ ] Keep tool results structured and backend-generated.
- [ ] Validate final table/chart payloads with Zod before rendering.
- [ ] If Groq returns malformed JSON/tool output, fail safely and ask the user to retry or simplify the question.

Example route skeleton:

```ts
import { groq } from '@ai-sdk/groq'
import { streamText, tool } from 'ai'
import { z } from 'zod'

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, storeId } = await req.json()

  const result = streamText({
    model: groq(process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'),
    system: 'You are a business analyst for Tiendanube stores. Never invent numbers. Use tools for metrics.',
    messages,
    tools: {
      get_sales_summary: tool({
        description: 'Get sales summary for a store and date range.',
        parameters: z.object({
          startDate: z.string(),
          endDate: z.string(),
        }),
        execute: async ({ startDate, endDate }) => {
          return getSalesSummary({ storeId, startDate, endDate })
        },
      }),
    },
  })

  return result.toDataStreamResponse()
}
```

### 11.6 AI cost/control

- [ ] Save every tool call.
- [ ] Save token usage if available.
- [ ] Limit max chat turns per request.
- [ ] Limit tool calls per message.
- [ ] Add a fallback when Groq fails.
- [ ] Do not send customer emails/phones to AI.

---

## 12. Build phases with concrete tasks

### Phase 1 — Project foundation

- [x] Create Next.js app.
- [ ] Install dependencies.
- [ ] Configure `.env.local`.
- [ ] Initialize shadcn/ui.
- [ ] Create app shell layout.
- [ ] Create landing page.
- [ ] Create placeholder dashboard page.
- [ ] Create placeholder chat page.

Done when:

- [x] `npm run build` works.
- [ ] `npm run dev` works.
- [ ] `/`, `/connect`, `/dashboard`, `/chat` render.

### Phase 2 — Database foundation

- [x] Create Drizzle schema.
- [x] Create database connection.
- [x] Add migrations.
- [x] Create all MVP tables.
- [ ] Add indexes for `store_id` and Tiendanube IDs.
- [ ] Add seed/mock data script.
- [x] Add indexes for `store_id` and Tiendanube IDs.

Done when:

- [ ] Local app can read mock sales data from Postgres.
- [x] Initial schema was pushed to Supabase successfully.

### Phase 3 — Manual analytics with mock data

Build manual analytics before AI. CONCEPTS > CODE.

- [ ] Build `getSalesSummary`.
- [ ] Build `getTopProducts`.
- [ ] Build `comparePeriods`.
- [ ] Build dashboard cards.
- [ ] Build sales line chart.
- [ ] Build top products table.

Done when:

- [ ] Dashboard works with mock data.
- [ ] Metric functions have tests or checked SQL examples.

### Phase 4 — Tiendanube OAuth

- [x] Register Tiendanube app.
- [x] Configure redirect URI.
- [x] Build OAuth start route.
- [x] Build OAuth callback route.
- [x] Store encrypted access token.
- [x] Save store connection.
- [x] Persist store metadata after OAuth.

Done when:

- [x] A test store can connect.
- [x] Store ID and token are saved.
- [x] Store metadata (`name`, `country`, `currency`) is saved for the real test store.

### Phase 5 — Tiendanube initial sync

- [x] Build API client.
- [x] Fetch products.
- [ ] Fetch orders from last 90 days.
- [ ] Fetch customers if scope enabled.
- [x] Upsert normalized product + variant rows.
- [x] Save sync job status.
- [x] Add sync button/status UI.
- [x] Auto-start the first sync after successful connect.

Done when:

- [x] Dashboard shows real catalog sync state and counts.

### Phase 6 — AI chat with tools

- [ ] Build `/api/chat`.
- [ ] Add Vercel AI SDK/Groq integration with `@ai-sdk/groq`.
- [ ] Define Zod schemas for tool arguments.
- [ ] Expose metric functions as AI tools.
- [ ] Store chat messages.
- [ ] Store AI tool calls.
- [ ] Render structured tables in chat.
- [ ] Render structured charts in chat if returned.

Done when:

- [ ] User can ask “compare this week vs last week” and receive answer + table/chart from real SQL metrics.

### Phase 7 — Weekly snapshot

- [ ] Build weekly snapshot metric function.
- [ ] Build AI summary from metric output.
- [ ] Show weekly snapshot on dashboard.
- [ ] Add “copy summary” button for WhatsApp.

Done when:

- [ ] Store owner gets a useful weekly report inside the app.

### Phase 8 — Private beta

- [ ] Connect 2–3 real stores.
- [ ] Track questions users ask.
- [ ] Track unsupported questions.
- [ ] Fix only repeated problems.
- [ ] Ask if they would pay for weekly AI reports/chat.

Done when:

- [ ] 2 stores want to keep using it.

---

## 13. Production steps later

Do not build these in MVP unless necessary.

- [ ] Background queue: Inngest, Trigger.dev, or BullMQ.
- [ ] Tiendanube webhooks for incremental sync.
- [ ] Token encryption with proper key rotation.
- [ ] Sentry error monitoring.
- [ ] PostHog product analytics.
- [ ] Billing with Stripe or Mercado Pago.
- [ ] Email reports with Resend.
- [ ] WhatsApp reports.
- [ ] Multi-source data: Meta Ads, GA4, Mercado Libre.
- [ ] Role-based access/team members.
- [ ] Data deletion/uninstall automation.

---

## 14. Technical decisions already made

- [x] MVP is read-only.
- [x] Chat is the main product difference.
- [x] Dashboard is support/trust layer.
- [x] Metrics come from SQL/backend functions.
- [x] AI explains and recommends; it does not invent/calculate raw metrics.
- [x] Start with Tiendanube only.
- [x] Start Spanish-first for small Argentine businesses.

---

## 15. Source notes

- Tiendanube/Nuvemshop API supports OAuth authorization code flow, scopes, access tokens, and `user_id` store ID.
- Tiendanube API default rate limit is documented as 2 requests/sec per store/app with rate-limit headers.
- Tiendanube webhooks include app, order, product, customer, and other events.
- Next.js App Router supports route handlers, server components, Suspense, and file-system routing.
- Supabase supports Next.js integration and uses publishable/secret keys; legacy anon/service keys continue but new key types are recommended.
- Supabase supports migrations for schema changes.
- Drizzle works with Supabase Postgres via `drizzle-orm`, `postgres`, and `drizzle-kit`.
- shadcn/ui charts are built with Recharts.
- Vercel AI SDK supports Groq through `@ai-sdk/groq` and streaming text generation.
- Groq exposes an OpenAI-compatible Chat Completions API, supports tools/function calling, uses `GROQ_API_KEY`, and documents structured-output limitations with tool use/streaming.

Sources:

- https://tiendanube.github.io/api-documentation/authentication
- https://tiendanube.github.io/api-documentation/v1/intro
- https://tiendanube.github.io/api-documentation/v1/resources/order
- https://tiendanube.github.io/api-documentation/resources/webhook
- https://nextjs.org/docs/app
- https://nextjs.org/docs/pages/api-reference/create-next-app
- https://nextjs.org/docs/pages/guides/environment-variables
- https://supabase.com/docs/guides/auth/quickstarts/nextjs
- https://supabase.com/docs/guides/deployment/database-migrations
- https://supabase.com/docs/guides/database/drizzle
- https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase
- https://v3.shadcn.com/docs/components/chart
- https://vercel.com/docs/ai/groq
- https://vercel.com/ai-sdk
- https://console.groq.com/docs/quickstart
- https://console.groq.com/docs/api-reference
- https://console.groq.com/docs/structured-outputs
