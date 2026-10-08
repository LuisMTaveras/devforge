# ⚡ DEVFORGE Greenfield Project Kickoff Protocol

<!-- Mandatory interactive discovery protocol before starting any project from scratch -->

## 🎯 The Rule of Interactive Scoping

When a user asks to start a new project from 0, bootstrap a greenfield application, or architect a new major system:

> **CRITICAL DIRECTIVE**: DO NOT immediately output massive boilerplate code or start creating folders.
> You MUST first conduct an **Interactive Discovery & Calibration Session** divided into two phases: **Phase 1: Developer Calibration & Stack Advisory**, followed by **Phase 2: Product & UX Scoping**.

---

## 📋 Phase 1: Developer Calibration & Stack Advisory (Mandatory Step 0)

Before recommending technical architecture, ask the user:

### 1. Project Type & Core Problem

- What kind of application are you building?
- Examples: B2B CRM, Financial Ledger, Admin Dashboard, Customer Portal, E-commerce, Inventory ERP.

### 2. Developer Experience Level

- What is your current development experience level?
  - **Junior**: Needs clear, clean, un-bloated patterns with guided explanations, avoiding unnecessary over-engineering.
  - **Intermediate**: Standard modular feature-first architecture, clean separation of concerns, strong TypeScript contracts.
  - **Senior**: Advanced decoupling (adapters, pure composables/hooks, factories, strict generic inference, MSW mocking).

### 3. Country, Currency & Localization Defaults

- What country and region will this application primarily target?
  - This automatically establishes formatting defaults so the user never has to configure them manually:
    - **Default Currency**: (e.g. `DOP`, `USD`, `COP`, `MXN`, `EUR`)
    - **Date & Number Locale**: (e.g. `es-DO`, `es-CO`, `es-MX`, `es-ES`, `en-US`) — defines thousands/decimal separators (`1,234.56` vs `1.234,56`)
    - **Phone Country Mask**: (e.g. República Dominicana `(809) 578-1234`, Colombia `(300) 123-4567`, México `(55) 1234-5678`)
    - **Phone Display**: national `(809) 578-1234` (default) or international `+1 (809) 578-1234` for multi-country apps
  - All of this is applied with a single `setFormatCountry('<CODE>')` call (see `.ai/standards/data-formatting.md`).

### 4. Proactive Stack Recommendation (With User Autonomy)

- Based on the project type and developer experience level, the AI agent **MUST recommend the ideal tech stack** with clear technical rationale (e.g., *"For a high-density B2B CRM at Intermediate level, I recommend Vite + Vue 3 + Tailwind CSS + Pinia + TanStack Table because..."*).
- **CRITICAL**: The user always holds the final decision. Ask the user: *"Do you agree with this stack, or would you prefer a different framework/tooling (e.g., React, Next.js, Nuxt, etc.)?"*

---

## 📋 Phase 2: Product & UX Scoping (After Stack is Agreed)

Once the stack and developer profile are established, finalize the functional scope:

### 5. Target Audience & Information Density

- Who will use this tool daily?
- Do they require **High Data Density** (compact tables, split-pane drawers, keyboard shortcuts like Linear/Stripe/Excel) or **Standard / Visual Density** (more spacious cards, walkthroughs)?

### 6. Visual Identity & Mood

- What brand aesthetic or mood are you aiming for?
  - Modern Minimalist (clean zinc/slate, subtle 1px borders, quiet elegance)
  - Enterprise / Fintech (trustworthy slate with emerald accents)
  - Brutalist / Industrial (bold borders, monospace typography, high contrast)
- **Light and dark themes are NOT optional**: every project ships both (Claro / Oscuro / Sistema). Only ask which one is the **default** for first-time visitors (recommended: `Sistema`, follows the OS). See `.ai/standards/theming.md`.

### 7. Initial Scope & Key MVP Workflows

- What are the 2 or 3 essential screens or user flows needed for this first milestone (MVP)?
- Example: 1) Authentication & Session, 2) Paginated Transaction Table with URL sync, 3) Record Detail Drawer.

---

## 🚀 Post-Discovery Execution Workflow

Once the user answers the discovery questions:

1. Confirm the agreed architecture, stack, country localization, and visual identity.
2. Initialize the project using the standard directory structure defined in `.ai/standards/project-structure.md`.
3. Install the foundation modules **before building any screen** so the project is ready from the first commit:
   ```bash
   npx devforge add formatters   # currency, numbers, percents, dates, phones, "—" fallback
   npx devforge add theme        # light + dark tokens, initTheme(), useTheme()
   ```
4. Wire them in the entrypoint (`main.ts` / `main.tsx`): `setFormatCountry('<CODE>')` and `initTheme()`; add the no-flash script to `index.html` and the theme selector (Claro / Oscuro / Sistema) to the app shell.
5. Apply the data formatting defaults (`.ai/standards/data-formatting.md`) and theming rules (`.ai/standards/theming.md`).
6. Apply the design directives from `.ai/standards/ui-ux-principles.md`.
7. Proceed incrementally with user feedback checkpoints at each step. Every screen is reviewed in **both themes** before it is considered done.
