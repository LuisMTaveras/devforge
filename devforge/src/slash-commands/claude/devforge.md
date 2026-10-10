# /devforge - Architectural Blueprints & Standards

Consult DEVFORGE architectural specifications:
1. Review `.ai/standards/ui-ux-principles.md` for Anti-AI design rules and 60-30-10 color guidelines.
   - Review `.ai/standards/theming.md`: every screen must work in light and dark themes.
   - Review `.ai/standards/ui-components.md`: Flickerless loading (no skeletons), SelectField, DatePicker / DateRangeFilter, ListPager, confirmDialog / notify, ModalShell / DrawerShell / RowMenu, EmptyState, MoneyInput / MaskedInput and BatchProgressModal.
   - Review `.ai/standards/data-formatting.md`: currency, numbers, dates and phones (`(809) 578-1234`) formatted per country.
2. Review available blueprints in `.ai/blueprints/`:
   - `01-openapi-sdk.md` (OpenAPI to type-safe client)
   - `02-schema-forms.md` (Zod dynamic forms)
   - `03-datagrid-url-sync.md` (URL-synced tables)
   - `04-rbac-matrix.md` (CASL declarative permissions)
   - `05-in-app-devtools.md` (Floating developer cockpit)
   - `06-auth-session.md` (Auth & silent refresh queue)
   - `07-graphql-pagination.md` (Strict pagination & query optimization)
3. Check `.ai/standards/project-structure.md` for feature-first code organization.
4. Assist the user in implementing clean, production-grade, human-crafted code.
