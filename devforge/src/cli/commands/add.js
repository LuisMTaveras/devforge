import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');

// Shared helpers of the standard components (installed next to them).
const vueFile = f => ({ src: `src/adapters/vue/components/${f}`, dest: `src/shared/components/${f}`, framework: 'vue' });
const reactFile = f => ({ src: `src/adapters/react/components/${f}`, dest: `src/shared/components/${f}`, framework: 'react' });
const coreFile = f => ({ src: `src/core/${f}`, dest: `src/core/${f}` });
const ICONS_VUE = [vueFile('DfIcon.ts'), { src: 'src/adapters/shared/icon-paths.ts', dest: 'src/shared/components/icon-paths.ts', framework: 'vue' }];
const ICONS_REACT = [reactFile('icons.tsx'), reactFile('usePopover.ts'), { src: 'src/adapters/shared/icon-paths.ts', dest: 'src/shared/components/icon-paths.ts', framework: 'react' }];
const OVERLAY_CORE = [coreFile('overlay/escape-layer.ts'), coreFile('overlay/scroll-lock.ts')];
const OVERLAY_HOOKS = [
  { src: 'src/adapters/vue/composables/useOverlay.ts', dest: 'src/shared/composables/useOverlay.ts', framework: 'vue' },
  { src: 'src/adapters/react/hooks/useOverlay.ts', dest: 'src/shared/hooks/useOverlay.ts', framework: 'react' },
];

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
      { src: 'src/core/formatters/input-masks.ts', dest: 'src/core/formatters/input-masks.ts' },
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
      ...['types.ts', 'controller.ts', 'query.ts', 'index.ts', 'styles.css'].map(f => ({
        src: `src/vendor/flickerless/core/${f}`, dest: `src/shared/flickerless/core/${f}`,
      })),
      { src: 'src/vendor/flickerless/flickerless.css', dest: 'src/shared/flickerless/flickerless.css' },
      { src: 'src/vendor/flickerless/LICENSE', dest: 'src/shared/flickerless/LICENSE' },
      ...['index.ts', 'useFlickerless.ts', 'useFlickerlessQuery.ts', 'FlickerlessSurface.ts', 'FlickerlessValue.ts',
        'FlickerlessTableShell.ts', 'settled.ts', 'directives.ts'].map(f => ({
        src: `src/vendor/flickerless/vue/${f}`, dest: `src/shared/flickerless/vue/${f}`, framework: 'vue',
      })),
      ...['index.ts', 'useFlickerless.ts', 'useFlickerlessQuery.ts', 'FlickerlessSurface.tsx', 'FlickerlessValue.tsx',
        'FlickerlessTableShell.tsx', 'settled.ts'].map(f => ({
        src: `src/vendor/flickerless/react/${f}`, dest: `src/shared/flickerless/react/${f}`, framework: 'react',
      })),
    ]
  },
  'select': {
    name: 'SelectField: combo estándar que reemplaza al <select> nativo (Vue & React)',
    requires: ['theme'],
    files: [
      { src: 'src/adapters/vue/components/SelectField.vue', dest: 'src/shared/components/SelectField.vue', framework: 'vue' },
      { src: 'src/adapters/react/components/SelectField.tsx', dest: 'src/shared/components/SelectField.tsx', framework: 'react' },
      ...ICONS_REACT,
    ]
  },
  'dates': {
    name: 'DateField + DateRangeFilter + DatePicker: campo de fecha, filtro de período y rango (Vue & React)',
    requires: ['theme', 'select'],
    files: [
      { src: 'src/core/dates/date-range.ts', dest: 'src/core/dates/date-range.ts' },
      { src: 'src/adapters/vue/components/DatePicker.vue', dest: 'src/shared/components/DatePicker.vue', framework: 'vue' },
      { src: 'src/adapters/vue/components/DateRangeFilter.vue', dest: 'src/shared/components/DateRangeFilter.vue', framework: 'vue' },
      vueFile('DateField.vue'),
      reactFile('DateField.tsx'),
      ...ICONS_VUE,
      { src: 'src/adapters/react/components/DatePicker.tsx', dest: 'src/shared/components/DatePicker.tsx', framework: 'react' },
      { src: 'src/adapters/react/components/DateRangeFilter.tsx', dest: 'src/shared/components/DateRangeFilter.tsx', framework: 'react' },
    ]
  },
  'pagination': {
    name: 'ListPager: pie de listado paginado («Mostrando 11–20 de 57» + ‹ 2 / 6 ›) (Vue & React)',
    requires: ['theme', 'formatters', 'flickerless'],
    files: [
      { src: 'src/core/pagination/pagination.ts', dest: 'src/core/pagination/pagination.ts' },
      { src: 'src/adapters/vue/components/ListPager.vue', dest: 'src/shared/components/ListPager.vue', framework: 'vue' },
      { src: 'src/adapters/react/components/ListPager.tsx', dest: 'src/shared/components/ListPager.tsx', framework: 'react' },
      ...ICONS_REACT,
    ]
  },
  'feedback': {
    name: 'ConfirmDialog + ToastHost: alertDialog / confirmDialog / promptDialog y notify (Vue & React)',
    requires: ['theme'],
    files: [
      coreFile('feedback/dialog.ts'),
      coreFile('feedback/toast.ts'),
      ...OVERLAY_CORE,
      ...OVERLAY_HOOKS,
      ...ICONS_VUE,
      ...ICONS_REACT,
      vueFile('ConfirmDialog.vue'),
      vueFile('ToastHost.vue'),
      reactFile('ConfirmDialog.tsx'),
      reactFile('ToastHost.tsx'),
    ]
  },
  'overlays': {
    name: 'ModalShell + DrawerShell + RowMenu: capas con Escape apilado y bloqueo de scroll (Vue & React)',
    requires: ['theme'],
    files: [
      ...OVERLAY_CORE,
      coreFile('overlay/menu-position.ts'),
      ...OVERLAY_HOOKS,
      ...ICONS_VUE,
      ...ICONS_REACT,
      vueFile('ModalShell.vue'),
      vueFile('DrawerShell.vue'),
      vueFile('RowMenu.vue'),
      reactFile('ModalShell.tsx'),
      reactFile('DrawerShell.tsx'),
      reactFile('RowMenu.tsx'),
    ]
  },
  'list-states': {
    name: 'EmptyState + ListStaleNotice: lista vacía con acción y aviso de cambios (Vue & React)',
    requires: ['theme'],
    files: [
      ...ICONS_VUE,
      ...ICONS_REACT,
      vueFile('EmptyState.vue'),
      vueFile('ListStaleNotice.vue'),
      reactFile('EmptyState.tsx'),
      reactFile('ListStaleNotice.tsx'),
    ]
  },
  'inputs': {
    name: 'MoneyInput + MaskedInput: monto, cédula, RNC y teléfono enmascarados al escribir (Vue & React)',
    requires: ['theme', 'formatters'],
    files: [
      ...ICONS_REACT.filter(f => f.dest.endsWith('usePopover.ts')),
      vueFile('MoneyInput.vue'),
      vueFile('MaskedInput.vue'),
      reactFile('MoneyInput.tsx'),
      reactFile('MaskedInput.tsx'),
    ]
  },
  'batch': {
    name: 'BatchProgressModal: avance en vivo de un lote («3 de 10 · Cliente») (Vue & React)',
    requires: ['overlays', 'formatters'],
    files: [
      coreFile('batch/batch-progress.ts'),
      vueFile('BatchProgressModal.vue'),
      reactFile('BatchProgressModal.tsx'),
    ]
  },
  'authorizations': {
    name: 'Autorizaciones: interceptor del 403, AuthorizationDialog y AuthorizationAlerts (Vue & React; backend: blueprint 08)',
    requires: ['theme', 'formatters', 'errors', 'feedback'],
    files: [
      coreFile('authorizations/authorization.ts'),
      vueFile('AuthorizationDialog.vue'),
      vueFile('AuthorizationAlerts.vue'),
      reactFile('AuthorizationDialog.tsx'),
      reactFile('AuthorizationAlerts.tsx'),
    ]
  },
  'notifications': {
    name: 'NotificationCenter: la campana con su bandeja y avisos de escritorio (Vue & React; backend: blueprint 09)',
    requires: ['theme', 'formatters', 'flickerless', 'feedback'],
    files: [
      coreFile('notifications/notifications.ts'),
      vueFile('NotificationCenter.vue'),
      reactFile('NotificationCenter.tsx'),
    ]
  },
  'shells': {
    name: 'CardShell, DetailShell, TableStates: carga en frío y estados de tabla sin skeleton (Vue & React)',
    requires: ['theme', 'flickerless'],
    files: [
      ...ICONS_VUE,
      ...ICONS_REACT,
      vueFile('CardShell.vue'),
      vueFile('DetailShell.vue'),
      vueFile('TableStates.vue'),
      reactFile('CardShell.tsx'),
      reactFile('DetailShell.tsx'),
      reactFile('TableStates.tsx'),
    ]
  },
  'list-toolbar': {
    name: 'ListToolbar, ListTabs, SearchInput, HistoryPeriodFilter: la barra estándar de un listado (Vue & React)',
    requires: ['theme', 'formatters', 'flickerless', 'dates'],
    files: [
      ...ICONS_VUE,
      ...ICONS_REACT,
      vueFile('ListToolbar.vue'),
      vueFile('ListTabs.vue'),
      vueFile('SearchInput.vue'),
      vueFile('HistoryPeriodFilter.vue'),
      reactFile('ListToolbar.tsx'),
      reactFile('ListTabs.tsx'),
      reactFile('SearchInput.tsx'),
      reactFile('HistoryPeriodFilter.tsx'),
    ]
  },
  'list-cache': {
    name: 'useCachedList + createTabCache: listas que se conservan al navegar y parchean lo que cambiaste (Vue & React)',
    requires: ['list-states'],
    files: [
      coreFile('list-cache/document-changes.ts'),
      coreFile('list-cache/tab-cache.ts'),
      { src: 'src/adapters/vue/composables/useCachedList.ts', dest: 'src/shared/composables/useCachedList.ts', framework: 'vue' },
      { src: 'src/adapters/react/hooks/useCachedList.ts', dest: 'src/shared/hooks/useCachedList.ts', framework: 'react' },
    ]
  },
  'excel': {
    name: 'downloadExcelReport: Excel tipado con totales que no mezclan monedas (backend: blueprint 10)',
    files: [coreFile('export/download.ts'), coreFile('export/excel-report.ts')]
  },
  'pickers': {
    name: 'RecordPickerModal: elegir cliente / artículo buscando en el servidor (Vue & React)',
    requires: ['theme', 'overlays', 'list-states', 'errors', 'flickerless'],
    files: [
      ...ICONS_VUE,
      ...ICONS_REACT,
      coreFile('search/record-search.ts'),
      { src: 'src/adapters/vue/composables/useRecordSearch.ts', dest: 'src/shared/composables/useRecordSearch.ts', framework: 'vue' },
      { src: 'src/adapters/react/hooks/useRecordSearch.ts', dest: 'src/shared/hooks/useRecordSearch.ts', framework: 'react' },
      vueFile('SearchInput.vue'),
      vueFile('RecordPickerModal.vue'),
      reactFile('SearchInput.tsx'),
      reactFile('RecordPickerModal.tsx'),
    ]
  },
  'command-palette': {
    name: 'CommandPalette (⌘K): pantallas en el navegador y registros en el servidor (Vue & React)',
    requires: ['theme', 'overlays', 'list-states', 'errors'],
    files: [
      ...ICONS_VUE,
      ...ICONS_REACT,
      coreFile('search/nav-search.ts'),
      coreFile('search/record-search.ts'),
      { src: 'src/adapters/vue/composables/useRecordSearch.ts', dest: 'src/shared/composables/useRecordSearch.ts', framework: 'vue' },
      { src: 'src/adapters/react/hooks/useRecordSearch.ts', dest: 'src/shared/hooks/useRecordSearch.ts', framework: 'react' },
      vueFile('SearchInput.vue'),
      vueFile('CommandPalette.vue'),
      reactFile('SearchInput.tsx'),
      reactFile('CommandPalette.tsx'),
    ]
  },
  'documents': {
    name: 'DocumentPreviewModal + openPdfInNewTab: ver, imprimir y descargar documentos con la sesión (Vue & React)',
    requires: ['theme', 'overlays', 'feedback', 'errors'],
    files: [
      ...ICONS_VUE,
      ...ICONS_REACT,
      coreFile('export/download.ts'),
      coreFile('documents/print.ts'),
      vueFile('DocumentPreviewModal.vue'),
      reactFile('DocumentPreviewModal.tsx'),
    ]
  },
  'app-update': {
    name: 'installAppUpdates: versión nueva sin perder trabajo y recuperación de pantallas que no cargan',
    files: [coreFile('app-update/app-update.ts')]
  },
  'field-help': {
    name: 'FieldHelp: la ayuda «?» de un campo que también funciona en táctil (Vue & React)',
    requires: ['theme'],
    files: [...ICONS_VUE, ...ICONS_REACT, vueFile('FieldHelp.vue'), reactFile('FieldHelp.tsx')]
  },
  'security': {
    name: 'escapeHtml, safeLinkUrl, sanitizeTenantCss: datos de terceros en HTML, enlaces y CSS',
    files: [coreFile('security/escape-html.ts'), coreFile('security/safe-url.ts'), coreFile('security/sanitize-css.ts')]
  },
  'url-sync': {
    name: 'URL Search Params Synchronizer',
    files: [
      { src: 'src/core/url-sync/url-state.ts', dest: 'src/core/url-sync/url-state.ts' },
    ]
  }
};

