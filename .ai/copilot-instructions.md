# ⚡ DEVFORGE GITHUB COPILOT INSTRUCTIONS

This codebase follows DEVFORGE architecture and design standards:

- **Greenfield Scaffolding**: Before generating an entire new app, check `.ai/standards/project-kickoff.md` and clarify project objectives with the user.
- **UI/UX Design**: Strictly follow `.ai/standards/ui-ux-principles.md`. Avoid generic AI tropes (purple gradients, blur orbs, low information density). Design high-density, accessible, production-ready interfaces.
- **Structure**: Organize code according to `.ai/standards/project-structure.md`.
- **Language**: TypeScript Strict. Prefer `type` for unions/primitives, `interface` for object contracts.
- **Architectural Blueprints**: Architectural patterns are documented in `.ai/blueprints/`. Always align suggestions with those blueprints.
- **Vue 3**: Use Composition API with `<script setup lang="ts">`, VueUse composables, and Pinia.
- **React**: Use functional components, TS generics, TanStack Query, and Zustand.
- **Error Handling**: Use structured try/catch with proper loggers and user-facing notifications.
