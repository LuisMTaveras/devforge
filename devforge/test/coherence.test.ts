import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { MODULE_REGISTRY } from '../src/cli/commands/add.js';
import { COMPOSE_MODULES } from '../src/cli/commands/compose-modules.js';

// La lista de módulos, las copias de las plantillas y los números de la documentación se mantienen
// a mano en varios sitios. Esto falla cuando uno se queda atrás.

const REPO = path.resolve('..');
const read = (f: string) => fs.readFileSync(f, 'utf8');
const modules = Object.keys(MODULE_REGISTRY);

test('coherence: every module is documented in module-api.md and docs/modulos.md', () => {
  const api = read('src/ai-templates/standards/module-api.md');
  const catalog = read(path.join(REPO, 'docs/modulos.md'));
  for (const key of modules) {
    assert.match(api, new RegExp(`devforge add ${key}\\b`), `module-api.md: ${key}`);
    assert.match(catalog, new RegExp(`devforge add ${key}\\b`), `docs/modulos.md: ${key}`);
  }
});

test('coherence: devforge list shows every module and marks the Android ones', () => {
  const out = spawnSync('node', ['bin/devforge.js', 'list'], { encoding: 'utf8' }).stdout;
  for (const key of modules) assert.match(out, new RegExp(`▸ ${key}\\s`), key);
  for (const key of Object.keys(COMPOSE_MODULES)) {
    assert.ok(MODULE_REGISTRY[key], `compose module '${key}' is not in MODULE_REGISTRY`);
    assert.match(out, new RegExp(`▸ ${key}\\s.*· Android`), key);
  }
});

test('coherence: the copies at the repo root match src/ai-templates', () => {
  const pairs: Array<[string, string]> = [
    ['src/ai-templates/CLAUDE.md', 'CLAUDE.md'],
    ['src/ai-templates/CLAUDE.md', '.ai/CLAUDE.md'],
    ['src/ai-templates/AGENTS.md', 'AGENTS.md'],
    ['src/ai-templates/AGENTS.md', '.ai/AGENTS.md'],
    ['src/ai-templates/.cursorrules', '.cursorrules'],
    ['src/ai-templates/.cursorrules', '.ai/.cursorrules'],
    ['src/ai-templates/copilot-instructions.md', '.github/copilot-instructions.md'],
    ['src/ai-templates/copilot-instructions.md', '.ai/copilot-instructions.md'],
    ['src/slash-commands/claude/devforge.md', '.claude/commands/devforge.md'],
    ['src/slash-commands/claude/kickoff.md', '.claude/commands/kickoff.md'],
    ['src/slash-commands/antigravity/SKILL.md', '.agents/skills/devforge/SKILL.md'],
  ];
  for (const dir of ['standards', 'blueprints']) {
    const src = dir === 'standards' ? 'src/ai-templates/standards' : 'src/blueprints';
    for (const f of fs.readdirSync(src)) pairs.push([`${src}/${f}`, `.ai/${dir}/${f}`]);
    assert.deepEqual(fs.readdirSync(path.join(REPO, '.ai', dir)).sort(), fs.readdirSync(src).sort(), `.ai/${dir}`);
  }
  for (const [src, copy] of pairs) assert.equal(read(path.join(REPO, copy)), read(src), `${copy} differs from devforge/${src}`);
});

test('coherence: the blueprint count in the docs is the real one', () => {
  const real = fs.readdirSync('src/blueprints').filter(f => f.endsWith('.md')).length;
  for (const file of [path.join(REPO, 'README.md'), 'README.md']) {
    for (const m of read(file).matchAll(/\b(\d+) [Bb]lueprints\b/g)) assert.equal(Number(m[1]), real, `${file}: «${m[0]}»`);
  }
});

test('coherence: the CLI talks Spanish (no English status words left)', () => {
  const sources = ['bin/devforge.js', ...fs.readdirSync('src/cli/commands').map(f => `src/cli/commands/${f}`), 'src/cli/manifest.js'];
  for (const f of sources) {
    for (const word of ['Created:', 'Updated:', 'Module(s) ready', 'Kept ', 'Injecting', 'Usage:', 'not recognized']) {
      assert.ok(!read(f).includes(word), `${f}: '${word}'`);
    }
  }
});
