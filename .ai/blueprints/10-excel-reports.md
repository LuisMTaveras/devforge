# ⚡ BLUEPRINT 10: Excel Reports (Typed, Totals That Never Mix Currencies)

## 🎯 Goal

Every Excel file the platform produces comes out of **one server generator**, with the same shape: a letterhead
(company, branch, title, who/when, filters), a typed table (a date is a date Excel can sort, an amount is a number with
thousands separators), a frozen header, an autofilter and — when asked — a totals row that **never adds two currencies
together**.

A CSV assembled in the browser, or a raw `json_to_sheet` dump, ships without a letterhead, with dates as text, statuses
in English (`PENDING`) and default column widths. It is banned.

> Frontend: `devforge add export` → `core/export/excel-report.ts` (`downloadExcelReport`, `buildExcelReportPayload`).
> This blueprint is the **backend** half. The server accepts EXACTLY that payload. Proven in production (Snowlr).
> Library: `exceljs`. Validation: `zod`. ORM calls are illustrative — adapt to your stack.

---

## 1. Three ways in, one generator

| Who exports | How |
| --- | --- |
| A server route (paginated list, report) | Calls `sendExcelReport(req, res, fileName, opts)` directly. |
| A screen that already holds the rows it shows | `downloadExcelReport(...)` → `POST /api/reports/excel` (§3). |
| A report center document (same object the screen paints and the PDF prints) | Converted to columns/rows on the server, then the same generator. |

Nothing else writes `.xlsx`. **Machine formats are NOT this generator**: bank payment files, tax forms, payroll/social
security files and import templates keep the exact layout another system consumes — no letterhead, no totals row.

**Reading** spreadsheets is a different concern with its own single gate (e.g. `lib/spreadsheet.ts`): a CSV may arrive
in UTF-8 (modern Excel, Google Sheets, ERPs) or CP1252 (Windows in Spanish). Detect the encoding from the bytes and
repair mojibake (`PÃ©rdida` → `Pérdida`); never call the parser with its default encoding scattered across the code.

---

## 2. The generator (`lib/excel-report.ts`)

```ts
import ExcelJS from 'exceljs';

export type ExcelColumnType = 'text' | 'integer' | 'number' | 'money' | 'percent' | 'date' | 'datetime';
export interface ExcelColumn<T> {
  header: string; type?: ExcelColumnType; width?: number; total?: boolean;
  value: (row: T) => string | number | boolean | Date | null | undefined;
  currency?: (row: T) => string | null | undefined;   // money only: mixed currencies = no total
}

const FORMATS: Record<ExcelColumnType, string> = {
  text: '@', integer: '#,##0', number: '#,##0.##', money: '#,##0.00',
  percent: '0.00%', date: 'dd/mm/yyyy', datetime: 'dd/mm/yyyy hh:mm AM/PM',
};

export async function buildExcelReport<T>(ctx: ReportContext, opts: ExcelReportOptions<T>): Promise<Buffer> {
  const head = await loadLetterhead(ctx);            // company + branch FROM THE SESSION, tenant-filtered
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sanitizeSheet(opts.sheetName), { views: [{ showGridLines: false }] });
  const n = Math.max(opts.columns.length, 1);
  let r = 0;
  const line = (text: string, font: Partial<ExcelJS.Font> = {}) => {
    r += 1; if (n > 1) ws.mergeCells(r, 1, r, n);
    Object.assign(ws.getCell(r, 1), { value: text, font: { size: 10, ...font } });
  };

  line(head.company.name, { bold: true, size: 16 });
  line(head.branch ? `Sucursal: ${head.branch.name}` : 'Sucursal: todas las sucursales', { bold: true });
  line(opts.title, { bold: true, size: 14 });
  line(`Generado el ${formatDateTimeInBusinessTz(new Date())} por ${ctx.generatedBy ?? '—'}`, { italic: true, size: 9 });
  const filters = (opts.filters ?? []).filter(([, v]) => v != null && String(v).trim() !== '');
  if (filters.length) line(`Filtros: ${filters.map(([k, v]) => `${k}: ${v}`).join('   ·   ')}`, { size: 9 });
  line(`Registros: ${opts.rows.length}`, { size: 9 });
  r += 1;

  const headerRow = r + 1;
  opts.columns.forEach((c, i) => Object.assign(ws.getRow(headerRow).getCell(i + 1), { value: c.header, font: { bold: true } }));
  opts.rows.forEach((row, ri) => opts.columns.forEach((c, ci) => {
    const type = c.type ?? 'text';
    const cell = ws.getRow(headerRow + 1 + ri).getCell(ci + 1);
    cell.value = toCell(c.value(row), type);
    if (type !== 'text') cell.numFmt = FORMATS[type];
    cell.alignment = { horizontal: type === 'text' ? 'left' : type.startsWith('date') ? 'center' : 'right' };
  }));

  writeTotals(ws, opts, headerRow);                 // §4
  ws.views = [{ state: 'frozen', ySplit: headerRow, showGridLines: false }];
  if (opts.rows.length) ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow + opts.rows.length, column: n } };
  setWidths(ws, opts);                               // explicit width, else by content, cap 60
  ws.pageSetup = { orientation: n > 7 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
```

