/**
 * Kotlin / Jetpack Compose versions of the DEVFORGE modules (`devforge add <module> --compose`).
 *
 * Sources live in src/adapters/compose under the `devforge` package; on install the package is
 * rewritten to the app's (`com.empresa.app.core.formatters`) and each file lands under the
 * module's source root (`app/src/main/java/com/empresa/app/...`).
 * Modules that only make sense in a browser (excel, documents, app-update, url-sync…) have no
 * Compose version: the CLI says so instead of installing something half-made.
 */

const kt = p => ({ src: `src/adapters/compose/${p}`, dest: p });

const THEME = [
  kt('core/theme/ThemeEngine.kt'),
  kt('core/theme/SharedPreferencesThemeStore.kt'),
  kt('ui/theme/DevforgeTheme.kt'),
  kt('ui/components/DfIcon.kt'),
  kt('ui/components/Controls.kt'),
  kt('ui/components/ThemeSelector.kt'),
];
const OVERLAYS = kt('ui/components/Overlays.kt');

/** Gradle coordinates each module needs beyond Compose + Material 3. */
export const COMPOSE_DEPENDENCIES = {
  coroutines: 'org.jetbrains.kotlinx:kotlinx-coroutines-core',
  serialization: 'org.jetbrains.kotlinx:kotlinx-serialization-json',
};

export const COMPOSE_MODULES = {
  formatters: { files: [kt('core/formatters/Formatters.kt'), kt('core/formatters/InputMasks.kt')] },
  theme: { files: THEME, deps: ['coroutines'] },
  errors: { files: [kt('core/errors/ApiError.kt')], deps: ['serialization'] },
  rbac: { files: [kt('core/permissions/Ability.kt'), kt('ui/components/Can.kt')] },
  flickerless: { requires: ['theme'], files: [kt('ui/flickerless/Flickerless.kt')] },
  select: { requires: ['theme'], files: [kt('ui/components/SelectField.kt')] },
  overlays: { requires: ['theme'], files: [OVERLAYS] },
  dates: { requires: ['theme', 'select', 'overlays'], files: [kt('core/dates/DateRange.kt'), kt('ui/components/Dates.kt')] },
  pagination: {
    requires: ['theme', 'formatters', 'flickerless', 'overlays'],
    files: [kt('core/pagination/Pagination.kt'), kt('ui/components/ListPager.kt')],
  },
  feedback: {
    requires: ['theme', 'overlays'],
    files: [kt('core/feedback/Dialog.kt'), kt('core/feedback/Toast.kt'), kt('ui/components/Feedback.kt')],
    deps: ['coroutines'],
  },
  'list-states': { requires: ['theme', 'flickerless'], files: [kt('ui/components/ListStates.kt')] },
  shells: { requires: ['theme', 'flickerless'], files: [kt('ui/components/ListStates.kt')] },
  inputs: { requires: ['theme', 'formatters'], files: [kt('ui/components/Inputs.kt')] },
  batch: {
    requires: ['overlays', 'formatters', 'errors'],
    files: [kt('core/batch/BatchProgress.kt'), kt('ui/components/BatchProgressModal.kt')],
    deps: ['coroutines'],
  },
  'list-toolbar': {
    requires: ['theme', 'formatters', 'flickerless', 'dates'],
    files: [kt('ui/components/ListToolbar.kt'), kt('ui/components/SearchInput.kt')],
  },
  'list-cache': { files: [kt('core/listcache/DocumentChanges.kt'), kt('core/listcache/TabCache.kt')] },
  pickers: {
    requires: ['theme', 'overlays', 'list-states', 'errors', 'flickerless'],
    files: [kt('core/search/RecordSearch.kt'), kt('ui/components/SearchInput.kt'), kt('ui/components/RecordPickerModal.kt')],
    deps: ['coroutines'],
  },
  'field-help': { requires: ['theme'], files: [kt('ui/components/FieldHelp.kt')] },
  security: { files: [kt('core/security/SafeUrl.kt')] },
};

/** `devforge` package of the sources -> the app's package, in package lines, imports and FQNs. */
export function rewriteKotlinPackage(content, pkg) {
  return content.replace(/\bdevforge\.(core|ui)\b/g, `${pkg}.$1`);
}

const PKG_RE = /^[a-zA-Z_][\w]*(\.[a-zA-Z_][\w]*)+$/;

export function isValidPackage(pkg) {
  return typeof pkg === 'string' && PKG_RE.test(pkg);
}

/**
 * The app's package: `--package`, else the Android module's `namespace` (build.gradle[.kts]),
 * else the manifest's `package` attribute.
 */
export function detectAndroidPackage(fs, path, targetDir, moduleDir = 'app') {
  const read = f => {
    const p = path.join(targetDir, moduleDir, f);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  };
  const gradle = read('build.gradle.kts') + '\n' + read('build.gradle');
  const fromGradle = gradle.match(/\bnamespace\s*=?\s*["']([\w.]+)["']/);
  if (fromGradle) return fromGradle[1];
  const manifest = read('src/main/AndroidManifest.xml').match(/\bpackage\s*=\s*"([\w.]+)"/);
  return manifest ? manifest[1] : null;
}

/** `app/src/main/kotlin` if the module uses it, else the classic `app/src/main/java`. */
export function detectSourceRoot(fs, path, targetDir, moduleDir = 'app') {
  const kotlinRoot = path.join(moduleDir, 'src/main/kotlin');
  return fs.existsSync(path.join(targetDir, kotlinRoot)) ? kotlinRoot : path.join(moduleDir, 'src/main/java');
}
