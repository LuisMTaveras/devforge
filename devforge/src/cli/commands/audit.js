import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../logger.js';

const BASELINE_FILE = '.devforge-audit-baseline.json';

/** Comment lines explain rules; reporting them would make the rule useless. */
const isComment = line => /^\s*(\/\/|\/\*|\*|<!--)/.test(line);
const CODE = ['.vue', '.tsx', '.jsx', '.ts', '.js'];

const AUDIT_RULES = [
  {
    id: 'NO_HARDCODED_DATA',
    name: 'Zero Hardcoded Data',
    check: (content, line, lineNum, ext) => {
      if (!['.vue', '.tsx', '.jsx'].includes(ext)) return null;
      if (lineNum > 250) return null; // fixtures are usually at top of script
      const match = line.match(/(?:const|let|var)\s+\w+\s*=\s*(?:ref\()?\s*\[\s*\{/);
      if (match && !line.includes('export const columns') && !line.includes('navItems') && !line.includes('options')) {
        return {
          rule: 'Zero Hardcoded Data',
          message: 'Arreglo estático de datos incrustado en el componente en vez de usar props/servicio.',
        };
      }
      return null;
    }
  },
  {
    id: 'NO_CYBERPUNK_NEON',
    name: 'Anti-AI Cyberpunk / Neon Palette',
    check: (content, line, lineNum, ext) => {
      if (!['.vue', '.tsx', '.jsx', '.html'].includes(ext)) return null;
      const match = line.match(/\b(cyan|teal)-(?:[1-9]00|400|500)\b|#00ff[a-f0-9]{2,4}/i);
      if (match) {
        return {
          rule: 'Anti-AI Cyberpunk Palette',
          message: `Uso de color cian/teal/neón prohibido ('${match[0]}'). Usa escala Zinc/Slate.`,
        };
      }
      return null;
    }
  },
  {
    id: 'ZERO_SPANGLISH',
    name: 'Zero-Spanglish Localization',
    check: (content, line, lineNum, ext) => {
      if (!['.vue', '.tsx', '.jsx'].includes(ext)) return null;
      const match = line.match(/>\s*(Close|Save|Status|Amount|Actions|Flagged|Settled|Pending|Reversed)\s*</);
      if (match) {
        return {
          rule: 'Zero-Spanglish',
          message: `Palabra en inglés detectada en UI: '${match[1]}'. Traducir al español.`,
        };
      }
      return null;
    }
  },
  {
    id: 'DUAL_THEME',
    name: 'Mandatory Light + Dark Theme',
    check: (content, line, lineNum, ext) => {
      if (!['.vue', '.tsx', '.jsx', '.html'].includes(ext)) return null;
      if (line.includes('dark:')) return null;
      const match = line.match(/(?<![\w:-])(?:bg|text|border)-(?:white|black|(?:zinc|slate|gray|neutral|stone)-\d{2,3})\b/);
      if (match) {
        return {
          rule: 'Mandatory Light + Dark Theme',
          message: `Color fijo '${match[0]}' sin variante dark:. Usa tokens semánticos (bg-background, text-foreground, border-border) o agrega dark:.`,
        };
      }
      return null;
    }
  },
  {
    id: 'NO_SKELETON',
    name: 'Flickerless Loading (Zero Skeletons)',
    check: (content, line, lineNum, ext) => {
      if (!['.vue', '.tsx', '.jsx'].includes(ext)) return null;
      const match = line.match(/<\w*Skeleton\b|\bclass(?:Name)?="[^"]*\b(?:skeleton|animate-pulse)\b/);
      if (match) {
        return {
          rule: 'Flickerless Loading (Zero Skeletons)',
          message: `Skeleton '${match[0]}'. Usa <FlickerlessSurface> (conserva lo que había) y <FlickerlessValue> / <FlickerlessTableShell> («—» hasta saber).`,
        };
      }
      return null;
    }
  },
  {
    id: 'NATIVE_CONTROLS',
    name: 'Standard Form Controls',
    check: (content, line, lineNum, ext) => {
      if (!['.vue', '.tsx', '.jsx'].includes(ext)) return null;
      const match = line.match(/<select\b|<input[^>]*type=["{']*(?:date|datetime-local|month)\b/);
      if (match) {
        return {
          rule: 'Standard Form Controls',
          message: `Control nativo '${match[0]}' (ignora el tema). Usa <SelectField> o <DatePicker> (devforge add select | dates).`,
        };
      }
      return null;
    }
  },
  {
    id: 'NATIVE_DIALOGS',
    name: 'System Dialogs (No window.confirm)',
    check: (content, line, lineNum, ext) => {
      if (!CODE.includes(ext) || isComment(line)) return null;
      // A definition (`confirm() {`, `function alert(`) is not a call to the browser dialog.
      if (/(?:function\s+|^\s*(?:async\s+)?)(?:alert|confirm|prompt)\s*\([^)]*\)\s*[{:]/.test(line)) return null;
      const match = line.match(/(?:\bwindow\.|(?<![\w.$]))(alert|confirm|prompt)\s*\(/);
      if (match) {
        return {
          rule: 'System Dialogs (No window.confirm)',
          message: `Diálogo del navegador '${match[0]}'. Usa alertDialog / confirmDialog / promptDialog (devforge add feedback); si no interrumpe, notify().`,
        };
      }
      return null;
    }
  },
  {
    id: 'HARDCODED_CURRENCY',
    name: 'Currency Comes From the Document',
    check: (content, line, lineNum, ext, file) => {
      if (!CODE.includes(ext) || isComment(line)) return null;
      // The formatter presets ARE the source of truth for each country's currency.
      if (/core[\\/]formatters[\\/]formatters\.ts$/.test(file)) return null;
      const match = line.match(/\bcurrency:\s*['"][A-Z]{3}['"]|[!=]==?\s*['"](?:DOP|USD|COP|MXN|EUR|CLP|PEN|ARS)['"]/);
      if (match) {
        return {
          rule: 'Currency Comes From the Document',
          message: `Moneda escrita a mano '${match[0]}'. La moneda la trae el documento (factura?.moneda) o es la del proyecto (formatConfig.defaultCurrency).`,
        };
      }
      return null;
    }
  },
  {
    id: 'TS_NOCHECK',
    name: 'Strict TypeScript',
    check: (content, line, lineNum, ext) => {
      if (!CODE.includes(ext)) return null;
      if (/^\s*(\/\/|\/\*)\s*@ts-nocheck\b/.test(line)) {
        return {
          rule: 'Strict TypeScript',
          message: '@ts-nocheck apaga el compilador en todo el archivo. Quítalo y arregla lo que salga; para una línea suelta usa @ts-expect-error.',
        };
      }
      return null;
    }
  },
  {
    id: 'TIMEZONE',
    name: 'Dates in the Business Time Zone',
    check: (content, line, lineNum, ext) => {
      if (!CODE.includes(ext) || isComment(line)) return null;
      const match = line.match(/\.toLocale(?:Date|Time)String\(|timeZone:\s*['"]UTC['"]/);
      if (match) {
        return {
          rule: 'Dates in the Business Time Zone',
          message: `Fecha formateada a mano '${match[0]}' (sale en la zona del proceso, no en la del negocio). Usa formatDate() / formatTime().`,
        };
      }
      return null;
    }
  },
  {
    id: 'BACKDROP_CLOSE',
    name: 'Modals Do Not Close on Backdrop Click',
    check: (content, line, lineNum, ext) => {
      if (!['.vue', '.tsx', '.jsx'].includes(ext) || isComment(line)) return null;
      const match = line.match(/@click\.self\b|\.target\s*===\s*\w+\.currentTarget/);
      if (match) {
        return {
          rule: 'Modals Do Not Close on Backdrop Click',
          message: 'Cerrar al pulsar el telón pierde formularios a medias. Usa <ModalShell> / <DrawerShell> (devforge add overlays): se cierran con su botón o Escape.',
        };
      }
      return null;
    }
  },
  {
    id: 'UNFORMATTED_PHONE',
    name: 'Automatic Localized Formatting',
    check: (content, line, lineNum, ext) => {
      if (!['.vue', '.tsx', '.jsx'].includes(ext)) return null;
      const match = line.match(/(?:\{\{\s*|>\s*\{\s*)[\w.?]*(?:telefono|phone|celular|movil|móvil)\w*\s*\}/i);
      if (match) {
        return {
          rule: 'Automatic Localized Formatting',
          message: 'Teléfono sin formato. Usa formatPhoneNumber() -> (809) 578-1234.',
        };
      }
      return null;
    }
  },
  {
    id: 'UNFORMATTED_CURRENCY',
    name: 'Automatic Localized Formatting',
    check: (content, line, lineNum, ext) => {
      if (!['.vue', '.tsx', '.jsx'].includes(ext)) return null;
      const match = line.match(/>\s*\$\s*\{\{\s*[\w.]+\s*\}\}\s*</);
      if (match) {
        return {
          rule: 'Automatic Localized Formatting',
          message: 'Monto con signo "$" quemado a mano. Usa formatCurrency().',
        };
      }
      return null;
    }
  }
];

export async function auditCommand(options = {}) {
  const targetDir = options.cwd || process.cwd();
  logger.banner();
  logger.info(`Auditing repository for DEVFORGE compliance in: ${targetDir}\n`);

  const filesToScan = [];
  collectFiles(targetDir, filesToScan);

  if (filesToScan.length === 0) {
    logger.warn('No hay archivos .vue, .tsx, .ts, o .jsx para auditar.');
    return;
  }

  const violations = [];
  let filesWithIssues = 0;

  filesToScan.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath);
    const lines = content.split('\n');
    let fileHasIssue = false;

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      AUDIT_RULES.forEach(rule => {
        const issue = rule.check(content, line, lineNum, ext, filePath);
        if (issue) {
          fileHasIssue = true;
          violations.push({
            file: path.relative(targetDir, filePath),
            line: lineNum,
            ruleId: rule.id,
            rule: issue.rule,
            message: issue.message,
            snippet: line.trim(),
          });
        }
      });
    });

    if (fileHasIssue) filesWithIssues++;
  });

  // ── Baseline: known debt that can only SHRINK ─────────────────────────────
  // `devforge audit --baseline` records today's violations per file and rule. From then on,
  // the audit fails only on NEW violations, and every fix lowers the baseline automatically,
  // so an existing project can adopt DEVFORGE without fixing everything at once.
  const baselinePath = path.join(targetDir, BASELINE_FILE);
  const counts = countByFileRule(violations);

  if (options.baseline) {
    writeBaseline(baselinePath, counts);
    logger.success(`Línea base guardada en ${BASELINE_FILE}: ${violations.length} violación(es) conocidas.`);
    console.log('  A partir de ahora la auditoría solo falla con violaciones NUEVAS, y cada arreglo encoge la línea base.\n');
    return { violations, newViolations: [] };
  }

  const baseline = readBaseline(baselinePath);
  let newViolations = violations;
  if (baseline) {
    // Within each file+rule, the first N occurrences are covered by the baseline.
    const seen = {};
    newViolations = violations.filter(v => {
      const key = `${v.file}::${v.ruleId}`;
      seen[key] = (seen[key] || 0) + 1;
      return seen[key] > (baseline[v.file]?.[v.ruleId] || 0);
    });
    const shrunk = shrinkBaseline(baseline, counts);
    if (shrunk.removed > 0) {
      writeBaseline(baselinePath, shrunk.baseline);
      logger.success(`Línea base reducida: ${shrunk.removed} violación(es) arregladas ya no cuentan como deuda.`);
    }
  }

  console.log(`\x1b[1mArchivos escaneados:\x1b[0m ${filesToScan.length}`);
  const known = violations.length - newViolations.length;
  if (baseline && known > 0) {
    console.log(`\x1b[2mDeuda conocida (${BASELINE_FILE}):\x1b[0m ${known} violación(es); solo puede bajar.`);
  }

  if (newViolations.length === 0) {
    console.log();
    logger.success(baseline && known > 0
      ? '✔ Sin violaciones nuevas.'
      : '✔ ¡AUDITORÍA IMPECABLE! Cero violaciones detectadas.');
    if (!(baseline && known > 0)) {
      console.log('  - Cero arrays de datos hardcodeados');
      console.log('  - Cero colores cian/neón tipo hacker');
      console.log('  - Tema claro y oscuro en cada color');
      console.log('  - 100% español sin Spanglish');
      console.log('  - Formatos localizados correctos');
      console.log('  - Componentes estándar (sin skeletons, diálogos ni controles nativos)\n');
    }
    return { violations, newViolations };
  }

  const issueFiles = new Set(newViolations.map(v => v.file)).size;
  console.log(`\x1b[31mProblemas ${baseline ? 'nuevos' : 'encontrados'}:\x1b[0m ${newViolations.length} en ${issueFiles} archivo(s)\n`);

  newViolations.forEach((v, i) => {
    console.log(`  \x1b[31m[${i + 1}]\x1b[0m \x1b[1m${v.file}:${v.line}\x1b[0m (\x1b[33m${v.rule}\x1b[0m)`);
    console.log(`      \x1b[36mDetalle:\x1b[0m ${v.message}`);
    console.log(`      \x1b[2mCódigo:\x1b[0m  ${v.snippet.slice(0, 80)}`);
    console.log();
  });

  const healthScore = Math.max(0, Math.round(((filesToScan.length - filesWithIssues) / filesToScan.length) * 100));
  console.log(`\x1b[1mPuntuación de Salud Arquitectónica:\x1b[0m ${healthScore >= 80 ? '\x1b[32m' : '\x1b[31m'}${healthScore}%\x1b[0m\n`);
  if (!baseline) {
    console.log(`\x1b[2mProyecto existente: «devforge audit --baseline» guarda la deuda actual y desde ahí solo se exige que no crezca.\x1b[0m\n`);
  }
  // Non-zero exit so CI can block new violations.
  process.exitCode = 1;
  return { violations, newViolations };
}

function countByFileRule(violations) {
  const counts = {};
  for (const v of violations) {
    counts[v.file] ??= {};
    counts[v.file][v.ruleId] = (counts[v.file][v.ruleId] || 0) + 1;
  }
  return counts;
}

function readBaseline(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')).debt || {};
  } catch {
    logger.error(`${BASELINE_FILE} no es JSON válido; se ignora.`);
    return null;
  }
}

function writeBaseline(file, debt) {
  const sorted = Object.fromEntries(Object.keys(debt).sort().map(k => [k, debt[k]]));
  const body = {
    $comment: 'Deuda conocida de devforge audit por archivo y regla. Solo puede bajar: la auditoría la reduce sola al arreglar. No la subas a mano.',
    debt: sorted,
  };
  fs.writeFileSync(file, JSON.stringify(body, null, 2) + '\n', 'utf8');
}

/** Lowers each entry to today's count; never raises one. */
function shrinkBaseline(baseline, counts) {
  let removed = 0;
  const next = {};
  for (const [file, rules] of Object.entries(baseline)) {
    for (const [rule, allowed] of Object.entries(rules)) {
      const now = Math.min(allowed, counts[file]?.[rule] || 0);
      removed += allowed - now;
      if (now > 0) (next[file] ??= {})[rule] = now;
    }
  }
  return { baseline: next, removed };
}

function collectFiles(dir, fileList) {
  const ignoreDirs = ['node_modules', '.git', 'dist', '.ai', '.next', '.nuxt', 'coverage'];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!ignoreDirs.includes(entry.name)) {
          collectFiles(fullPath, fileList);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.vue', '.tsx', '.ts', '.jsx', '.js'].includes(ext) && !entry.name.endsWith('.d.ts')) {
          fileList.push(fullPath);
        }
      }
    }
  } catch {
    // Ignore permissions or missing folders
  }
}
