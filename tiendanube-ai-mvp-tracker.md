# Tiendanube AI Business Analyst — Concrete MVP Tracker

Date: 2026-06-04

## Current status snapshot (updated 2026-06-09)

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
- [x] AI chat route and Groq-orchestrated analyst tool flows are implemented and validated against real synced-store SQL metrics.
- [x] Store metadata hydration after OAuth is implemented and verified with a real store.
- [x] Business logic beyond the OAuth connection flow now includes sync, SQL metrics, dashboard trust layer, and deterministic analyst responses.

Known follow-up after AI chat validation:

- [ ] Hide/remove AI chat evidence cards and structured tool-result debug panels in production. Keep them available only for local/staging validation behind a feature flag or equivalent gating.
- [x] Add deterministic analyst intents for low-stock opportunities and weekly business snapshot.
- [ ] Add deterministic product-to-product comparison after MVP validation.
- [x] Surface weekly snapshot insight outside chat so the value is visible on dashboard/share surfaces too.

New product/UI follow-up after UX research:

- [ ] Rebuild the AI analyst UX as **mobile-first conversational analytics**, not as desktop-first split panes.
- [ ] Keep chat as the primary interaction surface on all devices.
- [ ] On mobile, open each rich answer into a dedicated detail view / sheet instead of forcing full tables and trust details inline in the feed.
- [ ] On desktop, keep a companion analysis canvas so the currently selected answer can be inspected without scroll fatigue.
- [ ] Make the dashboard explicitly a trust/validation surface plus pinned reports, not the main workflow.
- [ ] Redesign AI responses as compact report cards with summary, KPI strip, mini chart/table preview, and quick actions.
- [ ] Move raw evidence/SQL/debug details behind a progressive trust layer.

Important corrections:

- [x] `TIENDANUBE_REDIRECT_URI` points to the OAuth callback route.
- [x] `DATABASE_URL` uses the real database password.
- [x] `GROQ_MODEL` is filled explicitly.

## 1.6 Production + multi-tenant readiness

This is the real launch gate.

### What is already good

- [x] Tiendanube OAuth start/callback flow works.
- [x] Access tokens are encrypted at rest.
- [x] Core analytics tables are already scoped by `store_id`.
- [x] Initial sync exists for a connected store.

### What still needs to change before real production

| Area | Must change |
|------|-------------|
| Hosting | Deploy on Vercel with production domain, HTTPS, and stable runtime env vars. |
| OAuth | Register the production callback URL in the Tiendanube app and verify redirect URI handling. |
| Tenant ownership | Add a real user/account layer so one merchant cannot see another merchant’s store data. |
| Store access | Replace the current "single active connection" assumption with explicit store selection or user-to-store membership. |
| Connect flow | Keep the connect screen explicit even when a store is already linked; do not auto-skip authorization just because a previous connection exists. |
| Auth | Add app authentication for merchants/admins; do not rely on raw Tiendanube OAuth alone for SaaS access. |
| Route protection | Lock down `/api/chat`, `/api/sync/run`, saved-report actions, and any store-scoped read/write routes. |
| Sync reliability | Move initial sync and incremental sync work into a retryable job model with status, error, and cursor tracking. |
| Webhooks | Replace the 501 webhook scaffold with real Tiendanube webhook handling for product/order/customer changes. |
| Observability | Add error tracking, request logging, and sync job visibility for production support. |
| UX hardening | Remove or gate debug/evidence panels and any developer-only controls from the default production UI. |
| Data safety | Keep store-scoped isolation enforced in the database and backend, not only in the UI. |

### Database changes needed for multi-tenant SaaS

| Area | Suggested DB change |
|------|---------------------|
| Users | Add `users` or `accounts` to represent the human app user. |
| Memberships | Add `store_memberships` or `user_stores` to map users to one or more stores. |
| Roles | Add membership roles if multiple people can access the same store. |
| Auth linkage | Store the auth provider subject / merchant identity in a durable table. |
| Webhook inbox | Add a table for webhook events so retries and deduplication are safe. |
| Sync state | Add cursor / watermark tables for incremental sync and resumable jobs. |
| Audit log | Add optional audit rows for login, sync, webhook, and export actions. |

### Production checklist

