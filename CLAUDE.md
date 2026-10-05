# ⚡ DEVFORGE CLAUDE INSTRUCTIONS (Claude Code & Anthropic AI)

This repository is powered by **DEVFORGE**. You are expected to operate as a Principal Architect / Senior Software Engineer.

## 🚨 MANDATORY PRE-FLIGHT CHECKLIST (VERIFY BEFORE GENERATING CODE)

1. **[ ] ZERO HARDCODED DATA**:
   - Banned: `const items = [ ... ]`, `const records = [ ... ]` inside components.
   - All data must flow via typed props, service calls (`services/`), or composables/hooks.
2. **[ ] MANDATORY PAGINATION & ZERO OVER-FETCHING**:
   - Banned: Unpaginated list calls. Always pass `page` + `pageSize` (or `first` + `after`).
   - Banned: Querying unused fields. In GraphQL use fragment colocation; in REST use sparse fieldsets (`?fields=...`).
3. **[ ] AUTOMATIC LOCALIZED FORMATTING**:
   - Banned: Raw currency numbers (`17870000` or `"$ " + amount`), raw ISO dates (`2026-10-05T...`), or raw phone numbers (`3001234567`).
   - Required: Use `formatCurrency()`, `formatDate()`, `formatRelativeTime()`, and `formatPhoneNumber()` from `@/core/formatters/formatters`.
   - Null fallback: Always render `—` for null/undefined/empty data points.
4. **[ ] ZERO SPANGLISH / 100% SPANISH**:
   - If the project is in Spanish, 0% English allowed in UI text, table columns, badges, buttons:
     - `Close` ➔ `Cerrar`, `Save` ➔ `Guardar`, `Status` ➔ `Estado`, `Amount` ➔ `Monto`
     - `Flagged` ➔ `Observado`, `Settled` ➔ `Completado`, `Pending` ➔ `Pendiente`
5. **[ ] ZERO CYBERPUNK / ZERO NEON GAMER**:
   - Banned Tailwind classes: `cyan-*`, `teal-*`, `neon-*`, glowing borders, radioactive greens (`#00ff9d`), or deep cyan backgrounds.
   - Required palette: Pure neutral darks (`bg-zinc-950`, `bg-zinc-900`, `border-zinc-800`, `text-zinc-100`, `text-zinc-400`) and soft-tint badges (`bg-emerald-500/10 text-emerald-400 border-emerald-500/20`).
6. **[ ] VUE 3 / REACT LOGIC SAFETY**:
   - Null safety: Use optional chaining `record?.cliente?.nombre` everywhere.
   - No direct prop mutations: Always emit events `emit('close')` or `emit('update:modelValue', val)`.

## Primary Principles

- **Zero Hardcoded Data & Strict Pagination**: Follow `.ai/blueprints/07-graphql-pagination.md`. Never load full datasets into memory.
- **Developer Calibration & Stack Advisory**: Execute `.ai/standards/project-kickoff.md` (Junior/Intermediate/Senior calibration).
- **Anti-AI Design Excellence**: Follow `.ai/standards/ui-ux-principles.md` (Linear/Stripe aesthetic).
- **Strict Adherence to Blueprints**: Check `.ai/blueprints/` before coding.

## Common Commands

- Build: `npm run build`
- Dev server: `npm run dev`
- Tests: `npm run test` or `npx vitest run`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Audit: `npx devforge audit`
