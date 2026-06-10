# UI/UX Rebuild Plan — AI Business Analyst

This document defines the UI/UX rebuild for the Tiendanube AI Business Analyst based on the recent product direction:

- **Chat-first**
- **Mobile-first**
- **Desktop-adaptive**
- **Trust-layer-driven**
- **Dashboard as validation / pinned insights, not the primary workflow**

---

## Quick path

1. Build the **mobile conversation flow** first.
2. Turn every AI answer into a **report card preview**.
3. Open full analysis in a **detail view / sheet on mobile**.
4. Adapt desktop into **chat + analysis canvas**.
5. Add the **trust layer** behind progressive disclosure.
6. Reuse the **Lovable-inspired visual language** for colors and tone.

---

## Product model

| Area | Role |
|-------|------|
| Chat | Ask |
| Analysis detail / canvas | Inspect |
| Trust layer | Verify |
| Dashboard | Save, pin, monitor |

Core principle:

> This product should feel like **conversational analytics with a structured report workspace**, not like ChatGPT alone and not like a classic BI dashboard alone.

---

## UX architecture

## 1. Mobile-first base flow

### Main screen

- Full-screen chat feed
- Sticky composer at the bottom
- Suggested prompts near the top for empty / first-use states
- AI responses rendered as **report cards**, not giant expanded analytics blocks

### AI report card anatomy

Each answer card should include:

1. Report label + source
2. Title
3. 2–4 line summary
4. KPI strip
5. Mini chart or table preview
6. Quick actions
7. Suggested follow-up chips
8. Primary CTA: **Open analysis**

### Mobile detail view

Tapping a report card opens a dedicated analysis surface:

- full-height sheet or pushed detail screen
- back-to-chat action
- KPI cards
- AI summary
- tabs for:
  - Chart
  - Table
  - Summary
- trust layer collapsible
- quick actions:
  - Pin
  - CSV
  - Image
  - Copy

### Mobile rules

- Do not show dense full tables inline in the chat feed by default
- Do not overload the top action row
- Keep the detail view focused on one report at a time
- Use preview-in-feed, inspect-in-detail

---

## 2. Desktop adaptation

### Layout

- Left rail: chat conversation
- Right panel: persistent analysis canvas
- Resizable divider
- Chat remains visible while the current answer is inspected

### Desktop panel ratio

- Left: ~32% to 36%
- Right: ~64% to 68%

### Desktop canvas structure

1. Header
   - source badge
   - date range
   - sync status
   - quick actions
2. KPI row
3. AI summary card
4. Analysis tabs
   - Chart
   - Table
   - Summary
5. Trust layer
6. Follow-up prompts

### Desktop rules

- Right panel is a **stable workspace**
- User should not need to scroll the chat to inspect old answers
- Trust details should live in the canvas, not only inside the left feed

---

## Trust layer

Trust is NOT optional. It is part of the product.

### Default trust metadata

Every answer should expose:

- Source
- Date range
- Filters applied
- Last sync
- Metric definition / calculation explanation
- Raw rows preview

### Disclosure order

1. Business explanation
2. Filters + source + last sync
3. Calculation explanation
4. Raw rows preview
5. Debug / technical evidence only if needed

### Out-of-scope behavior

If the user asks for data the product does not have:

- say it clearly
- avoid guessing
- suggest one supported question

Example:

> I can’t answer that from Tiendanube data yet. Right now I can help with sales, products, customers, and inventory.

---

## Suggested component map

## Chat shell

- `ResizablePanelGroup`
- `ScrollArea`
- `Textarea`
- `Button`
- `Separator`

## Report cards

- `Card`
- `Badge`
- `Button`
- `DropdownMenu`
- shadcn `Chart`

## Analysis detail / canvas

- `Card`
- `Tabs`
- `Table`
- `Badge`
- `Tooltip`
- `Collapsible`
- `Sheet`
- `Dialog`

## Loading / feedback

- `Skeleton`
- `Alert`
- `Sonner`

---

## Visual design system

The UI should stay close to the Lovable example you shared:

- premium but calm
- editorial headline feel
- clean SaaS surfaces
- trust-heavy
- soft contrast
- teal accents
- minimal color noise

---

## Colors

These values are **implementation tokens inspired by the Lovable example**, not brand-identity absolutes. They are intentionally close to the visual direction shown in the mock.

### Core palette

