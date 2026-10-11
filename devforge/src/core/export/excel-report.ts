/**
 * ⚡ DEVFORGE excel-report — exportar a Excel lo que muestra una consulta. LA ÚNICA VÍA.
 *
 * Un CSV armado a mano sale sin membrete, sin tipos (fechas e importes llegan como texto) y sin
 * totales. Aquí la pantalla DECLARA las columnas con su tipo y el SERVIDOR arma el libro (blueprint
 * 10, `exceljs`): encabezado con estilo, panel fijo, autofiltro, fechas en la zona del negocio y
 * una fila de totales que NUNCA suma monedas distintas.
 *
 *   await downloadExcelReport({
 *     title: 'Antigüedad de cuentas por cobrar',
 *     fileName: `antiguedad-cxc-${corte}`,
 *     filters: [['Al corte', formatDate(corte)], ['Vendedor', vendedor?.nombre]],
 *     columns: [
 *       { header: 'Cliente', value: r => r.nombre },
 *       { header: 'Saldo', value: r => r.saldo, type: 'money', total: true, currency: r => r.moneda },
 *       { header: 'Vence', value: r => r.vence, type: 'date' },
 *     ],
 *     rows,
 *   });
 *
 * Exporta lo que el usuario está viendo con sus filtros: si la lista está paginada, el servidor
 * tiene su propia ruta de exportación con los MISMOS filtros (blueprint 10 §5), no se piden todas
 * las páginas desde el navegador.
 */
import { downloadBlob, readBlobError } from './download.ts';

export type ExcelCellValue = string | number | boolean | Date | null | undefined;
export type ExcelColumnType = 'text' | 'integer' | 'number' | 'money' | 'percent' | 'date' | 'datetime';

export interface ExcelReportColumn<T> {
  header: string;
  value: (row: T) => ExcelCellValue;
  /** `date`: día (clave `YYYY-MM-DD` o Date); `datetime`: instante. Por defecto `text`. */
  type?: ExcelColumnType;
  width?: number;
  /** Fila de totales al pie (números y dinero). */
  total?: boolean;
  /** Moneda de cada fila: el total de dinero solo se calcula si todas coinciden. */
  currency?: (row: T) => string | null | undefined;
}

export interface ExcelReportRequest<T> {
  title: string;
  /** Sin extensión. */
  fileName: string;
  sheetName?: string;
  /** `[etiqueta, valor]` que se imprimen bajo el título; los vacíos no se imprimen. */
  filters?: Array<[string, string | null | undefined]>;
  columns: ExcelReportColumn<T>[];
  rows: T[];
}

export type ExcelCell = string | number | boolean | null;

export interface ExcelReportPayload {
  title: string;
  fileName: string;
  sheetName?: string;
  filters: Array<[string, string]>;
  columns: Array<{ header: string; type: ExcelColumnType; width?: number; total?: boolean; currencyColumn?: number }>;
  rows: ExcelCell[][];
  /** Columnas ocultas al final (la moneda de cada columna de dinero con total). */
  hiddenColumns: number;
}

const NUMERIC: ExcelColumnType[] = ['integer', 'number', 'money', 'percent'];

export function toExcelCell(value: ExcelCellValue, type: ExcelColumnType): ExcelCell {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (NUMERIC.includes(type)) {
    const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
    return Number.isFinite(n) ? n : String(value);
  }
  return typeof value === 'boolean' || typeof value === 'number' ? value : String(value);
}

/** Lo que viaja al servidor: celdas tipadas, sin funciones. Pura (se prueba sin red). */
export function buildExcelReportPayload<T>(req: ExcelReportRequest<T>): ExcelReportPayload {
  const currencyCols = req.columns
    .map((col, i) => ({ col, i }))
    .filter(({ col }) => col.type === 'money' && col.total && col.currency);
  const visible = req.columns.length;
  return {
    title: req.title,
    fileName: req.fileName,
    sheetName: req.sheetName,
    filters: (req.filters ?? []).filter((f): f is [string, string] => !!f[1]),
    columns: req.columns.map((col, i) => {
      const extra = currencyCols.findIndex(c => c.i === i);
      return {
        header: col.header,
        type: col.type ?? 'text',
        ...(col.width ? { width: col.width } : {}),
        ...(col.total ? { total: true } : {}),
        ...(extra >= 0 ? { currencyColumn: visible + extra } : {}),
      };
    }),
    rows: req.rows.map(row => [
      ...req.columns.map(col => toExcelCell(col.value(row), col.type ?? 'text')),
      ...currencyCols.map(({ col }) => toExcelCell(col.currency?.(row), 'text')),
    ]),
    hiddenColumns: currencyCols.length,
  };
}

/** Cómo llega el libro: por defecto `fetch` con cookies al endpoint del blueprint 10. */
export interface ExcelTransport {
  post(url: string, body: ExcelReportPayload): Promise<Blob>;
}

const config: { endpoint: string; transport: ExcelTransport } = {
  endpoint: '/api/reports/excel',
  transport: {
    async post(url, body) {
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const message = await readBlobError(await res.blob());
        throw Object.assign(new Error(message || 'No se pudo generar el Excel.'), { response: { status: res.status, data: { message } } });
      }
      return res.blob();
    },
  },
};

/**
 * Una vez en el arranque, con tu cliente HTTP (para que viaje la sesión):
 *   configureExcelReports({ transport: { post: (url, body) => api.post(url, body, { responseType: 'blob' }).then(r => r.data) } })
 */
export function configureExcelReports(next: { endpoint?: string; transport?: ExcelTransport }): void {
  if (next.endpoint) config.endpoint = next.endpoint;
  if (next.transport) config.transport = next.transport;
}

/** Arma la petición, pide el libro y lo descarga como `<fileName>.xlsx`. Los errores suben (para `normalizeApiError`). */
export async function downloadExcelReport<T>(req: ExcelReportRequest<T>): Promise<void> {
  const blob = await config.transport.post(config.endpoint, buildExcelReportPayload(req));
  downloadBlob(blob, `${req.fileName}.xlsx`);
}
