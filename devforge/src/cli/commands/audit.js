import fs from 'node:fs';
import path from 'node:path';
import { colors, logger } from '../logger.js';

const BASELINE_FILE = '.devforge-audit-baseline.json';

/** Comment lines explain rules; reporting them would make the rule useless. */
const isComment = line => /^\s*(\/\/|\/\*|\*|<!--)/.test(line);
const CODE = ['.vue', '.tsx', '.jsx', '.ts', '.js'];

/**
 * Kotlin / Compose files installed by `devforge add --compose`: they ARE the single gate (the theme
 * defines the colors, Overlays.kt the only Dialog, Formatters.kt the only NumberFormat), so the
 * Kotlin rules that ban those calls in screens do not apply to them.
 */
const DEVFORGE_KOTLIN = new Set([
  'Formatters.kt', 'InputMasks.kt', 'DateRange.kt', 'ApiError.kt', 'Dialog.kt', 'Toast.kt', 'ThemeEngine.kt',
  'SharedPreferencesThemeStore.kt', 'DevforgeTheme.kt', 'DfIcon.kt', 'Controls.kt', 'ThemeSelector.kt', 'Flickerless.kt',
  'SelectField.kt', 'Overlays.kt', 'Dates.kt', 'ListPager.kt', 'Feedback.kt', 'ListStates.kt', 'Inputs.kt',
  'BatchProgressModal.kt', 'ListToolbar.kt', 'SearchInput.kt', 'RecordPickerModal.kt', 'FieldHelp.kt', 'SafeUrl.kt',
]);
const ownKotlin = file => DEVFORGE_KOTLIN.has(path.basename(file || ''));
const kotlinRule = (id, name, pattern, message, { own = false } = {}) => ({
  id,
  name,
  check: (content, line, lineNum, ext, file) => {
    if (ext !== '.kt' || isComment(line) || (!own && ownKotlin(file))) return null;
    const match = line.match(pattern);
    return match ? { rule: name, message: message(match[0].trim()) } : null;
  },
});

