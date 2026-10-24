import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditCommand } from '../src/cli/commands/audit.js';

const BAD = '<button>Save</button>\n';

function project(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devforge-audit-scope-'));
  for (const [name, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), body);
  }
  return dir;
}

async function files(dir: string): Promise<string[]> {
  const log = console.log;
  console.log = () => {};
  try {
    const { violations } = (await auditCommand({ cwd: dir })) ?? { violations: [] };
    return [...new Set(violations.map(v => v.file.split(path.sep).join('/')))].sort();
  } finally {
    console.log = log;
    process.exitCode = 0;
  }
}

test('audit: tests, mocks and fixtures are not screens', async () => {
  const dir = project({
    'src/Pantalla.vue': BAD,
    'src/Pantalla.spec.tsx': BAD,
    'tests/e2e.vue': BAD,
    'src/mocks/handlers.tsx': BAD,
    'src/__tests__/a.vue': BAD,
  });
  assert.deepEqual(await files(dir), ['src/Pantalla.vue']);
});

test('audit: includeTests brings the tests back', async () => {
  const dir = project({ 'src/Pantalla.spec.tsx': BAD, 'devforge.config.json': '{ "audit": { "includeTests": true } }' });
  assert.deepEqual(await files(dir), ['src/Pantalla.spec.tsx']);
});

test('audit: respects .gitignore (also nested) and devforge.config.json ignore', async () => {
  const dir = project({
    '.gitignore': 'generated/\n*.gen.vue\n',
    'tools/.gitignore': 'out/\n',
    'generated/A.vue': BAD,
    'src/B.gen.vue': BAD,
    'tools/out/C.vue': BAD,
    'legacy/D.vue': BAD,
    'src/E.vue': BAD,
    'devforge.config.json': '{ "audit": { "ignore": ["legacy/**"] } }',
  });
  assert.deepEqual(await files(dir), ['src/E.vue']);
});

test('audit: devforge-ignore needs a reason, on the line or the one above', async () => {
  const dir = project({
    'src/A.vue': '<button>Save</button> <!-- devforge-ignore: texto del logo del cliente -->\n',
    'src/B.vue': '<!-- devforge-ignore: nombre de marca registrado -->\n<button>Save</button>\n',
    'src/C.vue': '<button>Save</button> <!-- devforge-ignore -->\n',
  });
  assert.deepEqual(await files(dir), ['src/C.vue']);
});
