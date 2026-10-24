import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BIN = path.resolve('bin/devforge.js');

function androidApp(gradle = 'android {\n    namespace = "com.empresa.ventas"\n}\n'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devforge-compose-'));
  fs.mkdirSync(path.join(dir, 'app'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'app/build.gradle.kts'), gradle);
  return dir;
}

const kotlinFiles = (dir: string): string[] =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter(f => f.endsWith('.kt')).sort()
    : [];

test('add --compose: installs under the app namespace and rewrites the package', () => {
  const dir = androidApp();
  execFileSync('node', [BIN, 'add', 'pagination', '--compose'], { cwd: dir });
  const base = path.join(dir, 'app/src/main/java/com/empresa/ventas');
  const pager = fs.readFileSync(path.join(base, 'ui/components/ListPager.kt'), 'utf8');
  assert.match(pager, /^package com\.empresa\.ventas\.ui\.components$/m);
  assert.match(pager, /^import com\.empresa\.ventas\.core\.pagination\.pageState$/m);
  assert.doesNotMatch(pager, /\bdevforge\.(?:core|ui)\./);
  // `requires` se instala solo: tema, formateadores, flickerless y overlays.
  for (const f of ['ui/theme/DevforgeTheme.kt', 'core/formatters/Formatters.kt', 'ui/flickerless/Flickerless.kt', 'ui/components/Overlays.kt']) {
    assert.ok(fs.existsSync(path.join(base, f)), f);
  }
  // Ningún archivo de la web entra en un proyecto Android.
  assert.equal(fs.existsSync(path.join(dir, 'src')), false);
});

test('add --compose: --package wins and app/src/main/kotlin is used when present', () => {
  const dir = androidApp('android {}\n');
  fs.mkdirSync(path.join(dir, 'app/src/main/kotlin'), { recursive: true });
  execFileSync('node', [BIN, 'add', 'formatters', '--compose', '--package', 'do.empresa.app'], { cwd: dir });
  assert.deepEqual(kotlinFiles(path.join(dir, 'app/src/main/kotlin/do/empresa/app')), [
    'core/formatters/Formatters.kt',
    'core/formatters/InputMasks.kt',
  ]);
});

test('add --compose: without a package it fails instead of guessing', () => {
  const r = spawnSync('node', [BIN, 'add', 'formatters', '--compose'], { cwd: androidApp('android {}\n'), encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /--package/);
});

test('add --compose: a module without a Compose version fails with exit code 1', () => {
  const r = spawnSync('node', [BIN, 'add', 'excel', '--compose'], { cwd: androidApp(), encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /Sin versión Compose/);
});

test('add --compose: keeps local changes unless --force', () => {
  const dir = androidApp();
  execFileSync('node', [BIN, 'add', 'formatters', '--compose'], { cwd: dir });
  const file = path.join(dir, 'app/src/main/java/com/empresa/ventas/core/formatters/Formatters.kt');
  fs.writeFileSync(file, '// mío\n');
  execFileSync('node', [BIN, 'add', 'formatters', '--compose'], { cwd: dir });
  assert.equal(fs.readFileSync(file, 'utf8'), '// mío\n');
  execFileSync('node', [BIN, 'add', 'formatters', '--compose', '--force'], { cwd: dir });
  assert.notEqual(fs.readFileSync(file, 'utf8'), '// mío\n');
});

test('add without --compose never installs Kotlin', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devforge-web-'));
  execFileSync('node', [BIN, 'add', 'pagination', 'feedback'], { cwd: dir });
  assert.deepEqual(kotlinFiles(dir), []);
  assert.ok(fs.existsSync(path.join(dir, 'src/shared/components/ListPager.vue')));
});
