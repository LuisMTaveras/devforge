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

## 3. Sophisticated Enterprise Color Palette (Soft Tints, No Neon)

- **Dual Theme Architecture (Claro + Oscuro, Mandatory)**: Every project ships both themes. Full rules in `.ai/standards/theming.md`.
  - **Light**: Background white / zinc-50 (`#ffffff` / `#fafafa`), text zinc-900 (`#18181b`), borders 1px zinc-200 (`#e4e4e7`).
  - **Dark**: Background neutral zinc or slate (`#09090b` or `#0f172a`), NOT saturated cyan or teal. Surfaces (`#18181b` / `#1e293b`), borders 1px (`#27272a` / `#334155`).
  - Use semantic tokens (`bg-background`, `bg-surface`, `text-foreground`, `text-muted-foreground`, `border-border`) so components work in both themes.
- **Status Badges (Subdued Tints, Never Saturated Neon, Readable in Both Themes)**:
  - *Success*: Soft emerald background (`bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20`).
  - *Warning*: Soft amber background (`bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20`).
  - *Destructive / Error*: Soft rose background (`bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20`).
  - *Neutral / Secondary*: Soft zinc background (`bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border border-zinc-500/20`).
- **The 60-30-10 Rule**:
  - **60%**: Neutral background surfaces.
  - **30%**: Crisp typography hierarchy (zinc-900 on light, zinc-100 on dark).
  - **10%**: Single functional accent color (e.g. clean enterprise blue or emerald for actions).

---

## 4. Spatial System & Density Archetypes

All layouts must follow an intentional **4px / 8px grid**:

- Spacers: `4px (1)`, `8px (2)`, `12px (3)`, `16px (4)`, `24px (6)`, `32px (8)`.
- Density Archetypes:
  - **High-Density (B2B, Dashboards, Data tools)**: Compact row heights (36px-40px), font size 12-14px, minimal padding (`p-2.5` to `p-3`), tabular numbers, drawers and split panes.
  - **Standard-Density (Consumer apps, SaaS Landing, Settings)**: Row heights (44px-48px), font size 14-16px, comfortable padding (`p-4` to `p-6`).

---

## 5. Typography Scale & Hierarchy

- **Title/Display**: Bold or semibold, tight letter-spacing (`tracking-tight`), distinct size hierarchy (`text-2xl` to `text-4xl`).
- **Body**: Normal weight, relaxed line-height (`leading-relaxed`), high contrast against background.
- **Data & Metrics**: Always monospace for codes, IDs, monetary amounts, and timestamps (`font-mono text-xs tabular-nums text-muted-foreground`), always rendered through the localized formatters (`formatCurrency`, `formatNumber`, `formatDate`, `formatPhoneNumber`).

---

## 6. Complete Interaction States (The 5 States of UI)

Every interactive component (buttons, inputs, cards, rows) must have all 5 states explicitly designed:

1. **Default**: Crisp border, balanced background.
2. **Hover**: Subtle contrast increase (e.g. `hover:bg-surface-hover`, or `hover:bg-zinc-100 dark:hover:bg-zinc-800`), 150ms transition.
3. **Active / Pressed**: Subtle scale down (`active:scale-[0.98]`) or deeper background shade.
4. **Focus-Visible**: High-contrast, accessible 2px focus ring with offset (`focus-visible:ring-2 focus-visible:ring-offset-2`).
5. **Disabled**: Reduced opacity (`opacity-50 pointer-events-none cursor-not-allowed`).

---

## 7. Micro-UX & Empty States

- **Empty States**: Never display a blank table or a plain "No data" message. Always provide:
  1. An icon representing the entity.
  2. A clear headline (e.g., "Aún no hay transacciones registradas").
  3. A short explanatory description.
  4. A direct Primary Action button (e.g., "[Nueva transacción]").
- **Loading (Zero Skeletons)**: Skeletons and full-screen spinners are banned. Use Flickerless: what was there stays dimmed under a 2 px bar, what is not known yet is `—`, cold loads paint the real table shell. Rules: `.ai/standards/ui-components.md` §1.
- **Standard controls**: combos use `SelectField`, dates use `DatePicker` / `DateRangeFilter`, lists end with `ListPager` (`ui-components.md` §2–§4).