### Typed cells — the time zone rule

```ts
function toCell(v: unknown, type: ExcelColumnType): ExcelJS.CellValue {
  if (v === null || v === undefined || v === '') return null;          // empty cell, never "null" or 0
  if (type === 'date') return dayKeyToExcelDate(v);                     // '2026-09-01' → that civil day
  if (type === 'datetime') return instantToBusinessWallClock(v);        // shifted to the business TZ
  if (['integer', 'number', 'money', 'percent'].includes(type)) {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : String(v);
  }
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return String(v);
}
```

- **`date`** is a civil day (`YYYY-MM-DD`). Never `new Date('2026-09-01')`: that is midnight UTC, and in UTC-4 it
  displays as the previous day. Build the Excel date from year/month/day directly.
- **`datetime`** is an instant. Excel has no time zone, so write the **wall-clock time in the business TZ**
  (`America/Santo_Domingo` by default), not the server's (which runs in UTC).
- **`percent`** expects a ratio (`0.18` → `18.00%`). Document it at the column; never send `18`.
- Enum values are translated **before** they reach the cell (`PENDING` → `Pendiente`): the sheet is UI.

---

## 3. The endpoint for screens: `POST /api/reports/excel`

The rows are the ones the screen already received with the viewer's permissions; the server reads no business data.
The **only** things the server adds — company and branch — come from the **session**, never from the body.

```ts
const CELL = z.union([z.string().max(10_000), z.number(), z.boolean(), z.null()]);
const body = z.object({
  title: z.string().trim().min(1).max(200),
  fileName: z.string().trim().min(1).max(120),
  sheetName: z.string().trim().max(31).optional(),
  filters: z.array(z.tuple([z.string().max(80), z.string().max(300)])).max(20),
  columns: z.array(z.object({
    header: z.string().trim().min(1).max(120),
    type: z.enum(['text', 'integer', 'number', 'money', 'percent', 'date', 'datetime']),
    width: z.number().min(4).max(120).optional(),
    total: z.boolean().optional(),
    currencyColumn: z.number().int().min(0).optional(),   // index of the HIDDEN column with each row's currency
  })).min(1).max(80),
  rows: z.array(z.array(CELL)).max(50_000),
  hiddenColumns: z.number().int().min(0).max(40),
});

router.post('/reports/excel', express.json({ limit: '15mb' }), authenticate, reportRateLimit, async (req, res) => {
  const p = body.safeParse(req.body);
  if (!p.success) return res.status(422).json({ code: 'VALIDATION_ERROR', message: 'El reporte no es válido.' });
  const { columns, rows, hiddenColumns } = p.data;
  // `columns` lists only the visible ones; `hiddenColumns` cells are appended at the end of each row.
  const cols = columns.map((c, i) => ({
    ...c, value: (row: unknown[]) => row[i],
    ...(c.currencyColumn !== undefined && c.currencyColumn < columns.length + hiddenColumns
      ? { currency: (row: unknown[]) => String(row[c.currencyColumn!] ?? '') } : {}),
  }));
  await logAction({ ...actorFrom(req), action: 'REPORT_EXPORTED', resource: 'Report',
                    details: { title: p.data.title, rows: rows.length, format: 'xlsx' } });  // blueprint 11
  return sendExcelReport(req, res, p.data.fileName, { ...p.data, sheetName: p.data.sheetName || p.data.title, columns: cols });
});
```

