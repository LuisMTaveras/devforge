/**
 * ⚡ DEVFORGE sanitizeTenantCss — CSS personalizado que escribe un cliente (multi-tenant, marca
 * blanca) y se inyecta en un `<style>` que ven OTROS usuarios con su sesión abierta. Neutraliza:
 *   - `<` en cualquier forma (lo único que cierra el `<style>` o abre un comentario HTML);
 *   - `@import` (trae otra hoja sin pasar por aquí);
 *   - `url(…)` que no sea `https:`, `data:image/…` o una ruta relativa de este origen (→ `none`);
 *   - `expression(`, `javascript:`, `vbscript:`, `behavior:` y `-moz-binding`.
 * Antes de buscar quita comentarios y decodifica los escapes CSS que forman letras (`\65 xpression(`),
 * y repite hasta que el texto no cambia (`@imp@importort`). Si no se estabiliza, devuelve `''`.
 * El servidor debe sanear igual al GUARDAR; esto es defensa en profundidad para lo ya guardado.
 */

const MAX_PASSES = 10;

/** Decodifica `\XXXXXX ` y `\c` solo cuando el resultado es parte de una palabra clave. */
function decodeKeywordEscapes(css: string): string {
  return css.replace(/\\([0-9a-fA-F]{1,6})[ \t\n\r\f]?|\\([^\n\r\f0-9a-fA-F])/g, (match, hex: string | undefined, literal: string | undefined) => {
    const char = hex ? String.fromCodePoint(Math.min(parseInt(hex, 16), 0x10ffff) || 0xfffd) : literal!;
    return /^[A-Za-z0-9:(@_-]$/.test(char) ? char : match;
  });
}

function isAllowedCssUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  if (/^https:\/\//i.test(value)) return true;
  if (/^data:image\//i.test(value)) return true;
  // Relativa de este origen: sin esquema y sin `//host`.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  if (/^[\\/]{2}/.test(value)) return false;
  return true;
}

function onePass(css: string): string {
  let out = css;
  out = out.replace(/\/\*[\s\S]*?(\*\/|$)/g, '');
  out = decodeKeywordEscapes(out);
  out = out.replace(/</g, '');
  out = out.replace(/@import[^;]*;?/gi, '');
  out = out.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]*))\s*\)/gi, (match, dq?: string, sq?: string, bare?: string) =>
    isAllowedCssUrl(dq ?? sq ?? bare ?? '') ? match : 'none',
  );
  out = out.replace(/expression\s*\(/gi, '');
  out = out.replace(/(?:java|vb)script\s*:/gi, '');
  out = out.replace(/behavior\s*:/gi, '');
  out = out.replace(/-moz-binding/gi, '');
  return out;
}

export function sanitizeTenantCss(raw: string | null | undefined): string {
  if (!raw) return '';
  let current = String(raw);
  for (let i = 0; i < MAX_PASSES; i++) {
    const next = onePass(current);
    if (next === current) return next;
    current = next;
  }
  // No se estabilizó: alguien está jugando con el filtro. Mejor sin CSS.
  return '';
}
