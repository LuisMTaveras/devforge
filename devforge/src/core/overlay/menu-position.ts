/**
 * ⚡ DEVFORGE Menu Position — dónde se abre el menú ⋮ de una fila.
 *
 * El menú vive en `body` (dentro de la tabla lo recortaba el `overflow-x-auto`), se alinea
 * al borde derecho del botón y abre HACIA ARRIBA si no cabe abajo: en la última fila de una
 * tabla larga se dibujaba fuera de la ventana. El alto se ESTIMA con el número de acciones;
 * solo sirve para elegir el lado.
 */
export interface MenuPositionOptions {
  /** Ancho del menú en px. */
  width?: number;
  /** Cuántas acciones muestra ESTA fila. */
  entries?: number;
  entryHeight?: number;
  viewport?: { width: number; height: number };
}

export function menuPosition(anchor: DOMRect | { top: number; bottom: number; right: number }, opts: MenuPositionOptions = {}) {
  const width = opts.width ?? 224;
  const height = 16 + (opts.entries ?? 4) * (opts.entryHeight ?? 40);
  const viewport = opts.viewport ?? { width: window.innerWidth, height: window.innerHeight };
  const gap = 8;
  const pad = 12;
  const left = Math.max(pad, Math.min(anchor.right - width, viewport.width - width - pad));
  const opensAbove = anchor.bottom + gap + height > viewport.height - pad;
  const top = opensAbove ? Math.max(pad, anchor.top - height - gap) : anchor.bottom + gap;
  return { left, top, width, opensAbove };
}
