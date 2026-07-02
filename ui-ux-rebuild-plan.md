# UI/UX Rebuild Plan - NubeCopilot

This document defines the UI/UX rebuild for the Tiendanube AI Business Analyst based on the current desktop-first product direction.

## Product direction

- Spanish product UI by default.
- Desktop-first for this branch, then mobile adaptation.
- Public marketing explains value and trust before authorization.
- Activation flow connects Tiendanube, shows sync progress, then captures owner intent.
- Logged-in app uses a left sidebar shell.
- Chat remains the primary product surface.
- Analysis canvas stays connected to chat, not separated as a dead dashboard view.
- Dashboard supports monitoring and validation; it is secondary to the analyst workflow.

## Reference views from current direction

### Home

Use the reference as a premium editorial landing page, but translate and adapt copy to Spanish.

Required sections:

1. Header
   - Brand: NubeCopilot / Nimbo-style mark is acceptable as inspiration, not final naming unless decided.
   - Navigation: Como funciona, Tus datos, Iniciar sesion.
   - Primary CTA: Conectar tienda.
2. Hero
   - Large serif headline.
   - Teal emphasis for the emotional phrase.
   - Clear explanation: reads sales, inventory, products, orders, and customer signals.
   - Trust line: read-only access, disconnect anytime.
3. Product preview
   - Desktop browser-like chat preview.
   - One business question and one report card with metrics.
4. How it works
   - Connect Tiendanube.
   - Tell us your goals.
   - Ask anything.
5. What we read
   - Store profile.
   - Products and variants.
   - Orders from the last 90 days.
   - Order items.
   - Customer signals from orders.
   - Read-only and secure.
6. Final CTA
   - Strong dark CTA block.

### Auth / connection

The current `/connect` route should become a focused activation page, not a generic dev/OAuth validation page.

Required states:

1. Connect store
   - Step 1 of 2.
   - Explain read-only access.
   - Explicitly list what we read.
   - CTA starts Tiendanube OAuth.
2. Syncing store
   - Step progress.
   - Rows: store profile, products, variants/inventory, orders last 90 days, order items, customer signals.
   - Use real sync status when available; static/progressive fallback is acceptable for first UI pass.
3. Store connected
   - Success confirmation.
   - Move user into onboarding/profile setup.

### Owner onboarding

Create a dedicated onboarding flow after connection/sync.

Important rule: do not ask for data Tiendanube already provides or that we can infer from synced orders.

Steps:

1. About you
   - Name.
   - Role.
2. Your store
   - Category.
   - Business stage.
   - Do not ask average monthly orders unless there is a strong product reason; prefer inferred order volume.
3. Main goal
   - Increase revenue.
   - Avoid stockouts.
   - Understand top products.
   - Improve repeat purchases.
   - Reduce slow-moving inventory.
4. Main friction
   - Knowing what to reorder.
   - Understanding why sales changed.
   - Finding products that are not moving.
   - Preparing reports.
   - Deciding what to promote.
5. Cadence and tone
   - Cadence: daily, weekly, monthly.
   - Tone: direct, detailed, action-focused.
6. Review
   - Explain how the analyst will work.
   - CTA to enter the app.

### App shell / sidebar

A sidebar is possible and recommended, but it changes the current routing structure.

Current app state:

- `/` renders the chat directly.
- `/chat` redirects to `/`.
- `/dashboard` uses `AppShell` with a top nav.
- `/connect` also uses `AppShell` with a top nav.

Target app state:

- Public home should live at `/` when the merchant is not activated.
- Analyst chat should live at `/chat` or `/app/chat`.
- Dashboard should live at `/dashboard` or `/app/dashboard`.
- Saved analyses should get its own route.
- Settings / Tune your analyst should get its own route.
- Logged-in/product routes should share a sidebar shell.

Recommended route direction for this branch:

- `/` - public home / landing.
- `/connect` - connect and sync activation.
- `/onboarding` - owner profile setup.
- `/chat` - main analyst workspace with sidebar + chat + canvas.
- `/dashboard` - monitoring dashboard inside the same sidebar shell.
- `/saved` - saved analyses.
- `/settings` - tune analyst.

### Dashboard

Use the mock as direction, but avoid turning the product into a BI dashboard.

Keep:

- Sidebar shell.
- Personalized greeting.
- 7-day default summary.
- KPI cards.
- Revenue trend.
- Analyst insight card.
- Top products.
- Stock risks.
- Suggested next steps.
- CTA back to analyst chat.

Modify for our product:

- Dashboard copy must be Spanish.
- Metrics must use current real queries, not mock values.
- Dashboard modules should later reorder based on onboarding profile.
- Every insight should link back to chat with a contextual prompt.

### Chat + canvas

The sidebar is good, but chat cannot become a blank ChatGPT clone. The canvas is necessary.

Desktop target:

```text
Sidebar | Chat thread | Analysis canvas
```

Rules:

- Chat is the primary action surface.
- Canvas is the inspection/report surface.
- Selecting any report card opens that report in the canvas.
- Saved analyses reopen in the canvas.
- Trust layer belongs inside the canvas.
- Empty chat state should use personalized suggested prompts after onboarding.

