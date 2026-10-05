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
    - **Default Currency**: (e.g. `USD`, `COP`, `MXN`, `EUR`)
    - **Date & Number Locale**: (e.g. `es-CO`, `es-MX`, `es-ES`, `en-US`)
    - **Phone Country Mask**: (e.g. Colombia `+57`, México `+52`, USA `+1`, España `+34`)

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
  - Dark Mode First / OLED (deep zinc-950, crisp white typography, soft-tint badges)
  - Enterprise / Fintech (trustworthy slate with emerald accents)
  - Brutalist / Industrial (bold borders, monospace typography, high contrast)

### 7. Initial Scope & Key MVP Workflows

- What are the 2 or 3 essential screens or user flows needed for this first milestone (MVP)?
- Example: 1) Authentication & Session, 2) Paginated Transaction Table with URL sync, 3) Record Detail Drawer.

---

## 🚀 Post-Discovery Execution Workflow

Once the user answers the discovery questions:

1. Confirm the agreed architecture, stack, country localization, and visual theme.
2. Initialize the project using the standard directory structure defined in `.ai/standards/project-structure.md`.
3. Apply the data formatting defaults (`.ai/standards/data-formatting.md`).
4. Apply the design directives from `.ai/standards/ui-ux-principles.md`.
5. Proceed incrementally with user feedback checkpoints at each step.