The hidden currency columns are **never painted**: they exist only so the totals row can decide (§4).

### Sending the file

```ts
res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.attachment(`${fileName.normalize('NFKD').replace(/[^\w.-]+/g, '_').slice(0, 120)}.xlsx`);  // Content-Disposition
res.send(buffer);
```

On failure answer `500` with `{ message: 'No se pudo generar el archivo de Excel.' }` — the frontend reads it from the
blob (`readBlobError`) and shows it through `normalizeApiError`. Never leak the stack.

---

## 4. Totals that never mix currencies

```ts
const totalCols = opts.columns.map((c, i) => ({ c, i }))
  .filter(({ c }) => c.total && ['integer', 'number', 'money'].includes(c.type ?? 'text'))
  .filter(({ c }) => c.type !== 'money' || !c.currency
    || new Set(opts.rows.map(r => (c.currency!(r) || '').toUpperCase())).size <= 1);
```

- A money column whose rows carry **two or more currencies gets no total** (empty cell; optionally a footer note:
  «Montos en varias monedas: no se totalizan»). A sum of RD$ and US$ is a false number, worse than none.
- The cell holds a formula **with its cached result**: `{ formula: 'SUBTOTAL(9,D8:D120)', result }`. `SUBTOTAL`
  respects the autofilter, so filtering in Excel updates the total.
- Label «Totales» in the first text column. No totals row when there are no rows.

---

## 5. Paginated lists: export on the server, same filters, hard cap

A paginated list (blueprint 07) does **not** loop through every page from the browser to build the payload. It has its
own export route that reuses the list's filter parser and query builder:

```ts
router.get('/invoices/export', authenticate, requirePermission('invoices:read'), reportRateLimit, async (req, res) => {
  const filters = invoiceListFilters.parse(req.query);               // SAME schema as GET /invoices
  const where = buildInvoiceWhere(req.companyId, req.user, filters);  // SAME tenant + seller scope
  const MAX = 50_000;
  const rows = await db.invoice.findMany({ where, orderBy: listOrder(filters), take: MAX + 1, select: exportFields });
  if (rows.length > MAX) return res.status(422).json({ code: 'EXPORT_TOO_LARGE',
    message: `El reporte supera ${formatNumber(MAX)} filas. Acota el rango de fechas.` });
  return sendExcelReport(req, res, `facturas-${filters.from}-${filters.to}`, { title: 'Facturas', columns, rows,
    filters: describeFilters(filters) });             // human labels, e.g. ['Estado', 'Pendiente']
});
```

Refuse beyond the cap with a clear message; never silently truncate (a short sheet looks correct).

---

## 🤖 Instructions for AI Agents

1. Every `.xlsx` comes from `buildExcelReport` / `sendExcelReport`. Never build a CSV in the browser or dump `json_to_sheet`.
2. Accept exactly the `ExcelReportPayload` of `core/export/excel-report.ts`; validate it with zod and its limits.
3. Company and branch come from the session, never from the body. Filter the letterhead query by tenant.
4. `date` = civil day key, `datetime` = instant in the business time zone. Never `new Date('YYYY-MM-DD')`.
5. A money total is written only when every row has the same currency. Hidden currency columns are never painted.
6. A paginated list exports through its own server route with the SAME filters and a hard row cap.
7. Machine formats (bank, tax, import templates) keep their own format. Reading spreadsheets goes through its own gate.
8. Headers, enum values, filter labels and errors are in the UI language. Audit every export (blueprint 11).
