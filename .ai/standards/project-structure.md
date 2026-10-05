# ⚡ DEVFORGE Production Project Structure

<!-- Definitive directory & file hierarchy for greenfield Vue 3 and React projects -->

## 1. Core Structural Philosophy

Every production project initialized under DEVFORGE follows a **Domain-Driven, Feature-First** architecture. This avoids messy "flat" folders with 60 components in one place.

---

## 2. Universal Directory Hierarchy

```text
my-project/
├── .ai/                            # Universal AI Brain & Blueprints
│   ├── AGENTS.md                   # Codex / Antigravity / Gemini instructions
│   ├── CLAUDE.md                   # Claude Code instructions
│   ├── .cursorrules                # Cursor instructions
│   ├── blueprints/                 # 5 Architectural Recipes
│   └── standards/                  # UI/UX, Kickoff, TypeScript standards
│
├── public/                         # Static assets (favicons, robots.txt)
│
├── src/
│   ├── app/                        # Application Shell & Foundation
│   │   ├── router/                 # Routes definition & navigation guards
│   │   ├── providers/              # React Context or Vue Plugins
│   │   └── App.tsx / App.vue       # Root app component
│   │
│   ├── core/                       # Agnostic Business Logic & Infrastructure
│   │   ├── api/                    # HTTP client, interceptors, OpenAPI types
│   │   │   ├── client.ts           # Axios or openapi-fetch wrapper
│   │   │   └── v1.d.ts             # Auto-generated backend contracts
│   │   ├── permissions/            # RBAC/ABAC engine (ability.ts)
│   │   ├── storage/                # Type-safe localStorage / sessionStorage
│   │   └── url-sync/               # URL query param synchronizer (url-state.ts)
│   │
│   ├── modules/                    # Business Feature Domains (Self-contained)
│   │   ├── auth/                   # Authentication & Session
│   │   │   ├── components/         # LoginForm.tsx, RegisterForm.tsx
│   │   │   ├── composables/        # useAuth.ts (or hooks/useAuth.ts)
│   │   │   ├── services/           # authService.ts
│   │   │   ├── types/              # auth.types.ts
│   │   │   └── index.ts            # Public feature API
│   │   ├── users/                  # Users feature domain
│   │   └── billing/                # Billing feature domain
│   │
│   ├── shared/                     # Reusable UI Design System & Utilities
│   │   ├── components/             # Primitives: Button, Modal, DataTable, Input
│   │   ├── directives/             # Vue directives (v-can) or React wrappers (<Can />)
│   │   ├── hooks/                  # Universal custom hooks / composables
│   │   ├── lib/                    # Helper functions (cn / clsx, formatters, date)
│   │   └── styles/                 # Global design tokens, font definitions, CSS
│   │
│   ├── main.ts / main.tsx          # Application entrypoint
│   └── env.d.ts                    # Vite / framework environment types
│
├── .env.example                    # Template for environment variables
├── .eslintrc.cjs / eslint.config.js # Strict linting rules
├── .gitignore                      # Standard git ignores
├── package.json                    # Dependencies & execution scripts
├── README.md                       # Project overview & developer guide
├── tailwind.config.ts / css        # Design tokens & color system
├── tsconfig.json                   # Strict TypeScript compiler options
└── vite.config.ts                  # Bundler configuration & path aliases (@/ -> src/)
```

---

## 3. Path Aliases Configuration

In `tsconfig.json`, path aliases must always map cleanly to avoid relative import hell (`../../../`):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@core/*": ["src/core/*"],
      "@modules/*": ["src/modules/*"],
      "@shared/*": ["src/shared/*"]
    }
  }
}
```

And mirrored in `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```
