import fs from 'node:fs';
import path from 'node:path';
import { FRAMEWORK_LABEL } from '../detect.js';
import { cmd, colors, dim, logger, name } from '../logger.js';
import { MANIFEST_FILE, ROOT_DIR, VERSION, readManifest, sha256 } from '../manifest.js';
import { kotlinContent, webContent } from './add.js';

/** Contenido que DEVFORGE instalaría HOY para un archivo del manifiesto (`null` si ya no existe). */
function expectedContent(entry, manifest) {
  if (!entry.src || entry.src === 'agent-file' || !fs.existsSync(path.join(ROOT_DIR, entry.src))) return null;
  if (entry.transform === 'web') return webContent(entry.src);
  if (entry.transform === 'kotlin') return kotlinContent(entry.src, manifest.compose?.package);
  return fs.readFileSync(path.join(ROOT_DIR, entry.src));
}

/** `ok` · `outdated` (sin tocar, hay versión nueva) · `edited` · `missing`. */
export function fileStates(targetDir, manifest) {
  return Object.entries(manifest.files).map(([file, entry]) => {
    const abs = path.join(targetDir, file);
    if (!fs.existsSync(abs)) return { file, entry, state: 'missing' };
    const current = sha256(fs.readFileSync(abs));
    if (current !== entry.sha256) return { file, entry, state: 'edited' };
    const expected = expectedContent(entry, manifest);
    if (expected && sha256(expected) !== current) return { file, entry, state: 'outdated' };
    return { file, entry, state: 'ok' };
  });
}

