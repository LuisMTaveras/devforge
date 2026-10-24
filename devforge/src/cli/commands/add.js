import fs from 'node:fs';
import path from 'node:path';
import { FRAMEWORK_LABEL, detectFramework } from '../detect.js';
import { cmd, logger, name } from '../logger.js';
import { ROOT_DIR, finishInstall, installContext, posix, writeOwned } from '../manifest.js';
import {
  COMPOSE_DEPENDENCIES,
  COMPOSE_MODULES,
  detectAndroidPackage,
  detectSourceRoot,
  isValidPackage,
  rewriteKotlinPackage,
} from './compose-modules.js';

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

export const MODULE_REGISTRY = {
  'auth': {
    name: 'Sesión: token y cola de refresco silencioso (auth.store)',
    files: [
      { src: 'src/core/auth/auth-token.ts', dest: 'src/core/auth/auth-token.ts' },
      { src: 'src/core/auth/silent-refresh-queue.ts', dest: 'src/core/auth/silent-refresh-queue.ts' },
      { src: 'src/adapters/vue/auth.store.ts', dest: 'src/modules/auth/stores/auth.store.ts' },
    ]
  },
  'errors': {
    name: 'normalizeApiError: el mensaje para el usuario de cualquier error del API (Laravel, Express, Nest, FastAPI)',
    files: [
      { src: 'src/core/errors/api-error.ts', dest: 'src/core/errors/api-error.ts' },
    ]
  },
  'export': {
    name: 'Exportación CSV con BOM UTF-8 (para Excel tipado, usa excel)',
    files: [
      { src: 'src/core/export/export-engine.ts', dest: 'src/core/export/export-engine.ts' },
    ]
  },
  'formatters': {
    name: 'Formateadores por país: moneda, números, porcentajes, fechas, teléfonos y «—»',
    files: [
      { src: 'src/core/formatters/formatters.ts', dest: 'src/core/formatters/formatters.ts' },
      { src: 'src/core/formatters/input-masks.ts', dest: 'src/core/formatters/input-masks.ts' },
    ]
  },
  'rbac': {
    name: 'Permisos (RBAC / ABAC): Ability, <Can /> y v-can',
    files: [
      { src: 'src/core/permissions/ability.ts', dest: 'src/core/permissions/ability.ts' },
      { src: 'src/adapters/react/Can.tsx', dest: 'src/shared/components/Can.tsx', framework: 'react' },
      { src: 'src/adapters/vue/v-can.ts', dest: 'src/shared/directives/v-can.ts', framework: 'vue' },
    ]
  },
  'theme': {
    name: 'Tema Claro / Oscuro / Sistema: tokens Warm Slate, initTheme() y script anti-parpadeo',
    files: [
      { src: 'src/core/theme/theme.ts', dest: 'src/core/theme/theme.ts' },
      { src: 'src/core/theme/tokens.css', dest: 'src/shared/styles/tokens.css' },
      { src: 'src/adapters/vue/useTheme.ts', dest: 'src/shared/composables/useTheme.ts', framework: 'vue' },
      { src: 'src/adapters/react/useTheme.ts', dest: 'src/shared/hooks/useTheme.ts', framework: 'react' },
    ]
  },
  'flickerless': {
    name: 'Flickerless: lo que había se conserva al recargar y lo que no se sabe es «—»',
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
    name: 'SelectField: combo estándar que reemplaza al <select> nativo (Vue y React)',
    requires: ['theme'],
    files: [
      { src: 'src/adapters/vue/components/SelectField.vue', dest: 'src/shared/components/SelectField.vue', framework: 'vue' },
      { src: 'src/adapters/react/components/SelectField.tsx', dest: 'src/shared/components/SelectField.tsx', framework: 'react' },
      ...ICONS_REACT,
    ]
  },
  'dates': {
    name: 'DateField + DateRangeFilter + DatePicker: campo de fecha, filtro de período y rango (Vue y React)',
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
    name: 'ListPager: pie de listado paginado («Mostrando 11–20 de 57» + ‹ 2 / 6 ›) (Vue y React)',
    requires: ['theme', 'formatters', 'flickerless'],
    files: [
      { src: 'src/core/pagination/pagination.ts', dest: 'src/core/pagination/pagination.ts' },
      { src: 'src/adapters/vue/components/ListPager.vue', dest: 'src/shared/components/ListPager.vue', framework: 'vue' },
      { src: 'src/adapters/react/components/ListPager.tsx', dest: 'src/shared/components/ListPager.tsx', framework: 'react' },
      ...ICONS_REACT,
    ]
  },
  'feedback': {
    name: 'ConfirmDialog + ToastHost: alertDialog / confirmDialog / promptDialog y notify (Vue y React)',
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
    name: 'ModalShell + DrawerShell + RowMenu: capas con Escape apilado y bloqueo de scroll (Vue y React)',
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
    name: 'EmptyState + ListStaleNotice: lista vacía con acción y aviso de cambios (Vue y React)',
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
    name: 'MoneyInput + MaskedInput: monto, cédula, RNC y teléfono enmascarados al escribir (Vue y React)',
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
    name: 'BatchProgressModal: avance en vivo de un lote («3 de 10 · Cliente») (Vue y React)',
    requires: ['overlays', 'formatters'],
    files: [
      coreFile('batch/batch-progress.ts'),
      vueFile('BatchProgressModal.vue'),
      reactFile('BatchProgressModal.tsx'),
    ]
  },
  'authorizations': {
    name: 'Autorizaciones: interceptor del 403, AuthorizationDialog y AuthorizationAlerts (Vue y React; backend: blueprint 08)',
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
    name: 'NotificationCenter: la campana con su bandeja y avisos de escritorio (Vue y React; backend: blueprint 09)',
    requires: ['theme', 'formatters', 'flickerless', 'feedback'],
    files: [
      coreFile('notifications/notifications.ts'),
      vueFile('NotificationCenter.vue'),
      reactFile('NotificationCenter.tsx'),
    ]
  },
  'shells': {
    name: 'CardShell, DetailShell, TableStates: carga en frío con la forma real y estados de tabla (Vue y React)',
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
    name: 'ListToolbar, ListTabs, SearchInput, HistoryPeriodFilter: la barra estándar de un listado (Vue y React)',
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
    name: 'useCachedList + createTabCache: listas que se conservan al navegar y parchean lo que cambiaste (Vue y React)',
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
    name: 'RecordPickerModal: elegir cliente / artículo buscando en el servidor (Vue y React)',
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
    name: 'CommandPalette (⌘K): pantallas en el navegador y registros en el servidor (Vue y React)',
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
    name: 'DocumentPreviewModal + openPdfInNewTab: ver, imprimir y descargar documentos con la sesión (Vue y React)',
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
    name: 'FieldHelp: la ayuda «?» de un campo que también funciona en táctil (Vue y React)',
    requires: ['theme'],
    files: [...ICONS_VUE, ...ICONS_REACT, vueFile('FieldHelp.vue'), reactFile('FieldHelp.tsx')]
  },
  'security': {
    name: 'escapeHtml, safeLinkUrl, sanitizeTenantCss: datos de terceros en HTML, enlaces y CSS',
    files: [coreFile('security/escape-html.ts'), coreFile('security/safe-url.ts'), coreFile('security/sanitize-css.ts')]
  },
  'url-sync': {
    name: 'Filtros y página sincronizados con la URL',
    files: [
      { src: 'src/core/url-sync/url-state.ts', dest: 'src/core/url-sync/url-state.ts' },
    ]
  }
};

