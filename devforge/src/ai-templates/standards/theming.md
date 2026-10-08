# ⚡ DEVFORGE Theming Standard (Light + Dark)

<!-- Mandatory: every DEVFORGE project ships with BOTH a light and a dark theme from day one -->

## 1. The Dual-Theme Rule

Every project built under DEVFORGE **must ship with two themes: Claro (light) and Oscuro (dark)**, plus a **Sistema** option that follows the OS preference.

- **Banned**: Dark-only or light-only interfaces. "We'll add dark mode later" is not allowed.
- **Banned**: A color class without its counterpart in the other theme (`bg-white` alone, `text-zinc-100` alone).
- **Banned**: Hardcoded hex colors inside components (`style="color:#18181b"`). Colors live only in design tokens.
- **Required**: The theme engine, tokens and selector are part of the initial scaffold, not a later feature.
- **Required**: Both themes meet WCAG AA contrast (4.5:1 body text, 3:1 large text and UI borders).

---

## 2. Scaffold Checklist (Done Before the First Screen)

```bash
devforge add theme        # core/theme/theme.ts, shared/styles/tokens.css, useTheme()
devforge add formatters   # localized currency, numbers, dates and phones
```

1. **Tokens**: Import `src/shared/styles/tokens.css` from the global stylesheet (Tailwind CSS v4).
2. **No-flash script**: Inline `THEME_INIT_SCRIPT` in the `<head>` of `index.html` so dark mode never flashes white on load.
3. **Bootstrap**: Call `initTheme()` in `main.ts` / `main.tsx` before mounting.
4. **Selector**: Add a theme selector (Claro / Oscuro / Sistema) in the app shell header or user menu using `useTheme()`.
5. **Verify**: Every screen is reviewed in both themes before it is considered done.

```html
<!-- index.html -->
<head>
  <script>
    (function(){try{var p=localStorage.getItem('devforge-theme');var d=p==='dark'||((!p||p==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();
  </script>
</head>
```

```typescript
// main.ts / main.tsx
import '@/shared/styles/main.css'; // contains: @import './tokens.css';
import { initTheme } from '@/core/theme/theme';
import { setFormatCountry } from '@/core/formatters/formatters';

initTheme();
setFormatCountry('DO'); // country chosen during the kickoff
```

---

## 3. Semantic Design Tokens

Components use **semantic** classes. The token decides the color for each theme, so components never need to know which theme is active.

| Token (Tailwind class)     | Claro (light)        | Oscuro (dark)        | Use                               |
| -------------------------- | -------------------- | -------------------- | --------------------------------- |
| `bg-background`            | `#ffffff`            | `#09090b` zinc-950   | App canvas                        |
| `bg-surface`               | `#fafafa` zinc-50    | `#18181b` zinc-900   | Cards, drawers, table headers     |
| `hover:bg-surface-hover`   | `#f4f4f5` zinc-100   | `#27272a` zinc-800   | Row / item hover                  |
| `text-foreground`          | `#18181b` zinc-900   | `#f4f4f5` zinc-100   | Primary text                      |
| `text-muted-foreground`    | `#71717a` zinc-500   | `#a1a1aa` zinc-400   | Secondary text, labels, `—`       |
| `border-border`            | `#e4e4e7` zinc-200   | `#27272a` zinc-800   | 1px dividers, card borders        |
| `border-input`             | `#e4e4e7` zinc-200   | `#3f3f46` zinc-700   | Form fields                       |
| `ring-ring`                | `#18181b` zinc-900   | `#d4d4d8` zinc-300   | Focus-visible rings               |
| `bg-primary` / `text-primary-foreground` | zinc-900 / zinc-50 | zinc-50 / zinc-900 | Primary buttons     |

```vue
<!-- ✅ Correct: works in both themes -->
<div class="rounded-lg border border-border bg-surface p-4 text-foreground">
  <p class="text-sm text-muted-foreground">Saldo disponible</p>
</div>

<!-- ✅ Also valid: explicit pair when a token does not exist -->
<div class="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">...</div>

<!-- ❌ Banned: only works in one theme -->
<div class="bg-zinc-950 text-zinc-100">...</div>
```

---

## 4. Status Badges in Both Themes

Soft tints keep the same background in both themes; the **text shade changes** to keep contrast:

| Status       | Classes                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------- |
| Completado   | `bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400`          |
| Pendiente    | `bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400`                  |
| Rechazado    | `bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400`                      |
| Neutral      | `bg-zinc-500/10 text-zinc-700 border-zinc-500/20 dark:text-zinc-400`                      |

---

## 5. Theme Selector (UI Copy in Spanish)

- Labels: **Claro**, **Oscuro**, **Sistema** (exported as `THEME_LABELS`). Never `Light` / `Dark` / `System` in a Spanish UI.
- Use a segmented control or a menu with icons (`Sun`, `Moon`, `Monitor` from Lucide) and an `aria-label="Cambiar tema"`.
- The choice persists in `localStorage` (`devforge-theme`) and syncs across tabs.

```vue
<script setup lang="ts">
import { useTheme } from '@/shared/composables/useTheme';
const { preference, labels, setPreference } = useTheme();
</script>

<template>
  <div role="radiogroup" aria-label="Cambiar tema" class="inline-flex rounded-md border border-border p-0.5">
    <button
      v-for="option in (['light', 'dark', 'system'] as const)"
      :key="option"
      role="radio"
      :aria-checked="preference === option"
      class="rounded px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-hover aria-checked:bg-surface aria-checked:text-foreground"
      @click="setPreference(option)"
    >
      {{ labels[option] }}
    </button>
  </div>
</template>
```

---

## 6. Charts, Images & Third-Party Widgets

- Charts read colors from CSS variables (`getComputedStyle(document.documentElement).getPropertyValue('--foreground')`) and re-render when `useTheme().theme` changes.
- Logos and illustrations need a variant for each theme (or use `currentColor` SVGs).
- Third-party widgets (date pickers, editors) must be configured for both themes before being accepted into the project.

---

## 7. Tailwind CSS v3 Projects

`tokens.css` uses Tailwind **v4** syntax. Check the `tailwindcss` version in `package.json` before using it. On **v3**:

1. Delete the first three blocks (`@import 'tailwindcss'`, `@custom-variant`, `@theme inline`) and keep `:root`, `.dark` and `@layer base`; put `@tailwind base; @tailwind components; @tailwind utilities;` at the top.
2. In `tailwind.config.ts` set `darkMode: 'class'` and map each token:

```typescript
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: { DEFAULT: 'var(--surface)', hover: 'var(--surface-hover)' },
        'muted-foreground': 'var(--muted-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
    },
  },
};
```

> Opacity modifiers (`bg-surface/50`) do not work with hex variables on v3. Use them only on v4, or with the regular palette (`bg-zinc-500/10`).

---

## 8. What NOT to Invent

- The only tokens are the ones in §3 (`background`, `foreground`, `surface`, `surface-hover`, `muted-foreground`, `border`, `input`, `ring`, `primary`, `primary-foreground`, `success`, `warning`, `danger`). Classes like `bg-card`, `text-muted`, `bg-accent` or `bg-secondary` **do not exist** unless you add the token to `tokens.css` first (in both `:root` and `.dark`).
- The only theme API is the one listed in `.ai/standards/module-api.md` §2.
- Do not install `next-themes`, `@vueuse/core`'s `useDark` or similar libraries: the theme engine is already in `src/core/theme/theme.ts`.
