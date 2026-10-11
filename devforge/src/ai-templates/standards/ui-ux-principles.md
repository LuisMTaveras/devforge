# ⚡ DEVFORGE UI/UX Design System & Principles

<!-- Inspired by elite product design and UI/UX Pro Max standards -->

## 1. The Anti-AI Aesthetic Protocol (Strict Blacklist)

AI-generated interfaces often default to generic tropes. In this project, the following are **strictly forbidden**:

- **No "Cyberpunk / Sci-Fi Hacker / Neon Gamer" Aesthetic**:
  - Strictly avoid pitch-black or dark-teal backgrounds paired with radioactive neon cyan (`#00ffff`), neon green, or electric purple accents.
  - An enterprise application must look like **Linear, Stripe, or Vercel**, not like a video game console.
- **No Purposeless Decorative Badges & Clutter**:
  - Never add fake system metrics (*"CPU: 18%", "Buffer Cache: 99%", "PRO-CLUSTER"*) unless explicitly required by the business domain.
- **No Generic Purple/Indigo Gradients** on text or backgrounds.
- **No Floating Blur Orbs** or glow drop-shadows.
- **No Emoji Spam in Headers or Buttons** (use SVG icons from Lucide or Heroicons).
- **No Oversized, Low-Density Cards** that hold two sentences and waste screen real estate.

---

## 2. Zero-Spanglish Rule & Language Purity

Language consistency must be absolute:

- If the user communicates or requests the project in **Spanish**:
  - **100% of the UI must be in Spanish**: navigation, table headers, buttons, placeholders, dialogs, empty states, and toast notifications.
  - **Statuses & Badges must be properly translated**:
    - *Settled* ➔ **Liquidado** / **Completado**
    - *Pending* ➔ **Pendiente**
    - *Flagged* ➔ **En revisión** / **Observado**
    - *Reversed* ➔ **Revertido**
    - *Wire Transfer* ➔ **Transferencia bancaria**
    - *Score* ➔ **Puntuación de riesgo**
  - Never leave English fallback terms in UI templates.

---

## 3. Color: Semantic Tokens Only (Warm Slate)

- **Dual theme (Claro + Oscuro + Sistema) is mandatory.** Full rules in `.ai/standards/theming.md`. The values live ONLY in `tokens.css`; a component never contains a hex, an `rgb()` or a raw palette class (`bg-zinc-50`, `text-slate-900`, `bg-blue-600`).
- **Surfaces**: `bg-background` (page), `bg-surface` (cards, tables), `bg-surface-raised` (menus, modals). **Text**: `text-foreground`, `text-muted-foreground`, `text-dim-foreground`. **Lines**: `border-border`.
- **Status badges** (soft tint, readable in both themes): `rounded-full border px-2 py-0.5 text-xs font-medium` plus
  - Success: `border-success/20 bg-success/10 text-success`
  - Warning: `border-warning/20 bg-warning/10 text-warning`
  - Danger: `border-danger/20 bg-danger/10 text-danger`
  - Neutral: `border-border bg-surface text-muted-foreground`
- **One action color**: `bg-primary text-primary-foreground` (graphite in Claro, ivory in Oscuro). There is no second «brand blue» or green CTA. Destructive actions use `danger`.
- **60-30-10**: 60% neutral surfaces, 30% typography hierarchy, 10% `primary` + states. Color carries meaning, never decoration; never color alone (pair it with text or an icon).

---

## 4. Spatial System & Density Archetypes

All layouts follow a **4px / 8px grid**: `1` (4px), `2` (8px), `3` (12px), `4` (16px), `6` (24px), `8` (32px). No arbitrary values (`p-[13px]`, `text-[15px]`).

