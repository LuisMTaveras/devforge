import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../logger.js';

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
        const issue = rule.check(content, line, lineNum, ext);
        if (issue) {
          fileHasIssue = true;
          violations.push({
            file: path.relative(targetDir, filePath),
            line: lineNum,
            rule: issue.rule,
            message: issue.message,
            snippet: line.trim(),
          });
        }
      });
    });

    if (fileHasIssue) filesWithIssues++;
  });

  // Display Report
  console.log(`\x1b[1mArchivos escaneados:\x1b[0m ${filesToScan.length}`);

  if (violations.length === 0) {
    console.log();
    logger.success('✔ ¡AUDITORÍA IMPECABLE! Cero violaciones detectadas.');
    console.log('  - Cero arrays de datos hardcodeados');
    console.log('  - Cero colores cian/neón tipo hacker');
    console.log('  - 100% español sin Spanglish');
    console.log('  - Formatos localizados correctos\n');
    return;
  }

  console.log(`\x1b[31mProblemas encontrados:\x1b[0m ${violations.length} en ${filesWithIssues} archivo(s)\n`);

  violations.forEach((v, i) => {
    console.log(`  \x1b[31m[${i + 1}]\x1b[0m \x1b[1m${v.file}:${v.line}\x1b[0m (\x1b[33m${v.rule}\x1b[0m)`);
    console.log(`      \x1b[36mDetalle:\x1b[0m ${v.message}`);
    console.log(`      \x1b[2mCódigo:\x1b[0m  ${v.snippet.slice(0, 80)}`);
    console.log();
  });

  const healthScore = Math.max(0, Math.round(((filesToScan.length - filesWithIssues) / filesToScan.length) * 100));
  console.log(`\x1b[1mPuntuación de Salud Arquitectónica:\x1b[0m ${healthScore >= 80 ? '\x1b[32m' : '\x1b[31m'}${healthScore}%\x1b[0m\n`);
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
