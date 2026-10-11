/**
 * ⚡ DEVFORGE safeLinkUrl — enlaces a archivos que subió OTRA persona (adjunto de un chat, comprobante
 * de pago, evidencia de una devolución). El servidor guarda esa URL tal cual llegó, y un
 * `:href="javascript:…"` se ejecuta al hacer clic en la sesión del staff; un `data:` o un `http:`
 * abren contenido que nadie controla. Solo se enlaza:
 *   - una URL `https:`;
 *   - una ruta relativa de este origen bajo uno de `allowedPaths` (por defecto `/uploads/`);
 *   - un `http:` de un origen propio (`ownOrigins`, p. ej. el API en desarrollo) bajo esas rutas.
 * Lo demás devuelve `null` y la plantilla NO pinta el enlace. El `<a>` lleva siempre
 * `target="_blank" rel="noopener noreferrer"`.
 *
 *   <a v-if="safeLinkUrl(pago.voucherUrl)" :href="safeLinkUrl(pago.voucherUrl)!" target="_blank" rel="noopener noreferrer">Ver comprobante</a>
 */
export interface SafeUrlOptions {
  allowedPaths?: string[];
  /** Orígenes propios que pueden ir por `http:` (desarrollo local). Por defecto, el de la página. */
  ownOrigins?: string[];
}

export function safeLinkUrl(raw: unknown, options: SafeUrlOptions = {}): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;
  const allowed = options.allowedPaths ?? ['/uploads/'];
  const underAllowed = (path: string) => allowed.some(p => path.startsWith(p));
  if (value.startsWith('/')) {
    // `//host` y `/\host` son otro dominio.
    if (/^\/[/\\]/.test(value)) return null;
    return underAllowed(value) ? value : null;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol === 'https:') return url.href;
  const own = options.ownOrigins ?? (typeof window !== 'undefined' ? [window.location.origin] : []);
  if (url.protocol === 'http:' && own.includes(url.origin) && underAllowed(url.pathname)) return url.href;
  return null;
}