/**
 * `devforge add <módulo…> [--vue | --react | --compose] [--force]`
 * Sin bandera, el framework se detecta (package.json / proyecto Android) y solo se instalan sus archivos.
 */
export async function addCommand(moduleKeys, options = {}) {
  const targetDir = options.cwd || process.cwd();
  const keys = [...new Set((Array.isArray(moduleKeys) ? moduleKeys : [moduleKeys]).filter(Boolean).map(k => k.toLowerCase()))];
  const unknown = keys.filter(k => !MODULE_REGISTRY[k]);

  if (!keys.length || unknown.length) {
    logger.error(keys.length ? `Módulo(s) que no existen: ${unknown.join(', ')}` : 'Indica al menos un módulo.');
    console.log(`\nMódulos disponibles (${cmd('devforge list')} los describe):`);
    console.log(`  ${Object.keys(MODULE_REGISTRY).join(', ')}`);
    process.exitCode = 1;
    return;
  }

  let framework = options.framework;
  if (!framework) {
    const detected = detectFramework(targetDir);
    framework = detected.framework || undefined;
    if (framework) {
      logger.info(`Detecté ${FRAMEWORK_LABEL[framework]} (${detected.reason}): instalo solo sus archivos. Cámbialo con --vue, --react o --compose.`);
    } else if (!options.quiet) {
      logger.warn(`No detecté el framework (${detected.reason}): instalo Vue y React. Usa --vue o --react para instalar solo uno.`);
    }
  }

  if (framework === 'compose') return addComposeModules(keys, targetDir, options);

  const ctx = installContext(targetDir, { force: !!options.force });
  const installed = new Set();
  for (const key of keys) installModule(key, ctx, framework, installed, options);
  finishInstall(ctx, logger);
  if (!process.exitCode) logger.success(`Listo: ${keys.join(', ')}${framework ? ` (${FRAMEWORK_LABEL[framework]})` : ''}`);
}

