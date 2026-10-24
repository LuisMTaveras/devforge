import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BIN = path.resolve('bin/devforge.js');
const VERSION = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const run = (dir: string, ...args: string[]) => spawnSync('node', [BIN, ...args], { cwd: dir, encoding: 'utf8' });
const tmp = (files: Record<string, string> = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devforge-life-'));
  for (const [f, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), body);
  }
  return dir;
};
const read = (dir: string, f: string) => fs.readFileSync(path.join(dir, f), 'utf8');
const manifest = (dir: string) => JSON.parse(read(dir, '.devforge/manifest.json'));
const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const VUE = { 'package.json': JSON.stringify({ dependencies: { vue: '^3.5.0' } }) };

// ── CLI ───────────────────────────────────────────────────────────────────────

test('cli: an unknown command fails with exit code 1', () => {
  const r = run(tmp(), 'instalar');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Comando desconocido/);
});

test('cli: --version prints the package version', () => {
  assert.equal(run(tmp(), '--version').stdout.trim(), VERSION);
});

test('cli: add prints no banner and no color codes outside a terminal', () => {
  const out = run(tmp(VUE), 'add', 'formatters').stdout;
  assert.doesNotMatch(out, /██/);
  assert.doesNotMatch(out, /\x1b\[/);
});

// ── init ──────────────────────────────────────────────────────────────────────

test('init: keeps the project CLAUDE.md and adds the DEVFORGE block once', () => {
  const dir = tmp({ 'CLAUDE.md': '# Mis reglas propias\n\nUsamos Prisma.\n' });
  execFileSync('node', [BIN, 'init'], { cwd: dir });
  execFileSync('node', [BIN, 'init'], { cwd: dir });
  const text = read(dir, 'CLAUDE.md');
  assert.ok(text.startsWith('# Mis reglas propias\n\nUsamos Prisma.'));
  assert.equal(text.match(/devforge:start/g)?.length, 1);
  assert.match(text, /MANDATORY PRE-FLIGHT CHECKLIST/);
  // La copia de referencia es entera de DEVFORGE.
  assert.match(read(dir, '.ai/CLAUDE.md'), /^# ⚡ DEVFORGE/);
});

test('init: a new project gets the plain files and a manifest', () => {
  const dir = tmp();
  execFileSync('node', [BIN, 'init'], { cwd: dir });
  assert.match(read(dir, 'CLAUDE.md'), /^# ⚡ DEVFORGE/);
  assert.doesNotMatch(read(dir, 'CLAUDE.md'), /devforge:start/);
  const m = manifest(dir);
  assert.equal(m.init, true);
  assert.ok(m.files['.ai/standards/compose.md']);
  assert.equal(fs.readdirSync(path.join(dir, '.ai/blueprints')).length, fs.readdirSync('src/blueprints').length);
});

test('init: an edited DEVFORGE file from an older version is kept; --force keeps a .bak', () => {
  const dir = tmp({ 'AGENTS.md': '# ⚡ DEVFORGE AGENTS (versión vieja, editada)\n' });
  const r = run(dir, 'init');
  assert.equal(read(dir, 'AGENTS.md'), '# ⚡ DEVFORGE AGENTS (versión vieja, editada)\n');
  assert.match(r.stdout, /no están en \.devforge\/manifest\.json/);
  execFileSync('node', [BIN, 'init', '--force'], { cwd: dir });
  assert.equal(read(dir, 'AGENTS.md.bak'), '# ⚡ DEVFORGE AGENTS (versión vieja, editada)\n');
  assert.equal(read(dir, 'AGENTS.md'), fs.readFileSync('src/ai-templates/AGENTS.md', 'utf8'));
});

// ── add: framework y registro ─────────────────────────────────────────────────

test('add: a Vue project gets only the Vue files', () => {
  const dir = tmp(VUE);
  const r = run(dir, 'add', 'select');
  assert.match(r.stdout, /Detecté Vue/);
  assert.ok(fs.existsSync(path.join(dir, 'src/shared/components/SelectField.vue')));
  assert.equal(fs.existsSync(path.join(dir, 'src/shared/components/SelectField.tsx')), false);
  assert.equal(fs.existsSync(path.join(dir, 'src/shared/hooks/useTheme.ts')), false);
  assert.equal(manifest(dir).modules.select.framework, 'vue');
});

test('add: a React project gets only the React files', () => {
  const dir = tmp({ 'package.json': JSON.stringify({ dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' } }) });
  execFileSync('node', [BIN, 'add', 'select'], { cwd: dir });
  assert.ok(fs.existsSync(path.join(dir, 'src/shared/components/SelectField.tsx')));
  assert.equal(fs.existsSync(path.join(dir, 'src/shared/components/SelectField.vue')), false);
});

test('add: an Android project gets the Compose version without --compose', () => {
  const dir = tmp({ 'app/build.gradle.kts': 'android {\n    namespace = "com.empresa.ventas"\n}\n' });
  execFileSync('node', [BIN, 'add', 'formatters'], { cwd: dir });
  assert.ok(fs.existsSync(path.join(dir, 'app/src/main/java/com/empresa/ventas/core/formatters/Formatters.kt')));
  assert.equal(manifest(dir).compose.package, 'com.empresa.ventas');
});

test('add: an untouched old version is updated; an edited file is kept and named as edited', () => {
  const dir = tmp(VUE);
  execFileSync('node', [BIN, 'add', 'formatters'], { cwd: dir });
  const old = 'src/core/formatters/formatters.ts';
  const edited = 'src/core/formatters/input-masks.ts';
  // Simula una versión anterior de DEVFORGE sin tocar: el archivo y su hash registrado coinciden.
  const m = manifest(dir);
  fs.writeFileSync(path.join(dir, old), '// versión vieja\n');
  m.files[old].sha256 = sha('// versión vieja\n');
  fs.writeFileSync(path.join(dir, '.devforge/manifest.json'), JSON.stringify(m));
  // Y otro archivo que el usuario editó.
  fs.appendFileSync(path.join(dir, edited), '// mío\n');

  const r = run(dir, 'add', 'formatters');
  assert.notEqual(read(dir, old), '// versión vieja\n');
  assert.match(r.stdout, /Actualizado: src\/core\/formatters\/formatters\.ts/);
  assert.match(read(dir, edited), /\/\/ mío\n$/);
  assert.match(r.stdout, /que editaste/);
});

test('add: files installed before the manifest are kept and reported as unknown', () => {
  const dir = tmp({ ...VUE, 'src/core/formatters/formatters.ts': '// instalado con una versión sin registro\n' });
  const r = run(dir, 'add', 'formatters');
  assert.equal(read(dir, 'src/core/formatters/formatters.ts'), '// instalado con una versión sin registro\n');
  assert.match(r.stdout, /no sé si los editaste/);
});

// ── status / update ───────────────────────────────────────────────────────────

test('status: names edited and missing files and the wiring that is missing', () => {
  const dir = tmp({ ...VUE, 'src/main.ts': "setFormatCountry('DO')\n" });
  execFileSync('node', [BIN, 'add', 'formatters', 'theme', 'feedback'], { cwd: dir });
  fs.appendFileSync(path.join(dir, 'src/core/feedback/toast.ts'), '// mío\n');
  fs.rmSync(path.join(dir, 'src/core/feedback/dialog.ts'));
  const out = run(dir, 'status').stdout;
  assert.match(out, /src\/core\/feedback\/toast\.ts — editado por ti/);
  assert.match(out, /src\/core\/feedback\/dialog\.ts — falta/);
  assert.match(out, /✔ setFormatCountry\('…'\) en el punto de entrada \(src\/main\.ts\)/);
  assert.match(out, /✖ initTheme\(\) en el punto de entrada/);
  assert.match(out, /✖ <ConfirmDialog \/> montado una vez/);
});

test('update: restores what is missing and keeps what you edited', () => {
  const dir = tmp(VUE);
  execFileSync('node', [BIN, 'add', 'feedback'], { cwd: dir });
  fs.rmSync(path.join(dir, 'src/core/feedback/dialog.ts'));
  fs.appendFileSync(path.join(dir, 'src/core/feedback/toast.ts'), '// mío\n');
  execFileSync('node', [BIN, 'update'], { cwd: dir });
  assert.ok(fs.existsSync(path.join(dir, 'src/core/feedback/dialog.ts')));
  assert.match(read(dir, 'src/core/feedback/toast.ts'), /\/\/ mío\n$/);
  assert.equal(fs.existsSync(path.join(dir, 'src/shared/components/ConfirmDialog.tsx')), false);
});

test('update: without a manifest it says so and fails', () => {
  const r = run(tmp(), 'update');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /No hay \.devforge\/manifest\.json/);
});
