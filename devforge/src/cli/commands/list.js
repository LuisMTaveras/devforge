import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');

export function listCommand() {
  logger.banner();
  logger.info('Available Battle-Tested DEVFORGE Blueprints & Modules:\n');

  const blueprintsSrc = path.join(ROOT_DIR, 'src/blueprints');
  if (fs.existsSync(blueprintsSrc)) {
    const files = fs.readdirSync(blueprintsSrc).filter(f => f.endsWith('.md'));
    files.forEach((file, index) => {
      const content = fs.readFileSync(path.join(blueprintsSrc, file), 'utf8');
      const firstLine = content.split('\n')[0].replace(/^#\s*/, '').trim();
      const goalMatch = content.match(/## 🎯 Goal\s+([^\n]+)/);
      const goal = goalMatch ? goalMatch[1].trim() : '';

      console.log(`  \x1b[36m[${index + 1}]\x1b[0m \x1b[1m${firstLine}\x1b[0m`);
      if (goal) {
        console.log(`      \x1b[2m${goal}\x1b[0m`);
      }
      console.log(`      File: .ai/blueprints/${file}\n`);
    });
  }

  logger.card('Standards & Governance Protocols (.ai/standards/)', [
    'project-kickoff.md      -> Step 0: Developer Calibration, Stack Advisory & Scoping',
    'data-formatting.md      -> Localized Currency, Date, Phone & Null Fallback Rules',
    'ui-ux-principles.md     -> Anti-AI Design System (UI/UX Pro Max & Zero Spanglish)',
    'project-structure.md    -> Production Greenfield Folder & File Hierarchy (Vue 3 / React)',
    'architecture-standards  -> Zero Hardcoded Data & Domain-Driven architecture',
    'typescript-rules.md     -> Strict TypeScript, Discriminated Unions & Zod schemas',
  ]);

  logger.card('Ready-to-Inject Code Modules (React & Vue)', [
    'auth       -> Silent Refresh Token Queue, tokenStorage & auth.store.ts',
    'errors     -> normalizeApiError() for Laravel, Express, NestJS, FastAPI',
    'export     -> exportToCSV() with UTF-8 BOM encoding for Excel',
    'formatters -> formatCurrency(), formatDate(), formatPhoneNumber()',
    'rbac       -> Pure TS CASL-style Ability engine, <Can /> & v-can',
    'url-sync   -> Bidirectional URL Search Params table synchronizer',
  ]);

  console.log('To add any module to your current project:');
  console.log('  \x1b[32mdevforge add auth\x1b[0m         -> Injects auth engine and store');
  console.log('  \x1b[32mdevforge add errors\x1b[0m       -> Injects API error normalizer');
  console.log('  \x1b[32mdevforge add export\x1b[0m       -> Injects CSV/Excel export engine');
  console.log('  \x1b[32mdevforge add formatters\x1b[0m   -> Injects localized formatting engine');
  console.log('  \x1b[32mdevforge add rbac\x1b[0m         -> Injects permissions engine');
  console.log('  \x1b[32mdevforge add url-sync\x1b[0m     -> Injects URL state synchronizer\n');

  console.log('To audit your project for AI compliance:');
  console.log('  \x1b[32mdevforge audit\x1b[0m            -> Scans code for hardcoded arrays, neon colors, and Spanglish\n');
}
