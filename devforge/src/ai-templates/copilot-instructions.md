# ⚡ DEVFORGE GITHUB COPILOT INSTRUCTIONS

This codebase follows DEVFORGE architecture and design standards:

- **Greenfield Scaffolding**: Before generating an entire new app, check `.ai/standards/project-kickoff.md` and clarify project objectives with the user.
- **UI/UX Design**: Strictly follow `.ai/standards/ui-ux-principles.md`. Avoid generic AI tropes (purple gradients, blur orbs, low information density). Design high-density, accessible, production-ready interfaces.
- **Themes**: Every project ships light and dark themes (Claro / Oscuro / Sistema). Use semantic tokens (`bg-background`, `text-foreground`, `border-border`) per `.ai/standards/theming.md`; never a color that only works in one theme.
- **Standard Components**: Loading uses Flickerless (`<FlickerlessSurface>`, `<FlickerlessValue>`, `<FlickerlessTableShell>`), never skeletons. Combos use `<SelectField>`, dates `<DatePicker>` / `<DateRangeFilter>`, paginated lists end with `<ListPager>` (`.ai/standards/ui-components.md`).
- **Formatting**: Render money, numbers, dates and phones only through `@/core/formatters/formatters` (`formatCurrency`, `formatNumber`, `formatPercent`, `formatDate`, `formatPhoneNumber` -> `(809) 578-1234`). Separators follow the project country (`.ai/standards/data-formatting.md`).
- **No Hallucination**: Use only DEVFORGE functions listed in `.ai/standards/module-api.md`. Never invent packages, endpoints, GraphQL fields or env vars: check `package.json`, `src/core/api/v1.d.ts` and `.env.example`. The CLI is `devforge` (never `npx devforge`).
- **Structure**: Organize code according to `.ai/standards/project-structure.md`.
- **Language**: TypeScript Strict. Prefer `type` for unions/primitives, `interface` for object contracts.
- **Architectural Blueprints**: Architectural patterns are documented in `.ai/blueprints/`. Always align suggestions with those blueprints.
- **Vue 3**: Use Composition API with `<script setup lang="ts">`, VueUse composables, and Pinia.
- **React**: Use functional components, TS generics, TanStack Query, and Zustand.
- **Error Handling**: Use structured try/catch with proper loggers and user-facing notifications.
