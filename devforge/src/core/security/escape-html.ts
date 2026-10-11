/**
 * ⚡ DEVFORGE escapeHtml — texto que escribe OTRA persona (nombre de un cliente, de un producto) y
 * termina en una cadena HTML: un tooltip de mapa (Leaflet `bindPopup`), un `innerHTML`, una maqueta
 * de impresión. `<img src=x onerror=…>` como nombre ejecutaría código en la sesión de quien lo mira.
 * Escapa también comillas y acento grave, para que sirva dentro de un atributo.
 */
const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"'`]/g, c => ENTITIES[c] ?? c);
}
