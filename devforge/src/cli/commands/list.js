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
    'data-formatting.md      -> Localized Currency, Number, Date, Phone & Null Fallback Rules',
    'theming.md              -> Mandatory Light + Dark themes with semantic design tokens',
    'ui-components.md        -> Flickerless, SelectField, DateField, ListPager, TableStates, ListToolbar, pickers, documents',
    'module-api.md           -> Exact API of every module (anti-hallucination source of truth)',
    'ui-ux-principles.md     -> Anti-AI Design System (UI/UX Pro Max & Zero Spanglish)',
    'project-structure.md    -> Production Greenfield Folder & File Hierarchy (Vue 3 / React)',
    'architecture-standards  -> Zero Hardcoded Data & Domain-Driven architecture',
    'typescript-rules.md     -> Strict TypeScript, Discriminated Unions & Zod schemas',
  ]);

  logger.card('Ready-to-Inject Code Modules (React & Vue)', [
    'auth       -> Silent Refresh Token Queue, tokenStorage & auth.store.ts',
    'errors     -> normalizeApiError() for Laravel, Express, NestJS, FastAPI',
    'export     -> exportToCSV() with UTF-8 BOM encoding for Excel',
    'formatters -> formatCurrency(), formatNumber(), formatDate(), formatPhoneNumber()',
    'rbac       -> Pure TS CASL-style Ability engine, <Can /> & v-can',
    'theme      -> Light/Dark tokens.css, initTheme(), useTheme() for Vue & React',
    'url-sync   -> Bidirectional URL Search Params table synchronizer',
    'flickerless-> Carga sin skeleton: FlickerlessSurface, FlickerlessValue, TableShell',
    'select     -> SelectField (.vue / .tsx): combo estándar (reemplaza <select>)',
    'dates      -> DateField, DateRangeFilter, DatePicker (.vue / .tsx) + date-range.ts',
    'pagination -> ListPager (.vue / .tsx) + pagination.ts («Mostrando 11–20 de 57»)',
    'feedback   -> ConfirmDialog + ToastHost: confirmDialog(), promptDialog(), notify()',
    'overlays   -> ModalShell, DrawerShell, RowMenu (Escape apilado, scroll bloqueado)',
    'list-states-> EmptyState, ListStaleNotice',
    'inputs     -> MoneyInput, MaskedInput (cédula, RNC, teléfono) + input-masks.ts',
    'batch      -> BatchProgressModal + createBatchTracker() («3 de 10»)',
    'authorizations -> Interceptor del 403 + AuthorizationDialog + AuthorizationAlerts',
    'notifications  -> NotificationCenter (la campana) + avisos de escritorio',
    'shells     -> CardShell, DetailShell, TableStates (carga en frío y estados de tabla)',
    'list-toolbar -> ListToolbar, ListTabs, SearchInput, HistoryPeriodFilter',
    'list-cache -> useCachedList + createTabCache (la lista se conserva al navegar)',
    'excel      -> downloadExcelReport() tipado, totales sin mezclar monedas',
    'pickers    -> RecordPickerModal (buscar cliente / artículo en el servidor)',
    'command-palette -> CommandPalette ⌘K (pantallas + registros)',
    'documents  -> DocumentPreviewModal + openPdfInNewTab (con la sesión)',
    'field-help -> FieldHelp (la ayuda «?» de un campo, también en táctil)',
    'app-update -> installAppUpdates (versión nueva sin perder trabajo)',
    'security   -> escapeHtml, safeLinkUrl, sanitizeTenantCss',
  ]);

  console.log('To add any module to your current project:');
  console.log('  \x1b[32mdevforge add auth\x1b[0m         -> Injects auth engine and store');
  console.log('  \x1b[32mdevforge add errors\x1b[0m       -> Injects API error normalizer');
  console.log('  \x1b[32mdevforge add export\x1b[0m       -> Injects CSV/Excel export engine');
  console.log('  \x1b[32mdevforge add formatters\x1b[0m   -> Injects localized formatting engine');
  console.log('  \x1b[32mdevforge add rbac\x1b[0m         -> Injects permissions engine');
  console.log('  \x1b[32mdevforge add theme\x1b[0m        -> Injects light/dark theme engine & tokens');
  console.log('  \x1b[32mdevforge add url-sync\x1b[0m     -> Injects URL state synchronizer');
  console.log('  \x1b[32mdevforge add flickerless\x1b[0m  -> Injects skeleton-free loading (Vue & React)');
  console.log('  \x1b[32mdevforge add select\x1b[0m       -> Injects the standard combo (Vue & React)');
  console.log('  \x1b[32mdevforge add dates\x1b[0m        -> Injects date picker & period filter (Vue & React)');
  console.log('  \x1b[32mdevforge add pagination\x1b[0m   -> Injects the standard list pager (Vue & React)');
  console.log('  \x1b[32mdevforge add feedback\x1b[0m     -> Injects system dialogs and toasts (Vue & React)');
  console.log('  \x1b[32mdevforge add overlays\x1b[0m     -> Injects modal, side panel and row menu (Vue & React)');
  console.log('  \x1b[32mdevforge add list-states\x1b[0m  -> Injects empty state and stale-list notice (Vue & React)');
  console.log('  \x1b[32mdevforge add inputs\x1b[0m       -> Injects money and masked inputs (Vue & React)');
  console.log('  \x1b[32mdevforge add batch\x1b[0m        -> Injects live batch progress (Vue & React)');
  console.log('  \x1b[32mdevforge add authorizations\x1b[0m -> Injects the sign-off flow (Vue & React; backend: blueprint 08)');
  console.log('  \x1b[32mdevforge add notifications\x1b[0m  -> Injects the notification bell (Vue & React; backend: blueprint 09)');
  console.log('  \x1b[32mdevforge add shells list-toolbar list-cache\x1b[0m -> Listings: states, toolbar, cache across navigation');
  console.log('  \x1b[32mdevforge add excel documents\x1b[0m -> Excel reports (backend: blueprint 10) and document preview / print');
  console.log('  \x1b[32mdevforge add pickers command-palette field-help\x1b[0m -> Record picker, ⌘K, field help');
  console.log('  \x1b[32mdevforge add app-update security\x1b[0m -> New versions without losing work; third-party data in HTML / links / CSS\n');

  console.log('To audit your project for AI compliance:');
  console.log('  \x1b[32mdevforge audit\x1b[0m            -> Scans code for hardcoded arrays, neon colors, and Spanglish');
  console.log('  \x1b[32mdevforge audit --baseline\x1b[0m -> Records today\'s debt; later runs fail only on new violations\n');
}
