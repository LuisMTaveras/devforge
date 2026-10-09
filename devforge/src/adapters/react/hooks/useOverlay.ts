import { useEffect, useRef } from 'react';
import { pushEscapeLayer } from '../../../core/overlay/escape-layer.js';
import { lockScroll } from '../../../core/overlay/scroll-lock.js';

/**
 * ⚡ DEVFORGE: una capa modal mientras `active` sea verdadero.
 *  - Escape la cierra solo si es la de ARRIBA (core/overlay/escape-layer.ts).
 *  - El fondo no se desplaza (core/overlay/scroll-lock.ts, con contador).
 *
 *   useOverlay(open, onClose)
 */
export function useOverlay(active: boolean, onEscape: () => void, opts: { lockScroll?: boolean } = {}) {
  const handler = useRef(onEscape);
  handler.current = onEscape;
  const lock = opts.lockScroll !== false;

  useEffect(() => {
    if (!active) return;
    const releaseEscape = pushEscapeLayer(() => handler.current());
    const releaseScroll = lock ? lockScroll() : null;
    return () => {
      releaseEscape();
      releaseScroll?.();
    };
  }, [active, lock]);
}
