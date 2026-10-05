/**
 * ⚡ DEVFORGE Export Engine
 * Zero-dependency, pure TypeScript CSV and data exporter with UTF-8 BOM encoding for Excel.
 */

export interface ExportColumn<T = any> {
  header: string;
  key: keyof T | string;
  formatter?: (value: any, item: T) => string | number;
}

/**
 * Exports an array of objects to a downloadable CSV file.
 * Includes UTF-8 BOM so Microsoft Excel renders accents, ñ, and special characters cleanly.
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename = 'reporte-exportado.csv'
): void {
  if (!data || data.length === 0) {
    console.warn('[DEVFORGE exportToCSV] No hay datos para exportar.');
    return;
  }

  // 1. Build Headers Row
  const headerRow = columns.map(col => escapeCSVValue(col.header)).join(',');

  // 2. Build Data Rows
  const dataRows = data.map(item => {
    return columns.map(col => {
      const rawValue = getNestedValue(item, String(col.key));
      const formattedValue = col.formatter ? col.formatter(rawValue, item) : rawValue;
      return escapeCSVValue(formattedValue);
    }).join(',');
  });

  // 3. Assemble CSV with UTF-8 BOM (\uFEFF)
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');

  // 4. Trigger Browser Download
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

function escapeCSVValue(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // If the value contains comma, quotes, or newlines, enclose in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}
