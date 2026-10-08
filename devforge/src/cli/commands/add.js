import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');

const MODULE_REGISTRY = {
  'auth': {
    name: 'Authentication & Silent Refresh Queue Engine',
    files: [
      { src: 'src/core/auth/auth-token.ts', dest: 'src/core/auth/auth-token.ts' },
      { src: 'src/core/auth/silent-refresh-queue.ts', dest: 'src/core/auth/silent-refresh-queue.ts' },
      { src: 'src/adapters/vue/auth.store.ts', dest: 'src/modules/auth/stores/auth.store.ts' },
    ]
  },
  'errors': {
    name: 'Universal API Error Normalizer (Laravel/Express/FastAPI/Nest)',
    files: [
      { src: 'src/core/errors/api-error.ts', dest: 'src/core/errors/api-error.ts' },
    ]
  },
  'export': {
    name: 'CSV & Excel Export Engine with UTF-8 BOM',
    files: [
      { src: 'src/core/export/export-engine.ts', dest: 'src/core/export/export-engine.ts' },
    ]
  },
  'formatters': {
    name: 'Localized Data Formatters (Currency, Numbers, Percents, Dates, Phones, Fallbacks)',
    files: [
      { src: 'src/core/formatters/formatters.ts', dest: 'src/core/formatters/formatters.ts' },
    ]
  },
  'rbac': {
    name: 'RBAC / ABAC Permissions Engine',
    files: [
      { src: 'src/core/permissions/ability.ts', dest: 'src/core/permissions/ability.ts' },
      { src: 'src/adapters/react/Can.tsx', dest: 'src/shared/components/Can.tsx', framework: 'react' },
      { src: 'src/adapters/vue/v-can.ts', dest: 'src/shared/directives/v-can.ts', framework: 'vue' },
    ]
  },
  'theme': {
    name: 'Light / Dark Theme Engine (Tokens, Vue & React hooks, no-flash script)',
    files: [
      { src: 'src/core/theme/theme.ts', dest: 'src/core/theme/theme.ts' },
      { src: 'src/core/theme/tokens.css', dest: 'src/shared/styles/tokens.css' },
      { src: 'src/adapters/vue/useTheme.ts', dest: 'src/shared/composables/useTheme.ts', framework: 'vue' },
      { src: 'src/adapters/react/useTheme.ts', dest: 'src/shared/hooks/useTheme.ts', framework: 'react' },
    ]
  },
  'flickerless': {
    name: 'Flickerless: carga sin skeleton (superficie que conserva, «—» hasta saber)',
    files: [
      ...['types.ts', 'controller.ts', 'index.ts', 'styles.css'].map(f => ({
        src: `src/vendor/flickerless/core/${f}`, dest: `src/shared/flickerless/core/${f}`,
      })),
      { src: 'src/vendor/flickerless/flickerless.css', dest: 'src/shared/flickerless/flickerless.css' },
      { src: 'src/vendor/flickerless/LICENSE', dest: 'src/shared/flickerless/LICENSE' },
      ...['index.ts', 'useFlickerless.ts', 'useFlickerlessQuery.ts', 'FlickerlessSurface.ts', 'FlickerlessValue.ts',
        'FlickerlessTableShell.ts', 'settled.ts', 'directives.ts'].map(f => ({
        src: `src/vendor/flickerless/vue/${f}`, dest: `src/shared/flickerless/vue/${f}`, framework: 'vue',
      })),
      ...['index.ts', 'useFlickerless.ts', 'FlickerlessSurface.tsx', 'FlickerlessValue.tsx',
        'FlickerlessTableShell.tsx', 'settled.ts'].map(f => ({
        src: `src/vendor/flickerless/react/${f}`, dest: `src/shared/flickerless/react/${f}`, framework: 'react',
      })),
    ]
  },
  'select': {
    name: 'SelectField: combo estándar que reemplaza al <select> nativo',
    requires: ['theme'],
    files: [
      { src: 'src/adapters/vue/components/SelectField.vue', dest: 'src/shared/components/SelectField.vue', framework: 'vue' },
    ]
  },
  'dates': {
    name: 'DatePicker + DateRangeFilter: selector de fecha/rango y filtro de período',
    requires: ['theme', 'select'],
    files: [
      { src: 'src/core/dates/date-range.ts', dest: 'src/core/dates/date-range.ts' },
      { src: 'src/adapters/vue/components/DatePicker.vue', dest: 'src/shared/components/DatePicker.vue', framework: 'vue' },
      { src: 'src/adapters/vue/components/DateRangeFilter.vue', dest: 'src/shared/components/DateRangeFilter.vue', framework: 'vue' },
    ]
  },
  'pagination': {
    name: 'ListPager: pie de listado paginado («Mostrando 11–20 de 57» + ‹ 2 / 6 ›)',
    requires: ['theme', 'formatters', 'flickerless'],
    files: [
      { src: 'src/core/pagination/pagination.ts', dest: 'src/core/pagination/pagination.ts' },
      { src: 'src/adapters/vue/components/ListPager.vue', dest: 'src/shared/components/ListPager.vue', framework: 'vue' },
    ]
  },
  'url-sync': {
    name: 'URL Search Params Synchronizer',
    files: [
      { src: 'src/core/url-sync/url-state.ts', dest: 'src/core/url-sync/url-state.ts' },
    ]
  }
};