- [ ] Deploy the app to Vercel or equivalent production hosting.
- [ ] Set production environment variables in the host and Tiendanube app.
- [ ] Add merchant authentication and session management.
- [ ] Add user-to-store membership and authorization checks.
- [ ] Make all store-scoped routes require explicit tenant context.
- [ ] Replace manual-only sync with job-based initial + incremental sync.
- [ ] Implement Tiendanube webhook ingestion.
- [ ] Add retry, dead-letter, and observability for sync/webhook failures.
- [ ] Remove debug evidence panels from the default production experience.
- [ ] Add database migrations for the new multi-tenant tables.
 - [x] Create Supabase `profiles`, `store_memberships`, `webhook_events`, and `sync_state` tables.
 - [x] Verify auth user ? profile trigger works.
 - [x] Verify store membership row can be inserted and read.

### What to do first in Supabase

Start with the ownership layer. Do **not** remodel the existing `stores` / analytics tables yet.

1. Keep the current store-scoped tables:
   - `stores`
   - `store_connections`
   - `products`
   - `orders`
   - `customers`
   - `sync_jobs`
   - `chat_messages`
   - `ai_tool_calls`
   - `analyst_preferences`
   - `saved_reports`

2. Add a Supabase-auth-linked profile table:
   - `profiles.id` should match `auth.users.id`
   - store basic merchant metadata there

3. Add a user-to-store membership table:
   - one user can belong to one or many stores
   - one store can have one or many users
   - store a role like `owner`, `admin`, or `analyst`

4. Add operational tables for production jobs:
   - webhook event inbox
   - sync state / cursor table
   - optional audit log

5. Enable RLS on the new tables:
   - users can read their own profile
   - users can read memberships for stores they belong to
   - backend/service role can continue to manage sync and OAuth persistence

### Suggested Supabase SQL

