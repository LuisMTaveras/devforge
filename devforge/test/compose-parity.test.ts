import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ICON_PATHS } from '../src/adapters/shared/icon-paths.ts';

// La versión Compose (Kotlin) usa los MISMOS tokens e iconos que la web. Si alguien cambia
// tokens.css o icon-paths.ts y no la versión Kotlin (o al revés), esto falla.

const tokensCss = fs.readFileSync('src/core/theme/tokens.css', 'utf8');
const themeKt = fs.readFileSync('src/adapters/compose/ui/theme/DevforgeTheme.kt', 'utf8');
const iconsKt = fs.readFileSync('src/adapters/compose/ui/components/DfIcon.kt', 'utf8');

/** OKLCH -> `0xAARRGGBB` (sRGB), como lo escribe Compose. */
function oklchToArgb(l: number, c: number, h: number, alpha: number): string {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const [L, M, S] = [l_ ** 3, m_ ** 3, s_ ** 3];
  const rgb = [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
  const gamma = (x: number) => {
    const v = Math.min(1, Math.max(0, x));
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  };
  const hex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0').toUpperCase();
  return `0x${hex(alpha)}${rgb.map(v => hex(gamma(v))).join('')}`;
}

const camel = (name: string) => name.replace(/-(\w)/g, (_, ch: string) => ch.toUpperCase());

function cssTokens(block: 'root' | 'dark'): Map<string, string> {
  const body = (block === 'root' ? /:root \{([\s\S]*?)\}/ : /\.dark \{([\s\S]*?)\}/).exec(tokensCss)?.[1] ?? '';
  const out = new Map<string, string>();
  for (const m of body.matchAll(/--([\w-]+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/g)) {
    out.set(camel(m[1]!), oklchToArgb(Number(m[2]) / 100, Number(m[3]), Number(m[4]), m[5] ? Number(m[5]) : 1));
  }
  return out;
}

function ktTokens(block: 'light' | 'dark'): Map<string, string> {
  const body = new RegExp(`// tokens:${block}:start([\\s\\S]*?)// tokens:${block}:end`).exec(themeKt)?.[1] ?? '';
  return new Map([...body.matchAll(/(\w+) = Color\((0x[0-9A-F]{8})\)/g)].map(m => [m[1]!, m[2]!]));
}

for (const [css, kt] of [['root', 'light'], ['dark', 'dark']] as const) {
  test(`compose: ${kt} tokens match tokens.css`, () => {
    const expected = cssTokens(css);
    assert.ok(expected.size >= 20, 'tokens.css parsed');
    assert.deepEqual(Object.fromEntries(ktTokens(kt)), Object.fromEntries(expected));
  });
}

test('compose: icon catalog matches icon-paths.ts', () => {
  const body = /\/\/ icons:start([\s\S]*?)\/\/ icons:end/.exec(iconsKt)?.[1] ?? '';
  const kotlin = Object.fromEntries([...body.matchAll(/(\w+)\("([^"]+)"\)/g)].map(m => [m[1]!, m[2]!]));
  const web = Object.fromEntries(
    Object.entries(ICON_PATHS).map(([name, d]) => [name.replace(/([A-Z])/g, '_$1').toUpperCase(), d]),
  );
  assert.deepEqual(kotlin, web);
});
