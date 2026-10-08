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
      { src: 'src/adapters/react/Can.tsx', dest: 'src/shared/components/Can.tsx' },
      { src: 'src/adapters/vue/v-can.ts', dest: 'src/shared/directives/v-can.ts' },
    ]
  },
  'theme': {
    name: 'Light / Dark Theme Engine (Tokens, Vue & React hooks, no-flash script)',
    files: [
      { src: 'src/core/theme/theme.ts', dest: 'src/core/theme/theme.ts' },
      { src: 'src/core/theme/tokens.css', dest: 'src/shared/styles/tokens.css' },
      { src: 'src/adapters/vue/useTheme.ts', dest: 'src/shared/composables/useTheme.ts' },
      { src: 'src/adapters/react/useTheme.ts', dest: 'src/shared/hooks/useTheme.ts' },
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

  const mod = MODULE_REGISTRY[moduleKey.toLowerCase()];
  logger.info(`Injecting ${mod.name} into ${targetDir}...\n`);

  mod.files.forEach(f => {
    const srcPath = path.join(ROOT_DIR, f.src);
    const destPath = path.join(targetDir, f.dest);

    if (fs.existsSync(srcPath)) {
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      if (/\.(ts|tsx)$/.test(srcPath)) {
        // Source modules use relative imports so this package typechecks on its own.
        // In the target project they live elsewhere, so rewrite them to the `@/` alias
        // mandated by .ai/standards/project-structure.md.
        const content = fs.readFileSync(srcPath, 'utf8')
          .replace(/from '(?:\.\.\/)+core\/([^']+?)\.js'/g, "from '@/core/$1'");
        fs.writeFileSync(destPath, content, 'utf8');
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
      logger.success(`Created: ${f.dest}`);
    }
  });

  logger.success(`\nModule '${moduleKey}' ready to use!`);
}