export async function addCommand(moduleKey, options = {}) {
  logger.banner();
  const targetDir = options.cwd || process.cwd();

  if (!moduleKey || !MODULE_REGISTRY[moduleKey.toLowerCase()]) {
    logger.error(`Module '${moduleKey}' not recognized.`);
    console.log('\nAvailable modules to add:');
    Object.keys(MODULE_REGISTRY).forEach(k => {
      console.log(`  - \x1b[36m${k}\x1b[0m: ${MODULE_REGISTRY[k].name}`);
    });
    return;
  }

  const installed = options._installed || new Set();
  installModule(moduleKey.toLowerCase(), targetDir, installed, options.framework);
  logger.success(`\nModule '${moduleKey}' ready to use!`);
}

/** Rewrites source-package imports to the `@/` alias used in the target project. */
function rewriteImports(content) {
  return content
    // ../../vendor/flickerless/vue/index.js -> @/shared/flickerless/vue
    .replace(/from '(?:\.\.\/)+vendor\/flickerless\/([^']+?)(?:\/index)?\.js'/g, "from '@/shared/flickerless/$1'")
    .replace(/from '@flickerless\/core'/g, "from '@/shared/flickerless/core'")
    .replace(/from '(?:\.\.\/)+core\/([^']+?)\.js'/g, "from '@/core/$1'");
}

function installModule(key, targetDir, installed, framework) {
  if (installed.has(key)) return;
  installed.add(key);
  const mod = MODULE_REGISTRY[key];

  for (const dep of mod.requires || []) {
    if (!installed.has(dep)) {
      logger.info(`'${key}' requires '${dep}'.`);
      installModule(dep, targetDir, installed, framework);
    }
  }

  logger.info(`Injecting ${mod.name} into ${targetDir}...\n`);

  mod.files.forEach(f => {
    if (framework && f.framework && f.framework !== framework) return;
    const srcPath = path.join(ROOT_DIR, f.src);
    const destPath = path.join(targetDir, f.dest);

    if (fs.existsSync(srcPath)) {
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      if (/\.(ts|tsx|vue)$/.test(srcPath)) {
        // Source modules use relative imports so this package typechecks on its own.
        // In the target project they live elsewhere, so rewrite them to the `@/` alias
        // mandated by .ai/standards/project-structure.md.
        fs.writeFileSync(destPath, rewriteImports(fs.readFileSync(srcPath, 'utf8')), 'utf8');
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
      logger.success(`Created: ${f.dest}`);
    }
  });
}