export async function addCommand(moduleKeys, options = {}) {
  logger.banner();
  const targetDir = options.cwd || process.cwd();
  const keys = (Array.isArray(moduleKeys) ? moduleKeys : [moduleKeys]).filter(Boolean).map(k => k.toLowerCase());
  const unknown = keys.filter(k => !MODULE_REGISTRY[k]);

  if (!keys.length || unknown.length) {
    logger.error(keys.length ? `Module(s) not recognized: ${unknown.join(', ')}` : 'Name at least one module.');
    console.log('\nAvailable modules to add:');
    Object.keys(MODULE_REGISTRY).forEach(k => {
      console.log(`  - \x1b[36m${k}\x1b[0m: ${MODULE_REGISTRY[k].name}`);
    });
    process.exitCode = 1;
    return;
  }

  const ctx = { installed: options._installed || new Set(), skipped: [], missing: [], force: !!options.force };
  for (const key of keys) installModule(key, targetDir, ctx, options.framework);

  if (ctx.missing.length) {
    logger.error(`Package is incomplete, these source files are missing: ${ctx.missing.join(', ')}`);
    process.exitCode = 1;
  }
  if (ctx.skipped.length) {
    logger.warn(`Kept ${ctx.skipped.length} existing file(s) with local changes (re-run with --force to overwrite):`);
    ctx.skipped.forEach(f => console.log(`  - ${f}`));
  }
  logger.success(`\nModule(s) ready to use: ${keys.join(', ')}`);
}