Recommended desktop ratio:

- Sidebar: fixed 240px.
- Chat: 36-42%.
- Canvas: remaining width.

Mobile target later:

- Sidebar collapses.
- Chat remains primary.
- Canvas opens as a full-screen detail/sheet.

## Build order for this branch

### Phase 1 - Design tokens and Spanish UI foundation

Status: complete.

- Define color tokens.
- Define font pairing.
- Define spacing, radius, borders, shadows.
- Connect tokens to Tailwind theme.
- Normalize shared UI copy to Spanish.
- Keep code identifiers and internal artifacts in English.

### Phase 2 - Public home and trust story

Status: complete.


- Replace current root chat view with public landing behavior where appropriate.
- Add Spanish hero, trust line, product preview, how-it-works, what-we-read, final CTA.
- Ensure CTA routes to `/connect`.

### Phase 3 - Connect and sync activation

Status: complete.


- Redesign `/connect` into the connection page.
- Add sync-progress state/page using current sync API behavior.
- Add connected success state.
- Keep copy accurate: read-only, last 90 days of orders, hashed customer contact info.

### Phase 4 - Owner onboarding

Status: complete.


- Add `/onboarding` route.
- Build desktop onboarding steps.
- Persist owner profile.
- Skip average monthly orders unless explicitly needed.

### Phase 5 - Sidebar app shell

Status: complete.


- Replace top-nav `AppShell` with product sidebar shell for logged-in routes.
- Move chat to `/chat` as the real product route.
- Add dashboard, saved analyses, and settings routes to the sidebar.

### Phase 6 - Chat + analysis canvas workspace

Status: complete.


- Convert chat into sidebar + chat + canvas layout.
- Keep report cards in chat.
- Keep selected analysis in the canvas.
- Reopen saved analyses in canvas.
- Move trust details into the canvas.

### Phase 7 - Personalized dashboard

Status: complete for this branch via database-backed analyst preferences tied to the active Tiendanube store.


- Apply owner profile to dashboard ordering and suggested next steps.
- Default window based on cadence.
- Prioritize modules based on goal and friction.
- Link dashboard insights back into chat.

### Phase 8 - Actions and polish

Status: complete for this branch. Analyst preferences and saved reports persist in Postgres by active Tiendanube store.


- Pin, export, copy actions.
- Better loading and unsupported-question states.
- Saved analyses fallback behavior.
- Mobile adaptation pass.

### Phase 9 - App shell stability and store-scoped caching

Status: planned.

Problem:

- Dashboard navigation currently re-renders the full dashboard server page.
- The sidebar store name and sync card are coupled to dashboard data loading.
- `/dashboard` is explicitly dynamic, so entering the dashboard can show a full-page loading skeleton even when no Tiendanube sync is running.
- "Not syncing" does not mean "not fetching"; the dashboard still reads store-scoped data from Postgres.

Target behavior:

- Logged-in app routes should keep the same stable sidebar while page content changes.
- Store name, connection status, and sync metadata should not be blocked by dashboard analytics queries.
- Dashboard analytics should be cached safely per store and invalidated after manual sync.
- Redis can be introduced after the app shell split if database aggregation remains slow or we need cross-instance cache persistence.

Implementation order:

1. Move authenticated app routes into a shared app layout.
   - Candidate route group: `/app/(app)/...` or equivalent Next.js route group without changing public URLs.
   - Shared layout owns auth/store validation and renders the sidebar once.
   - Dashboard, chat, saved, and settings render only their page content inside that shell.

2. Split sidebar data from dashboard analytics data.
   - Sidebar data: store name, connection status, latest sync status, latest sync timestamp, product/order/variant counts.
   - Dashboard data: KPI metrics, revenue trend, comparisons, top products, low-stock opportunities, analyst insight.

3. Add store-scoped cache for dashboard analytics.
   - Cache key must include `storeId`, selected range, and dev-only `asOf` date when used.
   - Never cache dashboard data globally by route.
   - Suggested keys:
     - `store:{storeId}:sidebar`
     - `store:{storeId}:dashboard:{compareWindow}`
     - `store:{storeId}:dashboard:{compareWindow}:{asOf}`

4. Invalidate cache after sync.
   - When `/api/sync/run` completes, invalidate only that store's sidebar and dashboard keys.
   - This keeps repeated dashboard visits fast while guaranteeing fresh data after sync.

5. Consider Redis / Vercel KV / Upstash as a second step.
   - Use Redis for persistent cross-request/cross-instance cache if Next's built-in cache is not enough.
   - Keep TTL conservative at first, around 5-15 minutes.
   - Keep explicit invalidation on sync completion.

Constraints:

- Cache must be store-scoped to avoid multitenant data leaks.
- Do not use Redis as a band-aid before separating the shared app shell.
- Sidebar loading must remain independent from slow dashboard analytics.
- Manual sync should remain the source of truth for cache invalidation.

## Implementation notes

- Do not copy the reference UI blindly. Use it as direction.
- Use current tokens, not a new unrelated palette.
- Use Spanish UI copy in product surfaces.
- Keep dashboard secondary.
- Keep chat and canvas together on desktop.
- Trust and traceability are product features, not debug details.