| Token | Hex | Usage |
|------|------|------|
| `background` | `#F8FAFC` | app background |
| `surface` | `#FFFFFF` | cards, canvas, sheets |
| `surface-muted` | `#F3F6F8` | subtle sections, muted blocks |
| `border` | `#D9E2E8` | default borders |
| `border-strong` | `#BFD3DB` | selected report card / active surfaces |
| `text-primary` | `#111827` | main body text |
| `text-secondary` | `#667085` | supporting text |
| `text-muted` | `#94A3B8` | captions / helper text |
| `heading-ink` | `#111111` | display headlines |
| `brand-teal` | `#0F9FA8` | primary accent |
| `brand-teal-dark` | `#0B7F87` | hover / stronger emphasis |
| `brand-teal-soft` | `#E7F8F8` | summary card background |
| `brand-green` | `#22C55E` | positive metric deltas |
| `brand-green-soft` | `#EAF8EF` | positive backgrounds |
| `ink-navy` | `#0F172A` | user message bubbles / strong contrast actions |
| `warning-amber` | `#F59E0B` | inventory / warning states |
| `danger-rose` | `#EF4444` | negative / error states |

### Recommended CSS variable mapping

```css
:root {
  --background: 248 250 252;
  --foreground: 17 24 39;
  --card: 255 255 255;
  --card-foreground: 17 24 39;
  --popover: 255 255 255;
  --popover-foreground: 17 24 39;
  --primary: 15 159 168;
  --primary-foreground: 255 255 255;
  --secondary: 243 246 248;
  --secondary-foreground: 17 24 39;
  --muted: 243 246 248;
  --muted-foreground: 102 112 133;
  --accent: 231 248 248;
  --accent-foreground: 11 127 135;
  --border: 217 226 232;
  --input: 217 226 232;
  --ring: 15 159 168;
  --destructive: 239 68 68;
}
```

---

## Typography

The Lovable direction uses a strong editorial contrast:

- serif display for report titles / big statements
- clean sans-serif for UI / tables / controls

### Recommended pairing

| Role | Font |
|------|------|
| Display / headlines | `Cormorant Garamond` or `Playfair Display` |
| UI / body / controls | `Inter` |

### Recommended usage

#### Display serif

Use for:

- report titles
- onboarding hero line
- snapshot headline

Suggested class idea:

```css
.font-display {
  font-family: "Cormorant Garamond", "Playfair Display", serif;
}
```

#### Sans

Use for:

- all product UI
- labels
- badges
- tabs
- tables
- metric values if clarity wins

Suggested class idea:

```css
.font-ui {
  font-family: "Inter", system-ui, sans-serif;
}
```

### Type scale

| Element | Size |
|------|------|
| Desktop report title | `48–56px` |
| Mobile report title | `32–40px` |
| Section title | `20–24px` |
| KPI value | `32–40px` |
| Body | `16px` |
| Small labels | `12–13px` |

---

## Spacing and shape

### Radius

- Cards: `20px`
- Inputs: `20px`
- KPI cards: `18px`
- Chips: `9999px`

### Border behavior

- default cards: `1px` soft border
- selected card: teal border + subtle glow
- trust layer: soft border, lower contrast than primary report card

### Shadows

Keep shadows subtle:

- use border-first design
- only light ambient elevation

---

## Interaction rules

## Report card states

- default
- hover
- selected
- loading
- error

## Empty state

Should show:

- welcome line
- connected store status
- 2–4 best prompt groups
- one path to sample report

Do NOT show a giant wall of suggestions.

## Follow-up prompts

Make them:

- short
- business-focused
- contextual

Examples:

- Which products drove most of the growth?
- Compare last week vs the same week last month
- Show customers who bought on Thursday

---

## Build order

## Phase 1 — Design tokens

- define color tokens
- define font pairing
- define spacing / radius / borders
- connect to Tailwind / shadcn theme

## Phase 2 — Mobile shell

- chat page
- sticky composer
- report card component
- empty state

## Phase 3 — Mobile analysis detail

- detail sheet / screen
- KPI block
- AI summary
- chart / table / summary tabs
- trust layer

## Phase 4 — Desktop adaptation

- resizable split layout
- selected-answer sync into canvas
- desktop trust layout

## Phase 5 — Actions and polish

- pin
- export
- copy for WhatsApp/Slack
- better loading states
- better unsupported-question UI

---

## Done criteria

- A merchant can ask a question on mobile and understand the answer immediately.
- A merchant can open one answer and inspect it without losing the chat.
- A merchant can verify where the numbers came from.
- Desktop users can continue the same flow with a persistent analysis canvas.
- The visual system feels consistent with the Lovable direction: calm, premium, trustworthy, teal-accented, editorial but usable.

---

## Notes

- Keep the dashboard secondary.
- Keep the AI response structured.
- Keep trust visible but progressive.
- Keep mobile compact.
- Keep desktop stable.

