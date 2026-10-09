import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { pushEscapeLayer } from '../../../core/overlay/escape-layer.js';
import { lockScroll } from '../../../core/overlay/scroll-lock.js';

/**
 * ⚡ DEVFORGE: una capa modal mientras `active` sea verdadero.
 *  - Escape la cierra solo si es la de ARRIBA (core/overlay/escape-layer.ts).
 *  - El fondo no se desplaza (core/overlay/scroll-lock.ts, con contador).
 *
 *   useOverlay(() => props.open, () => emit('close'))
 */
export function useOverlay(active: MaybeRefOrGetter<boolean>, onEscape: () => void, opts: { lockScroll?: boolean } = {}) {
  let releaseEscape: (() => void) | null = null;
  let releaseScroll: (() => void) | null = null;

  function release() {
    releaseEscape?.();
    releaseScroll?.();
    releaseEscape = releaseScroll = null;
  }

  watch(
    () => toValue(active),
    on => {
      release();
      if (!on) return;
      releaseEscape = pushEscapeLayer(onEscape);
      if (opts.lockScroll !== false) releaseScroll = lockScroll();
    },
    { immediate: true },
  );

  onScopeDispose(release);
}