- **High density (B2B, dashboards, data tools — the default)**: rows 36–40px, `text-sm` body / `text-xs` meta, cell padding `px-3 py-2`, tabular numbers, drawers and split panes instead of page hops.
- **Standard density (settings, onboarding, consumer)**: rows 44–48px, `text-sm`–`text-base`, padding `p-4`–`p-6`.
- **Responsive**: every screen works at 375px. Tables scroll horizontally inside their own container (never the page); filter bars wrap; modals become full-height sheets on mobile.

---

## 5. Typography Scale & Hierarchy

- **Page title**: `text-xl font-semibold tracking-tight` (one per screen). **Section title**: `text-base font-semibold`. **Body**: `text-sm`. **Meta / helper**: `text-xs text-muted-foreground`.
- **Numbers and money**: `tabular-nums`, right-aligned in tables, in `text-foreground` (an amount is data, not decoration — never dimmed). Always through the formatters (`formatCurrency`, `formatNumber`, `formatPercent`).
- **Codes and IDs** (NCF, SKU, UUID fragments): `font-mono text-xs`. Dates and times are NOT monospace; they use `formatDate` / `formatTime`.
- Max two font weights per screen besides the title (`font-normal`, `font-medium`).

---

## 6. Complete Interaction States

Every interactive element (buttons, inputs, rows, menu items) defines:

1. **Default**: token border + token background.
2. **Hover**: one step of contrast via tokens (`hover:bg-surface-raised` / `hover:bg-primary/90`), `transition-colors duration-150`.
3. **Active**: `active:scale-[0.98]` for buttons only.
4. **Focus-visible**: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`. Never remove focus without replacing it.
5. **Disabled**: native `disabled` attribute + `disabled:opacity-50 disabled:cursor-not-allowed`. Do NOT add `pointer-events-none` (it kills the cursor and the tooltip that explains why).
6. **Busy**: the button that runs the action is disabled and changes its text (`Guardando…`); the rest of the screen stays usable.

---

## 6-bis. Forms, Errors & Accessibility

- **Fields**: every field has a visible `<label>` bound to it (placeholder is not a label). Required fields are marked and validated on submit AND on blur once touched. The error is shown under the field (`text-xs text-danger`), with `aria-invalid` and `aria-describedby`.
- **Field types** map to the standard components: closed list ➔ `SelectField`; date ➔ `DateField`; money ➔ `MoneyInput`; phone / cédula / RNC ➔ `MaskedInput`. Never `<input type="number">` for money.
- **Submit**: one primary button bottom-right (`Guardar`), secondary `Cancelar` to its left. Enter submits, Escape cancels (through `ModalShell`). Leaving with unsaved changes asks with `confirmDialog()`.
- **Backend errors**: field errors from the API go to their fields; the rest go to `notify({ type: 'error' })` with the message from `normalizeApiError(err)`. Never show stack traces, status codes or English text.
- **Accessibility**: icon-only buttons have `aria-label` (in the UI language); contrast AA in both themes; everything reachable with Tab in visual order; modals trap focus and return it on close; motion respects `prefers-reduced-motion`.

---

## 7. Micro-UX & Empty States

- **Empty States**: Never display a blank table or a plain "No data" message. Always provide:
  1. An icon representing the entity.
  2. A clear headline (e.g., "Aún no hay transacciones registradas").
  3. A short explanatory description.
  4. A direct Primary Action button (e.g., "[Nueva transacción]").
- **Loading (Zero Skeletons)**: Skeletons and full-screen spinners are banned. Use Flickerless: what was there stays dimmed under a 2 px bar, what is not known yet is `—`, cold loads paint the real table shell. Rules: `.ai/standards/ui-components.md` §1.
- **Standard controls**: combos use `SelectField`, form dates use `DateField`, listing filters `DateRangeFilter`, lists end with `ListPager`, empty lists show `EmptyState`, modals use `ModalShell`, interruptions `confirmDialog()`, feedback `notify()` (`ui-components.md`).
- **Every action gives feedback**: a save ends in a toast or a visible change; a failure says what failed and what to do. A destructive action asks first with `tone: 'danger'`.