function walk(dir, exts, out = [], depth = 0) {
  if (depth > 12 || !fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'build', 'dist', '.gradle', '.devforge'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out, depth + 1);
    else if (exts.some(x => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

/**
 * Lo que un módulo instalado necesita que el proyecto haga UNA vez (llamar al arranque, montar el
 * host). Se busca en el código del proyecto, sin contar los archivos que instaló DEVFORGE.
 */
export function wiringChecks(targetDir, manifest) {
  const mods = manifest.modules;
  const own = new Set(Object.keys(manifest.files).map(f => path.join(targetDir, f)));
  const compose = Object.values(mods).some(m => m.framework === 'compose');
  const files = compose
    ? walk(path.join(targetDir, manifest.compose?.sourceDir || 'app/src/main'), ['.kt'])
    : walk(path.join(targetDir, 'src'), ['.ts', '.tsx', '.js', '.jsx', '.vue']).concat(walk(targetDir, ['index.html'], [], 11).slice(0, 5));
  const code = files.filter(f => !own.has(f)).map(f => ({ f, text: fs.readFileSync(f, 'utf8') }));
  const where = re => code.find(c => re.test(c.text));
  const checks = [];
  const need = (module, label, re, hint) => {
    if (!mods[module]) return;
    const hit = where(re);
    checks.push({ module, label, ok: Boolean(hit), where: hit ? path.relative(targetDir, hit.f) : null, hint });
  };

  if (compose) {
    need('formatters', 'setFormatCountry(…) en Application.onCreate()', /\bsetFormatCountry\s*\(/, 'setFormatCountry(CountryCode.DO)');
    need('theme', 'ThemeEngine.init(…) al arrancar', /\bThemeEngine\.init\s*\(/, 'ThemeEngine.init(SharedPreferencesThemeStore(this))');
    need('theme', 'DevforgeTheme { … } en setContent', /\bDevforgeTheme\s*(\(|\{)/, 'setContent { DevforgeTheme { … } }');
    need('feedback', 'ConfirmDialogHost() en la raíz', /\bConfirmDialogHost\s*\(/, 'Box { AppNavHost(); ToastHost(); ConfirmDialogHost() }');
    need('feedback', 'ToastHost() en la raíz', /\bToastHost\s*\(/, 'Box { AppNavHost(); ToastHost(); ConfirmDialogHost() }');
    need('theme', 'ThemeSelector() (Claro / Oscuro / Sistema)', /\bThemeSelector\s*\(/, 'ThemeSelector() en Ajustes');
    return checks;
  }
  need('formatters', "setFormatCountry('…') en el punto de entrada", /\bsetFormatCountry\s*\(/, "setFormatCountry('DO') en src/main.ts");
  need('theme', 'initTheme() en el punto de entrada', /\binitTheme\s*\(/, 'initTheme() en src/main.ts');
  need('theme', 'script anti-parpadeo en index.html', /devforge-theme|THEME_INIT_SCRIPT/, 'el THEME_INIT_SCRIPT inline en <head>');
  need('feedback', '<ConfirmDialog /> montado una vez', /<ConfirmDialog\b/, '<ConfirmDialog /> en App.vue / App.tsx');
  need('feedback', '<ToastHost /> montado una vez', /<ToastHost\b/, '<ToastHost /> en App.vue / App.tsx');
  need('authorizations', '<AuthorizationDialog /> montado', /<AuthorizationDialog\b/, '<AuthorizationDialog /> + <AuthorizationAlerts /> en App');
  need('notifications', '<NotificationCenter /> en la barra', /<NotificationCenter\b/, '<NotificationCenter /> en la barra superior');
  return checks;
}

export async function statusCommand(options = {}) {
  const targetDir = options.cwd || process.cwd();
  const manifest = readManifest(targetDir);
  if (!manifest.exists) {
    logger.warn(manifest.corrupt ? `${MANIFEST_FILE} no es JSON válido.` : `Este proyecto no tiene ${MANIFEST_FILE}.`);
    console.log(`  ${cmd('devforge init')} y ${cmd('devforge add <módulo…>')} lo crean. Si los módulos se instalaron con una versión anterior,`);
    console.log(`  vuelve a correr ${cmd('devforge add <módulo…>')}: registra los archivos que siguen iguales y avisa de los que cambiaste.`);
    return { manifest, states: [], checks: [] };
  }

  const states = fileStates(targetDir, manifest);
  const checks = wiringChecks(targetDir, manifest);
  const mark = {
    ok: `${colors.green}✔${colors.reset}`,
    outdated: `${colors.cyan}↑${colors.reset}`,
    edited: `${colors.yellow}✎${colors.reset}`,
    missing: `${colors.red}✖${colors.reset}`,
  };
  const label = { ok: 'al día', outdated: 'versión nueva disponible', edited: 'editado por ti', missing: 'falta' };

  console.log(`DEVFORGE ${VERSION} ${dim(`(instalado con ${manifest.version})`)}`);
  if (manifest.init) console.log(`Contexto para agentes: ${mark.ok} .ai/ · CLAUDE.md · AGENTS.md · .cursorrules · Copilot`);

  const modules = Object.entries(manifest.modules);
  if (modules.length) {
    console.log('\nMódulos:');
    for (const [key, info] of modules) {
      const mine = states.filter(s => s.entry.module === key);
      const count = st => mine.filter(s => s.state === st).length;
      const summary = ['outdated', 'edited', 'missing'].filter(st => count(st)).map(st => `${count(st)} ${label[st]}`).join(', ') || label.ok;
      const fw = FRAMEWORK_LABEL[info.framework] || 'Vue + React';
      console.log(`  ${name(key.padEnd(15))} ${dim(fw.padEnd(26))} ${summary}`);
    }
  }

  const problems = states.filter(s => s.state !== 'ok');
  if (problems.length) {
    console.log('\nArchivos:');
    for (const s of problems) console.log(`  ${mark[s.state]} ${s.file} ${dim(`— ${label[s.state]}`)}`);
  }
  if (checks.length) {
    console.log('\nConexión (una vez por proyecto):');
    for (const c of checks) {
      console.log(c.ok ? `  ${mark.ok} ${c.label} ${dim(`(${c.where})`)}` : `  ${mark.missing} ${c.label} ${dim(`— falta: ${c.hint}`)}`);
    }
  }

  console.log();
  if (states.some(s => s.state === 'outdated' || s.state === 'missing')) {
    console.log(`${cmd('devforge update')} trae las versiones nuevas y repone lo que falta; lo que editaste se conserva.`);
  }
  if (states.some(s => s.state === 'edited')) {
    console.log(`Lo editado no se actualiza solo: ${cmd('devforge add <módulo> --force')} lo reemplaza por la versión de DEVFORGE.`);
  }
  if (!problems.length && checks.every(c => c.ok)) logger.success('Todo al día y conectado.');
  return { manifest, states, checks };
}