/** Rewrites source-package imports to the `@/` alias used in the target project. */
export function rewriteImports(content) {
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

/** El contenido que DEVFORGE instala para un archivo de un módulo web. */
export function webContent(src) {
  const srcPath = path.join(ROOT_DIR, src);
  return /\.(ts|tsx|vue)$/.test(srcPath)
    ? Buffer.from(rewriteImports(fs.readFileSync(srcPath, 'utf8')), 'utf8')
    : fs.readFileSync(srcPath);
}

function installModule(key, ctx, framework, installed, options) {
  if (installed.has(key)) return;
  installed.add(key);
  const mod = MODULE_REGISTRY[key];

  for (const dep of mod.requires || []) {
    if (!installed.has(dep)) logger.info(`'${key}' necesita '${dep}'.`);
    installModule(dep, ctx, framework, installed, options);
  }

  for (const f of mod.files) {
    if (framework && f.framework && f.framework !== framework) continue;
    if (!fs.existsSync(path.join(ROOT_DIR, f.src))) {
      ctx.missing.push(f.src);
      continue;
    }
    // Source modules use relative imports so this package typechecks on its own. In the target
    // project they live elsewhere, so they are rewritten to the `@/` alias (project-structure.md).
    writeOwned(ctx, f.dest, webContent(f.src), { module: key, src: f.src, transform: 'web' });
  }
  ctx.manifest.modules[key] = { framework: framework || 'vue+react' };
}

/** El contenido Kotlin de un archivo, con el paquete de la app. */
export function kotlinContent(src, pkg) {
  return Buffer.from(rewriteKotlinPackage(fs.readFileSync(path.join(ROOT_DIR, src), 'utf8'), pkg), 'utf8');
}

/**
 * `devforge add <módulo…> --compose [--package com.empresa.app] [--module app] [--source-dir …]`
 * La versión Kotlin / Jetpack Compose de cada módulo, dentro del módulo Android.
 */
function addComposeModules(keys, targetDir, options) {
  const unported = keys.filter(k => !COMPOSE_MODULES[k]);
  if (unported.length) {
    logger.error(`Sin versión Compose todavía: ${unported.join(', ')}.`);
    console.log(`\nMódulos disponibles con --compose: ${Object.keys(COMPOSE_MODULES).join(', ')}`);
    process.exitCode = 1;
    return;
  }
  const ctx = installContext(targetDir, { force: !!options.force });
  const saved = ctx.manifest.compose || {};
  const moduleDir = options.module || saved.module || 'app';
  const pkg = options.package || saved.package || detectAndroidPackage(fs, path, targetDir, moduleDir);
  if (!isValidPackage(pkg)) {
    logger.error(pkg
      ? `Paquete inválido: '${pkg}'.`
      : `No encontré el paquete de la app (namespace en ${moduleDir}/build.gradle.kts ni package en el AndroidManifest).`);
    console.log(`  Indícalo: ${cmd('devforge add <módulo> --compose --package com.empresa.app')}`);
    process.exitCode = 1;
    return;
  }
  const sourceDir = options.sourceDir || saved.sourceDir || detectSourceRoot(fs, path, targetDir, moduleDir);
  const base = path.join(sourceDir, ...pkg.split('.'));
  ctx.manifest.compose = { package: pkg, module: moduleDir, sourceDir: posix(sourceDir) };
  const deps = new Set();
  const installed = new Set();

  const install = key => {
    if (installed.has(key)) return;
    installed.add(key);
    const mod = COMPOSE_MODULES[key];
    for (const dep of mod.requires || []) {
      if (!installed.has(dep)) logger.info(`'${key}' necesita '${dep}'.`);
      install(dep);
    }
    (mod.deps || []).forEach(d => deps.add(d));
    for (const f of mod.files) {
      if (!fs.existsSync(path.join(ROOT_DIR, f.src))) {
        ctx.missing.push(f.src);
        continue;
      }
      writeOwned(ctx, path.join(base, f.dest), kotlinContent(f.src, pkg), { module: key, src: f.src, transform: 'kotlin' });
    }
    ctx.manifest.modules[key] = { framework: 'compose' };
  };

  logger.info(`Compose -> ${posix(base)} (paquete ${name(pkg)})`);
  keys.forEach(install);
  finishInstall(ctx, logger);
  if (deps.size) {
    logger.info('Dependencias de Gradle que necesitan estos módulos (con la versión de tu gradle/libs.versions.toml):');
    [...deps].forEach(d => console.log(`  - implementation("${COMPOSE_DEPENDENCIES[d]}:<versión>")`));
  }
  if (!process.exitCode) logger.success(`Listo (Compose): ${keys.join(', ')}`);
}
