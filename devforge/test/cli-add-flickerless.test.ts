import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FlickerlessController } from '../src/vendor/flickerless/core/controller.ts';

const BIN = path.resolve('bin/devforge.js');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'devforge-add-'));

test('add: installs every module named, not only the first', () => {
  const dir = tmp();
  execFileSync('node', [BIN, 'add', 'formatters', 'theme', 'errors'], { cwd: dir });
  for (const f of ['src/core/formatters/formatters.ts', 'src/core/theme/theme.ts', 'src/core/errors/api-error.ts']) {
    assert.ok(fs.existsSync(path.join(dir, f)), f);
  }
});

test('add: an unknown module fails with exit code 1', () => {
  const r = spawnSync('node', [BIN, 'add', 'formatters', 'nope'], { cwd: tmp() });
  assert.equal(r.status, 1);
});

test('add: keeps local changes unless --force', () => {
  const dir = tmp();
  execFileSync('node', [BIN, 'add', 'formatters'], { cwd: dir });
  const file = path.join(dir, 'src/core/formatters/formatters.ts');
  fs.writeFileSync(file, '// mine\n');
  execFileSync('node', [BIN, 'add', 'formatters'], { cwd: dir });
  assert.equal(fs.readFileSync(file, 'utf8'), '// mine\n');
  execFileSync('node', [BIN, 'add', 'formatters', '--force'], { cwd: dir });
  assert.notEqual(fs.readFileSync(file, 'utf8'), '// mine\n');
});

test('flickerless: a load faster than delayMs never shows the indicator', async () => {
  const seen: boolean[] = [];
  const c = new FlickerlessController({ loading: true, delayMs: 40, onStateChange: s => seen.push(s.isVisibleLoading) });
  await new Promise(r => setTimeout(r, 10));
  c.update({ loading: false });
  await new Promise(r => setTimeout(r, 60));
  assert.equal(seen.includes(true), false);
  c.destroy();
});

test('flickerless: once visible, the indicator stays at least minDurationMs', async () => {
  const c = new FlickerlessController({ loading: true, delayMs: 0, minDurationMs: 60 });
  assert.equal(c.getIsVisibleLoading(), true);
  c.update({ loading: false });
  assert.equal(c.getIsVisibleLoading(), true);
  await new Promise(r => setTimeout(r, 80));
  assert.equal(c.getIsVisibleLoading(), false);
  assert.equal(new FlickerlessController({ loading: false, error: 'x' }).getStatus(), 'error');
  c.destroy();
});