/** Rewrites source-package imports to the `@/` alias used in the target project. */
function rewriteImports(content) {
  return content
    // ../../vendor/flickerless/vue/index.js -> @/shared/flickerless/vue
    .replace(/from '(?:\.\.\/)+vendor\/flickerless\/([^']+?)(?:\/index)?\.js'/g, "from '@/shared/flickerless/$1'")
    .replace(/from '@flickerless\/core'/g, "from '@/shared/flickerless/core'")
    .replace(/from '(?:\.\.\/)+core\/([^']+?)\.js'/g, "from '@/core/$1'")
    // ../../shared/icon-paths.js -> ./icon-paths (installed next to the components)
    .replace(/from '(?:\.\.\/)+shared\/icon-paths\.js'/g, "from './icon-paths'")
    // Remaining relative imports drop the `.js` the source package needs for NodeNext.
    .replace(/from '(\.\.?\/[^']+)\.(?:js|ts)'/g, "from '$1'");
}

function installModule(key, targetDir, ctx, framework) {
  const { installed } = ctx;
  if (installed.has(key)) return;
  installed.add(key);
  const mod = MODULE_REGISTRY[key];

  for (const dep of mod.requires || []) {
    if (!installed.has(dep)) {
      logger.info(`'${key}' requires '${dep}'.`);
      installModule(dep, targetDir, ctx, framework);
    }
  }

  logger.info(`Injecting ${mod.name} into ${targetDir}...\n`);

  mod.files.forEach(f => {
    if (framework && f.framework && f.framework !== framework) return;
    const srcPath = path.join(ROOT_DIR, f.src);
    const destPath = path.join(targetDir, f.dest);

    if (!fs.existsSync(srcPath)) {
      ctx.missing.push(f.src);
      return;
    }
    // Source modules use relative imports so this package typechecks on its own.
    // In the target project they live elsewhere, so rewrite them to the `@/` alias
    // mandated by .ai/standards/project-structure.md.
    const content = /\.(ts|tsx|vue)$/.test(srcPath)
      ? Buffer.from(rewriteImports(fs.readFileSync(srcPath, 'utf8')), 'utf8')
      : fs.readFileSync(srcPath);
    const existed = fs.existsSync(destPath);
    if (existed) {
      if (fs.readFileSync(destPath).equals(content)) return; // already up to date
      if (!ctx.force) {
        ctx.skipped.push(f.dest);
        return;
      }
    }
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, content);
    logger.success(`${existed ? 'Updated' : 'Created'}: ${f.dest}`);
  });
}