Use this as the starting point in the Supabase SQL editor:

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, store_id)
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  topic text not null,
  external_event_id text,
  payload jsonb not null,
  processed_at timestamptz,
  failed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.sync_state (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  resource text not null,
  cursor text,
  last_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (store_id, resource)
);
```

### Policies to add next

- `profiles`: users can select/update only their own row.
- `store_memberships`: users can select rows for stores they belong to.
- `webhook_events` and `sync_state`: keep backend/service-role only for now.
- Existing Tiendanube analytics tables can stay service-role only until the merchant auth flow is wired up.

## Immediate next implementation step

**Next up:** production hardening + multi-tenant foundation.

Why this is next:

- The app already works for a connected store, but SaaS launch needs tenant isolation and route protection.
- The current single-store assumptions are the biggest product risk, not the AI itself.
- If we ship before fixing ownership and production ops, we will create a security and support problem, not just a UX problem.
- The UI rebuild still matters, but production readiness comes first.

What to add:

- [ ] Add merchant auth and durable user/store ownership.
- [ ] Split single-active-store logic into explicit tenant selection.
- [ ] Protect chat, sync, and saved-report routes by tenant.
- [ ] Replace the webhook scaffold with real Tiendanube webhook processing.
- [ ] Add retryable sync jobs and incremental sync state.
- [ ] Remove debug evidence from the default production UI.
- [ ] After that, continue into the mobile-first UX rebuild.

### Refactor progress in this branch

What is now wired:

- Tenant context can flow through `storeId` in dashboard, chat, saved reports, settings, onboarding, and AppShell links.
- Chat/tool execution now accepts an explicit store context when the URL or request body provides one.
- Saved report and analyst-preference actions now preserve the selected tenant when possible.
- Supabase Auth scaffolding is in place: middleware, magic-link login, auth callback, and server-side membership resolution.
- Tiendanube OAuth callback now upserts a `store_memberships` row for the logged-in Supabase user, so store ownership is durable instead of global-only.
- The connect screen no longer auto-prints the globally active store when no explicit `storeId` is chosen.
- The app is currently being constrained to one Tiendanube store per user; extra stores are blocked for now.
- The onboarding flow is now connect-first: Tiendanube authorization happens before merchant registration, and onboarding uses a magic-link account gate with resend cooldown.
- Supabase is currently rate-limiting magic-link sends with `over_email_send_rate_limit` (429) on `POST /auth/v1/otp`; delivery needs to be retried after the cooldown or fixed with SMTP/auth settings.
- Multi-membership users now have a protected `/stores` chooser instead of a dead-end redirect.

What still needs to happen:

- Finish the merchant-facing account/settings experience around the new login flow.
- Verify the onboarding magic-link flow again after the Supabase email cooldown resets.
- If the 429 persists after waiting, configure or inspect Supabase Auth SMTP/email delivery.
- Apply the same membership guard to any remaining background or admin-only surfaces.
- Decide later whether to re-enable multi-store selection or keep the one-store rule permanently.

## Product goal

Build an MVP where a Tiendanube merchant connects their store and asks questions about sales, products, customers, stock, and weekly performance.

Positioning:

> Ask your Tiendanube what happened, what changed, and what to do next.

Important: this is **not** just a dashboard. The main difference is the **AI chat analyst**. The dashboard exists only so the user can manually verify the data.

UX clarification after June 2026 research:

- Mobile-first base pattern: **chat feed + expandable report cards + detail view/sheet**
- Desktop adaptation: **chat + analysis canvas + trust layer**
- Product model: **Chat = ask**, **Canvas/detail view = inspect**, **Trust layer = verify**, **Dashboard = save/monitor**

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
- [x] `GROQ_MODEL`

Recommended starting model:

- [x] `llama-3.3-70b-versatile` for better reasoning/tool-use quality.
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
- [x] Vercel AI SDK
- [x] Groq Chat Completions API / tool calling
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
  ?
Next.js App Router
  +- Landing page
  +- Connect Tiendanube page
  +- Dashboard page
  +- AI chat page
  +- API route handlers
       +- /api/tiendanube/oauth/start
       +- /api/tiendanube/oauth/callback
       +- /api/sync/run
       +- /api/chat
       +- /api/webhooks/tiendanube later
  ?
Application services
  +- Tiendanube API client
  +- Sync service
  +- Metrics service
  +- AI analyst service
  +- Chart/table response builder
  ?
Supabase Postgres
  +- stores
  +- store_connections
  +- products
  +- product_variants
  +- orders
  +- order_items
  +- customers
  +- sync_jobs
  +- chat_messages
  +- ai_tool_calls
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
  - [x] Fetch orders for last 90 days.
  - [x] Fetch customers only if `read_customers` is enabled.
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

- [x] “What were my best-selling products this month?”
- [x] “Compare this week vs last week.”
- [x] “Which products should I restock?”
- [ ] “What changed this week?”
- [ ] “Give me 3 actions for this week.”

If unsupported:

- [ ] Say it cannot answer that yet.
- [ ] Suggest one supported question.

### 11.2 AI tool-calling architecture

```text
User asks question
  ?
/api/chat
  ?
AI model decides tool call
  ?
Validated Zod schema for tool args
  ?
Backend metric function runs SQL
  ?
Tool result returned to AI
  ?
AI creates short explanation
  ?