const KOTLIN_RULES = [
  kotlinRule(
    'KT_HARDCODED_COLOR',
    'Mandatory Light + Dark Theme',
    /\bColor\(\s*0x[0-9A-Fa-f]{6,8}\s*\)|\bColor\.(?:White|Black|Red|Blue|Green|Cyan|Yellow|Magenta|Gray|DarkGray|LightGray)\b/,
    m => `Color fijo '${m}': no cambia con Claro / Oscuro. Usa DevforgeTheme.colors (surface, foreground, mutedForeground, border, primary, success / warning / danger).`,
  ),
  kotlinRule(
    'KT_SKELETON',
    'Flickerless Loading (Zero Skeletons)',
    /\bshimmer\b|\.placeholder\(|\b\w*Skeleton\w*\s*\(|\bCircularProgressIndicator\s*\(/i,
    m => `'${m}': skeleton o spinner. Usa FlickerlessSurface (conserva lo que había y corre una barra de 2 dp) y FlickerlessValue («—» hasta saber) (devforge add flickerless --compose).`,
  ),
  kotlinRule(
    'KT_SYSTEM_DIALOGS',
    'System Dialogs and Toasts',
    /\b(?:AlertDialog|BasicAlertDialog|ModalBottomSheet|Dialog)\s*\(|\bToast\.makeText\b|\bSnackbarHost\s*\(/,
    m => `'${m}' armado en la pantalla. Decidir: confirmDialog() / promptDialog(); avisar: notify(); contenido propio: ModalShell / DrawerShell (devforge add feedback overlays --compose).`,
  ),
  kotlinRule(
    'KT_NATIVE_CONTROLS',
    'Standard Form Controls',
    /\bDatePicker(?:Dialog)?\s*\(|\brememberDatePickerState\b|\bDateRangePicker\s*\(|\bExposedDropdownMenuBox\s*\(|\bSpinner\s*\(/,
    m => `Control de Material / Android '${m}': toma la zona y el idioma del teléfono e ignora los tokens. Usa SelectField / DateField / DateRangeFilter (devforge add select dates --compose).`,
  ),
  kotlinRule(
    'KT_BACKDROP_CLOSE',
    'Modals Do Not Close on Backdrop Click',
    /dismissOnClickOutside\s*=\s*true/,
    () => 'Cerrar al tocar el telón pierde formularios a medias. Usa ModalShell / DrawerShell: se cierran con su botón o con atrás.',
    { own: true },
  ),
  kotlinRule(
    'KT_HAND_FORMATTING',
    'Automatic Localized Formatting',
    /\bSimpleDateFormat\s*\(|\bDateTimeFormatter\.ofPattern\s*\(|\bNumberFormat\.get\w*Instance\s*\(|\bDecimalFormat\s*\(|"%[.,]?\d*f"|\.format\(\s*"%|\bString\.format\s*\(\s*"%[.,]?\d*f/,
    m => `Formato a mano '${m}'. Usa formatCurrency / formatNumber / formatPercent / formatDate / formatTime / formatPhoneNumber (devforge add formatters --compose).`,
  ),
  kotlinRule(
    'KT_TIMEZONE',
    'Dates in the Business Time Zone',
    /\bZoneId\.systemDefault\s*\(|\bTimeZone\.getDefault\s*\(|\bZoneOffset\.UTC\b|\bLocalDate\.now\s*\(\s*\)/,
    m => `'${m}' usa la zona del teléfono (o UTC), no la del negocio. Usa todayKey() / formatDate() (zona del negocio, por defecto Santo Domingo).`,
  ),
  kotlinRule(
    'KT_HARDCODED_CURRENCY',
    'Currency Comes From the Document',
    /\bcurrency\s*=\s*"[A-Z]{3}"|==\s*"(?:DOP|USD|COP|MXN|EUR|CLP|PEN|ARS)"/,
    m => `Moneda escrita a mano '${m}'. La moneda la trae el documento (factura?.moneda) o es la del proyecto (formatConfig.defaultCurrency).`,
  ),
  kotlinRule(
    'KT_SPANGLISH',
    'Zero-Spanglish',
    /\b(?:Text|DfButton|EmptyState)\(\s*(?:text\s*=\s*)?"(?:Close|Save|Cancel|Delete|Edit|Status|Amount|Actions|Search|Submit|Retry|Loading\.\.\.|Loading…|No results|Pending|Settled|Flagged|Reversed|OK)"|contentDescription\s*=\s*"(?:Close|Back|Search|Menu|More|Delete|Edit)"/,
    m => `Texto en inglés en la UI '${m}'. Tradúcelo (Cerrar, Guardar, Cancelar, Estado, Monto, Acciones, Cargando…, Sin resultados).`,
  ),
  kotlinRule(
    'KT_RAW_ERROR',
    'Errors Reach the User Normalized',
    /\b(?:e|err|error|ex|exception|throwable|cause)\.(?:message|localizedMessage)\b/,
    m => `'${m}' es el mensaje técnico (en inglés, con nombres de clases). Muestra normalizeApiError(e).message (devforge add errors --compose).`,
  ),
  {
    id: 'KT_UNSAFE_LINK',
    name: 'Safe Links',
    check: (content, line, lineNum, ext, file) => {
      if (ext !== '.kt' || isComment(line) || ownKotlin(file) || content.includes('safeLinkUrl')) return null;
      const match = line.match(/\bopenUri\s*\(|Intent\.ACTION_VIEW/);
      return match
        ? { rule: 'Safe Links', message: `'${match[0]}' abre una URL sin validar: un 'intent:' o 'file:' guardado por otra persona se ejecuta en el teléfono. Pásala por safeLinkUrl() (devforge add security --compose).` }
        : null;
    },
  },
  {
    id: 'KT_HARDCODED_DATA',
    name: 'Zero Hardcoded Data',
    check: (content, line, lineNum, ext, file) => {
      if (ext !== '.kt' || isComment(line) || ownKotlin(file) || /[\\/](?:test|androidTest)[\\/]/.test(file || '')) return null;
      const match = line.match(/\b(?:val|var)\s+(\w+)\s*(?::[^=]+)?=\s*(?:listOf|mutableListOf|arrayOf|mutableStateListOf)\(\s*[A-Z]\w*\(\s*(?:\w+\s*=\s*)?["\d]/);
      if (match && !/option|column|tab|action|nav|route|preset|menu|item[s]?Config/i.test(match[1])) {
        return { rule: 'Zero Hardcoded Data', message: `Lista de registros escrita en el código ('${match[1]}'). Los datos llegan del servicio (repositorio -> ViewModel), paginados.` };
      }
      return null;
    },
  },
];

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
          message: `Uso de color cian/teal/neón prohibido ('${match[0]}'). Usa los tokens semánticos (bg-surface, text-foreground, border-border, primary, success/warning/danger).`,
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
    id: 'HAND_ROLLED_EXPORT',
    name: 'Standard Excel Export',
    check: (content, line, lineNum, ext, filePath = '') => {
      if (!CODE.includes(ext) || isComment(line)) return null;
      if (/[\\/]core[\\/]export[\\/]/.test(filePath)) return null;
      const match = line.match(/XLSX\.(?:utils\.(?:json_to_sheet|aoa_to_sheet|book_new)|writeFile)\b|type:\s*['"]text\/csv/);
      if (match) {
        return {
          rule: 'Standard Excel Export',
          message: `Exportación armada a mano ('${match[0]}'): sale sin tipos, sin membrete y con totales que mezclan monedas. Usa downloadExcelReport() (devforge add excel; servidor: blueprint 10).`,
        };
      }
      return null;
    }
  },
  {
    id: 'UNSAFE_HTML',
    name: 'No Raw HTML',
    check: (content, line, lineNum, ext) => {
      if (!CODE.includes(ext) || isComment(line)) return null;
      if (/\/\/\s*safe-html:\s*\S|<!--\s*safe-html:\s*\S/.test(line)) return null; // justified, with escapeHtml/sanitizer
      const match = line.match(/\bv-html\s*=|dangerouslySetInnerHTML|\.innerHTML\s*=(?!=)/);
      if (match) {
        return {
          rule: 'No Raw HTML',
          message: `'${match[0].trim()}' pinta HTML crudo: un nombre de cliente con <img onerror> ejecuta código en la sesión. Pinta texto (o highlightSegments); si de verdad es HTML, pásalo por escapeHtml()/un sanitizador y justifícalo en la línea: // safe-html: <motivo>.`,
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
      const match = line.match(/(?:\b(?:window|globalThis|self|top|parent)\.|(?<![\w.$]))(alert|confirm|prompt)\s*\(/);
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
    id: 'TS_IGNORE',
    name: 'Strict TypeScript',
    check: (content, line, lineNum, ext) => {
      if (!CODE.includes(ext)) return null;
      if (/(\/\/|\/\*)\s*@ts-ignore\b/.test(line)) {
        return {
          rule: 'Strict TypeScript',
          message: '@ts-ignore silencia el error para siempre. Arregla el tipo; si de verdad hace falta, usa // @ts-expect-error <motivo>.',
        };
      }
      return null;
    }
  },
  {
    id: 'EXPLICIT_ANY',
    name: 'Strict TypeScript',
    check: (content, line, lineNum, ext) => {
      if (!['.ts', '.tsx', '.vue'].includes(ext) || isComment(line)) return null;
      if (/\/\/\s*any:\s*\S/.test(line)) return null; // justified boundary
      const match = line.match(/(?::\s*any\b(?!\w)|\bas\s+any\b|<any>|\bany\[\]|=\s*any\s*[>,])/);
      if (match) {
        return {
          rule: 'Strict TypeScript',
          message: `'${match[0].trim()}' apaga el tipado. Usa unknown y estrecha (Zod o type guard); si es una frontera con una librería sin tipos, justifícalo en la misma línea: // any: <motivo>.`,
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
    id: 'EXCEPTION_PERMISSION',
    name: 'Authorizations, Not Exception Permissions',
    check: (content, line, lineNum, ext) => {
      if (!(CODE.includes(ext) || ext === '.kt') || isComment(line)) return null;
      const match =
        line.match(/['"`][\w.-]+:[\w:.-]*?(?:override|bypass|exceed|skip|unlock|force)[\w:.-]*['"`]/i) ||
        line.match(/\bcan(?:Override|Bypass|Skip|Exceed|Unlock|Force)[A-Z]\w*/) ||
        line.match(/\b(?:override|bypass|skip)(?:Credit|Limit|Floor|Cap|Price|Discount|Approval|Threshold)\w*/);
      if (match) {
        return {
          rule: 'Authorizations, Not Exception Permissions',
          message: `Permiso de excepción '${match[0]}': es un sí permanente, sin importe y sin rastro. Añade el acto al catálogo de autorizaciones y pídelo al CONSUMAR (blueprint 08: requireAuthorization / liftsBlock).`,
        };
      }
      return null;
    }
  },
  {
    id: 'HAND_ROLLED_AUTHORIZATION',
    name: 'Authorizations, Not Ad-hoc Supervisor Passwords',
    check: (content, line, lineNum, ext) => {
      if (!(CODE.includes(ext) || ext === '.kt') || isComment(line)) return null;
      const people = /(supervisor|gerente|autorizador|encargad[oa]|manager)/i;
      const secret = /(password|contrase(?:ñ|n)a|clave|\bpin\b)/i;
      if (people.test(line) && secret.test(line)) {
        return {
          rule: 'Authorizations, Not Ad-hoc Supervisor Passwords',
          message: 'Contraseña de supervisor hecha a mano. El aval se pide con el 403 AUTHORIZATION_REQUIRED y lo resuelve <AuthorizationDialog> (devforge add authorizations, blueprint 08): con rastro, tope por importe y un solo uso.',
        };
      }
      return null;
    }
  },
  {
    id: 'FLATTENED_ERROR',
    name: 'Errors Keep Their Code and Details',
    check: (content, line, lineNum, ext) => {
      if (!['.ts', '.js'].includes(ext) || isComment(line)) return null;
      const match = line.match(/sendError\(\s*res\s*,\s*\w+\.message\b|\.json\(\s*\{\s*(?:error|message)\s*:\s*(?:err|error|e|ex)\.message\s*\}\s*\)/);
      if (match) {
        return {
          rule: 'Errors Keep Their Code and Details',
          message: `Error aplanado a su mensaje '${match[0]}': se pierden 'code' y 'details', y el reto AUTHORIZATION_REQUIRED nunca abre su modal. Responde { message, code, details } (blueprint 08 §6, sendErrorFrom).`,
        };
      }
      return null;
    }
  },
  {
    id: 'BROWSER_NOTIFICATION',
    name: 'Notifications Through the Bell',
    check: (content, line, lineNum, ext, file) => {
      if (!CODE.includes(ext) || isComment(line)) return null;
      // The single gate, and service workers that receive web push, are the only legal callers.
      if (/core[\\/]notifications[\\/]notifications\.ts$/.test(file) || /(?:^|[\\/])(?:sw|service-worker|push-sw)\.(?:js|ts)$/.test(file)) return null;
      const match = line.match(/new\s+(?:window\.)?Notification\s*\(|Notification\.requestPermission\s*\(|\.showNotification\s*\(/);
      if (match) {
        return {
          rule: 'Notifications Through the Bell',
          message: `Notificación del navegador a mano '${match[0]}'. Lo persistente va a la campana (receiveNotification / <NotificationCenter>), lo efímero es notify(), y el escritorio sale por showDesktopNotification() con permiso pedido con un clic (devforge add notifications).`,
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
  },
  ...KOTLIN_RULES,
];

export async function auditCommand(options = {}) {
  const targetDir = options.cwd || process.cwd();
  logger.info(`Auditoría DEVFORGE en: ${targetDir}\n`);

  const config = readAuditConfig(targetDir);
  const ignore = buildIgnore(targetDir, config);
  const filesToScan = [];
  collectFiles(targetDir, targetDir, filesToScan, ignore);

  if (filesToScan.length === 0) {
    logger.warn('No hay archivos .vue, .tsx, .ts, .jsx o .kt para auditar.');
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
      // `// devforge-ignore: <motivo>` en la misma línea o en la de arriba. Sin motivo no cuenta.
      if (IGNORE_RE.test(line) || (idx > 0 && IGNORE_RE.test(lines[idx - 1]) && isComment(lines[idx - 1]))) return;
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

  console.log(`${colors.bright}Archivos escaneados:${colors.reset} ${filesToScan.length}`);
  const known = violations.length - newViolations.length;
  if (baseline && known > 0) {
    console.log(`${colors.dim}Deuda conocida (${BASELINE_FILE}):${colors.reset} ${known} violación(es); solo puede bajar.`);
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
      console.log('  - Componentes estándar (sin skeletons, diálogos ni controles nativos)');
      console.log('  - Autorizaciones y notificaciones por su puerta única\n');
    }
    return { violations, newViolations };
  }

  const issueFiles = new Set(newViolations.map(v => v.file)).size;
  console.log(`${colors.red}Problemas ${baseline ? 'nuevos' : 'encontrados'}:${colors.reset} ${newViolations.length} en ${issueFiles} archivo(s)\n`);

  newViolations.forEach((v, i) => {
    console.log(`  ${colors.red}[${i + 1}]${colors.reset} ${colors.bright}${v.file}:${v.line}${colors.reset} (${colors.yellow}${v.rule}${colors.reset})`);
    console.log(`      ${colors.cyan}Detalle:${colors.reset} ${v.message}`);
    console.log(`      ${colors.dim}Código:${colors.reset}  ${v.snippet.slice(0, 80)}`);
    console.log();
  });

  const healthScore = Math.max(0, Math.round(((filesToScan.length - filesWithIssues) / filesToScan.length) * 100));
  console.log(`${colors.bright}Puntuación de Salud Arquitectónica:${colors.reset} ${healthScore >= 80 ? colors.green : colors.red}${healthScore}%${colors.reset}\n`);
  if (!baseline) {
    console.log(`${colors.dim}Proyecto existente: «devforge audit --baseline» guarda la deuda actual y desde ahí solo se exige que no crezca.${colors.reset}\n`);
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

const CODE_EXTS = ['.vue', '.tsx', '.ts', '.jsx', '.js', '.kt'];
const ALWAYS_SKIPPED = ['node_modules', '.git', 'dist', '.ai', '.next', '.nuxt', 'coverage', 'build', '.gradle', '.kotlin', '.idea', '.devforge'];
const IGNORE_RE = /devforge-ignore:\s*\S/;

/**
 * Pruebas, mocks (MSW) y fixtures llevan datos de ejemplo y textos en inglés A PROPÓSITO: no son
 * pantallas. `{ "audit": { "includeTests": true } }` en devforge.config.json los vuelve a revisar.
 */
const TEST_DIRS = ['test', 'tests', '__tests__', '__mocks__', 'mocks', 'fixtures', 'e2e', 'cypress', 'androidTest'];
const isTestFile = rel => {
  const parts = rel.split('/');
  const file = parts[parts.length - 1];
  return parts.slice(0, -1).some(p => TEST_DIRS.includes(p)) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(file) || /Test\.kt$/.test(file);
};

/** `devforge.config.json` → `{ audit: { ignore: ["glob", …], includeTests: false } }`. */
export function readAuditConfig(targetDir) {
  const file = path.join(targetDir, 'devforge.config.json');
  if (!fs.existsSync(file)) return { ignore: [], includeTests: false };
  try {
    const audit = JSON.parse(fs.readFileSync(file, 'utf8')).audit || {};
    return { ignore: Array.isArray(audit.ignore) ? audit.ignore : [], includeTests: audit.includeTests === true };
  } catch {
    logger.error('devforge.config.json no es JSON válido; se ignora.');
    return { ignore: [], includeTests: false };
  }
}

/** Un patrón estilo .gitignore → función sobre la ruta relativa (con `/`). */
export function globMatcher(pattern) {
  let p = pattern.trim();
  if (!p || p.startsWith('#') || p.startsWith('!')) return null; // la negación no se soporta: se ignora el patrón
  const anchored = p.startsWith('/') || p.slice(0, -1).includes('/');
  p = p.replace(/^\//, '').replace(/\/$/, '');
  let body = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '*' && p[i + 1] === '*') {
      if (p[i + 2] === '/') {
        body += '(?:.*/)?'; // `**/` = cero o más carpetas
        i += 2;
      } else {
        body += '.*';
        i += 1;
      }
    } else if (c === '*') body += '[^/]*';
    else if (c === '?') body += '[^/]';
    else body += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  const regex = new RegExp(`${anchored ? '^' : '(?:^|/)'}${body}(?:/|$)`);
  return rel => regex.test(rel);
}

function buildIgnore(targetDir, config) {
  const matchers = config.ignore.map(globMatcher).filter(Boolean);
  return rel => matchers.some(m => m(rel)) || (!config.includeTests && isTestFile(rel));
}

/** Los patrones del `.gitignore` de una carpeta, sobre rutas relativas a esa carpeta. */
function gitignoreOf(dir) {
  const file = path.join(dir, '.gitignore');
  if (!fs.existsSync(file)) return null;
  const matchers = fs.readFileSync(file, 'utf8').split('\n').map(globMatcher).filter(Boolean);
  return matchers.length ? { dir, matchers } : null;
}

function collectFiles(root, dir, fileList, ignore, gitignores = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // sin permiso o carpeta que desapareció
  }
  const own = gitignoreOf(dir);
  const scopes = own ? [...gitignores, own] : gitignores;
  const ignored = fullPath =>
    scopes.some(g => {
      const relToScope = path.relative(g.dir, fullPath).split(path.sep).join('/');
      return g.matchers.some(m => m(relToScope));
    });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const rel = path.relative(root, fullPath).split(path.sep).join('/');
    if (ignored(fullPath) || ignore(rel)) continue;
    if (entry.isDirectory()) {
      if (!ALWAYS_SKIPPED.includes(entry.name)) collectFiles(root, fullPath, fileList, ignore, scopes);
    } else if (entry.isFile() && CODE_EXTS.includes(path.extname(entry.name)) && !entry.name.endsWith('.d.ts')) {
      fileList.push(fullPath);
    }
  }
}