UI renders answer + structured table/chart
```

### 11.3 Allowed AI tools for MVP

- [x] `get_sales_summary`
- [x] `get_top_products`
- [x] `compare_periods`
- [ ] `compare_product_sales`
- [x] `get_low_stock_opportunities`
- [x] `get_weekly_business_snapshot`

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
- [x] Never invent numbers.
- [x] Use tools for metrics.
- [x] If the data is missing, say what sync/data is missing.
- [x] Keep answers short.
- [x] Always include evidence when giving a recommendation.
- [x] Prefer tables for comparisons.
- [x] Prefer charts for trends over time.

### 11.6 Groq implementation notes

- [x] Install `@ai-sdk/groq` instead of `@ai-sdk/openai`.
- [x] Use `GROQ_API_KEY` in `.env.local`.
- [x] In `/api/chat`, import `groq` from `@ai-sdk/groq`.
- [ ] Use `streamText` from `ai` for streaming chat responses.
- [x] Start with `groq(process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile')`.
- [x] Keep tool results structured and backend-generated.
- [x] Validate final table/chart payloads with Zod before rendering.
- [x] If Groq returns malformed JSON/tool output, fail safely and ask the user to retry or simplify the question.

Implementation notes validated in this branch:

- [x] Final response shaping is deterministic app code built from backend tool results, not model-authored JSON contracts.
- [x] Groq orchestration is constrained to one tool step plus one answer-only step to avoid hallucinated follow-up tool names.

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

### 11.7 UX architecture rules (mobile + desktop)

Core rule:

- [ ] Treat the AI experience as **conversational analytics**, not as a plain chatbot and not as a dashboard-first BI clone.

Mobile-first interaction model:

- [ ] Main screen is the chat feed.
- [ ] Each assistant answer is a compact report card, not a giant fully expanded analytics block.
- [ ] Report cards should include:
  - [ ] short summary
  - [ ] KPI strip
  - [ ] mini chart or table preview
  - [ ] quick follow-up actions
  - [ ] CTA to open full analysis
- [ ] Tapping a card opens a dedicated detail screen or bottom sheet with:
  - [ ] full chart
  - [ ] full table
  - [ ] trust layer
  - [ ] share/export/pin actions
- [ ] Do not render full-width dense tables inline in the mobile feed by default.

Desktop adaptation:

- [ ] Keep chat on the left as the primary workflow.
- [ ] Show the selected answer in an analysis canvas on the right.
- [ ] Keep conversation history visible while the current report stays stable on screen.
- [ ] Allow desktop users to inspect trust details without losing chat context.

Trust layer rules:

- [ ] Default to friendly business explanations first.
- [ ] Put raw rows, source metadata, query logic, and debug evidence behind collapsible sections/tabs.
- [ ] Always show source, date range, filters, and last sync status near the answer.
- [ ] If a question is out of scope, fail clearly and suggest one supported next question.

Quick actions:

- [ ] Pin report to dashboard.
- [ ] Export CSV / image.
- [ ] Copy formatted summary for WhatsApp/Slack.
- [x] Ask suggested follow-up questions.
- [ ] Save reusable report/prompt later if beta users ask for it.

### 11.8 AI canvas response improvement plan

Goal:

> The AI explains, the backend proves, and the canvas visualizes.

Current issue:

- [x] The canvas repeats the same narrative in the top `Resumen IA` block and again in the `Resumen` tab.
- [x] The chart area now uses first-pass tool-specific variants instead of one generic shape.
- [x] Suggested actions were previously mixed with follow-up prompts and shown in the wrong surface.

Target behavior:

- [x] Keep one primary `Resumen IA` block as the main narrative.
- [x] Make the primary summary more useful:
  - [ ] what happened,
  - [ ] why it matters,
  - [ ] executive takeaway,
  - [x] next recommended action.
- [ ] Change the `Resumen` tab so it does not repeat the same paragraph:
  - [ ] show action bullets,
  - [ ] show risks/opportunities when supported by tool output,
  - [ ] show calculation notes only when useful.
- [ ] Render different visualizations based on the validated tool output:
  - [ ] sales summary ? KPI cards + metric bar chart + period-aware table,
  - [ ] period comparison ? current vs previous comparison chart + percentage deltas,
  - [ ] top products ? ranking bar chart + product table,
  - [ ] low stock ? risk/ranking chart + stock-demand table,
  - [ ] weekly snapshot ? mixed summary card with trend, top product, and next actions.
- [x] Keep owner suggested actions inside `Resumen IA` instead of the chart/table card.
- [x] Add separate true follow-up question prompts later, distinct from owner actions.

Implementation approach:

- [ ] Evolve `CanvasModel` from a single `chart` into validated visualization blocks.
- [ ] Keep all numbers, periods, and table/chart data derived from backend tool output.
- [ ] Let the AI provide explanation and recommendations only after tools produce evidence.
- [ ] Do not let free-form AI text become the source of truth for dates, metrics, or chart data.

Suggested Spanish regression prompts:

- [ ] `Dame un resumen de ventas de los últimos 30 días`
- [ ] `Compará los últimos 30 días contra los 30 días anteriores`
- [ ] `¿Cuáles fueron mis productos más vendidos en los últimos 14 días?`
- [ ] `¿Qué productos están en riesgo de quedarse sin stock?`

Suggested shadcn/ui building blocks to prioritize:

- [ ] `Card`
- [ ] `Tabs`
- [ ] `Table`
- [ ] `Badge`
- [ ] `Skeleton`
- [ ] `Dialog`
- [ ] `Sheet`
- [ ] `DropdownMenu`
- [ ] `Collapsible`
- [ ] `Tooltip`
- [ ] shadcn `Chart` components with Recharts

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
  - [x] Fetch orders from last 90 days.
  - [x] Fetch customers if scope enabled.
- [x] Upsert normalized product + variant rows.
- [x] Save sync job status.
- [x] Add sync button/status UI.
- [x] Auto-start the first sync after successful connect.

Done when:

  - [x] Dashboard shows real catalog sync state and counts.
  - [x] Initial sync imports real orders, order items, and linked customers for the test store.

### Phase 6 — AI chat with tools

- [x] Build `/api/chat`.
- [x] Add Vercel AI SDK/Groq integration with `@ai-sdk/groq`.
- [x] Define Zod schemas for tool arguments.
- [x] Expose metric functions as AI tools.
- [x] Store chat messages.
- [x] Store AI tool calls.
- [x] Render structured tables in chat for local evidence/debug validation.
- [x] Render structured charts in chat if returned.

Done when:

- [x] User can ask “compare this week vs last week” and receive answer + table/chart from real SQL metrics.
- [x] Supported prompts were manually validated end-to-end with Groq orchestration and real synced-store SQL metrics:
  - [x] compare this week vs last week
  - [x] compare the last 7 days vs the previous 7 days
  - [x] sales summary for the last 30 days
  - [x] top products for the last 30 days
  - [x] weekly snapshot
  - [x] what products are at risk of going out of stock?
  - [x] how can you help me?

### Phase 7 — Weekly snapshot

- [x] Build weekly snapshot metric function.
- [x] Build deterministic analyst summary from metric output.
- [x] Show weekly snapshot on dashboard.
- [x] Add “copy summary” button for WhatsApp.
- [x] Decide whether dashboard snapshot copy should reuse Groq chat wording or a separate deterministic dashboard/share template.

Done when:

- [x] Store owner gets a useful weekly report inside the app.

### 11.6 i18n + Spanish copy hardening

Goal: stop fixing UI text manually in scattered components and move all user-facing copy to a single translation system, with Spanish as the default language.

#### Why this is needed

- The app already has Spanish-first UX goals, but many phrases are still hardcoded directly in components.
- Manual phrase changes are slow, error-prone, and make regressions likely.
- AI output can remain a separate concern, but the surrounding UI must be deterministic and translatable.
- This also helps catch mojibake / encoding problems separately from translation logic.

#### Build steps

1. **Choose the i18n library and app structure**
   - Use a Next.js App Router compatible library.
   - Prefer one source of truth for locale messages.
   - Make Spanish the default locale for the whole product.

2. **Define the locale contract**
   - Add a small, explicit locale set for now.
   - Start with `es` only if the product is Spanish-first.
   - Keep room for `en` later if we need it.

3. **Create translation message files**
   - Split messages by domain instead of one giant file.
   - Suggested groups:
     - `common`
     - `navigation`
     - `dashboard`
     - `onboarding`
     - `settings`
     - `errors`
     - `chat`
   - Keep key names stable and descriptive.

4. **Wire the locale provider at the app root**
   - Load the active locale once in the layout / provider layer.
   - Expose translation hooks to client components.
   - Keep server components able to render translated copy too.

5. **Replace hardcoded UI strings component by component**
   - Onboarding screens
   - Settings pages
   - Dashboard cards
   - Sidebar navigation
   - Empty states
   - Buttons and labels
   - Validation and error copy

6. **Handle AI output separately from UI translation**
   - Force the AI system prompt to answer in Spanish.
   - Add a post-processing guard for obvious English fallback text when needed.
   - Never use free-form AI output as the source of truth for labels, dates, or metrics.

7. **Fix encoding issues separately**
   - Audit any mojibake like `dÃ­a` / `conexiÃ³n`.
   - Verify files are saved as UTF-8.
   - Check database content, environment values, and rendering paths for corrupted text.
   - Do not confuse encoding bugs with translation bugs.

8. **Add regression coverage**
   - Verify Spanish copy renders correctly in the main views.
   - Check onboarding, dashboard, settings, and chat for missing keys.
   - Add a test or smoke check for obvious untranslated strings.

9. **Lock the default language**
   - Make Spanish the default for the product.
   - Avoid exposing English copy unless we intentionally add a language switch.
   - Ensure fallback behavior does not silently leak English into Spanish views.

#### Acceptance criteria

- No user-facing text remains hardcoded in the main product surfaces.
- Spanish is the default language everywhere.
- AI responses still work, but the surrounding UI copy is translated and stable.
- Encoding regressions are fixed or isolated.
- New screens must add translations before merge.
### Phase 8 — Product hardening before beta

- [x] Fix all Spanish encoding / mojibake regressions in the UI.
- [x] Show metric definitions and calculation context for each report.
- [x] Turn Pin / Export / Copy into real actions with persistence.
- [x] Remove or feature-flag raw debug evidence from the default production UI.
- [x] Make AI answers more action-oriented with clear next steps.
- [x] Surface weekly snapshot and low-stock insights outside chat.
- [x] Improve empty states, loading states, and unsupported-question feedback.

Done when:

- [x] Users can trust what each metric means without guessing.
- [x] Reports can be saved, shared, and revisited.
- [x] The primary UI is clean and production-ready.

### Phase 9 — UI/UX rebuild (mobile-first)

- [ ] Redesign chat answers into compact report cards.
- [x] Remove duplicated summary text between `Resumen IA` and the `Resumen` tab.
- [x] Make `Resumen IA` the single primary narrative block with a clearer takeaway and next action.
- [x] Move owner suggested actions into `Resumen IA` and remove them from the chart/table card.
- [x] Add prompt/tool-specific chart variants instead of one generic chart shape for every answer.
- [ ] Evolve the canvas data model to support multiple validated visualization blocks.
- [ ] Build mobile-first chat feed spacing, hierarchy, and input UX.
- [ ] Build mobile analysis detail view / bottom sheet.
- [ ] Build desktop chat + analysis canvas adaptation.
- [ ] Add trust layer tabs/collapsibles for source, rows, and query logic.
- [ ] Add quick actions: pin, export, copy summary, follow-up prompts.
- [ ] Hide or feature-flag local debug/evidence panels from the default production UI.
- [ ] Validate the rebuilt UX on both phone-sized and laptop-sized layouts.

Done when:

- [ ] A merchant can ask a question on mobile, understand the answer quickly, and drill into trust details without getting lost in the feed.
- [ ] A merchant can continue the same workflow on desktop with a stable analysis canvas.
- [ ] The dashboard clearly acts as a trust layer / pinned insights surface, not as the primary workflow.

### Phase 10 — Private beta

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
- [x] Mobile-first UX should be chat-first, with expandable report cards and a separate analysis detail view.
- [x] Desktop UX should adapt by adding an analysis canvas, not by replacing chat with a dashboard.
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
- Defog presents analytics results through table/chart/SQL views instead of raw chat-only prose.
- Veezoo emphasizes follow-up questions, smart suggestions, dashboard generation, and share/export flows around conversational analytics.
- Polar positions AI outputs as editable custom reports grounded in a semantic layer and explicitly prefers error-over-guessing when requests fall outside the governed model.
- Whaly separates single-question reports from dashboards and exposes visualization/data/SQL tabs for trust and inspection.
- AMP/Lifetimely positions AI insights and recommendations as actionable cards with review/approve/chat flows, reinforcing the report-card pattern over long freeform chat blocks.

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
- https://docs.defog.ai/query-data
- https://www.veezoo.com/product/agentic-analytics
- https://www.veezoo.com/product/dashboards
- https://www.veezoo.com/product/collaboration
- https://docs.veezoo.com/api/beta/questions/ask-question/
- https://veezoo.com/search-and-visualize/
- https://www.polaranalytics.com/ask-polar
- https://intercom.help/polar-app/en/articles/13017453-ask-polar-2-0
- https://www.polaranalytics.com/post/introducing-ask-polar-the-future-of-data-analysis-for-ecommerce
- https://www.polaranalytics.com/post/ai-analytics-agents-semantic-layer-shopify
- https://www.polaranalytics.com/slack-ai-agent-for-ecommerce
- https://www.polaranalytics.com/post/query-polar-analytics-from-slack-with-claude
- https://docs.whaly.io/data-consumption/questions
- https://docs.whaly.io/workspace/sharing-and-collaboration
- https://useamp.com/products/analytics
- https://help.useamp.com/article/1244-cortex-ai-setup-and-user-guide
- https://help.useamp.com/article/1364-lifetimely-connect-lifetimely-to-chatgpt
- https://beprofit.co/

