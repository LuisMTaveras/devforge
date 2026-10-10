/**
 * ⚡ DEVFORGE Escape Layers — Escape cierra la capa de ARRIBA, no todas.
 *
 * Con dos capas abiertas (una ficha y encima el modal de una acción suya, o un modal y
 * encima el diálogo de confirmación) un Escape por modal las cerraba juntas, y con ellas
 * el formulario a medias de abajo. Aquí las capas abiertas forman una PILA en el orden en
 * que se abrieron y un único escucha le da el Escape solo a la de arriba.
 *
 * El escucha va en fase de burbuja a propósito: un combo o un calendario con su menú
 * abierto detiene el Escape (`stopPropagation`) para cerrar solo el menú.
 *
 *   const release = pushEscapeLayer(() => cerrar())   // al abrir
 *   release()                                          // al cerrar / desmontar
 */

interface Layer {
  id: number;
  onEscape: () => void;
}

const stack: Layer[] = [];
let nextId = 0;
let listening = false;

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  const top = stack[stack.length - 1];
  if (!top) return;
  event.preventDefault();
  top.onEscape();
}

function sync() {
  if (typeof window === 'undefined') return;
  if (stack.length && !listening) {
    window.addEventListener('keydown', onKeydown);
    listening = true;
  } else if (!stack.length && listening) {
    window.removeEventListener('keydown', onKeydown);
    listening = false;
  }
}

/** Apila una capa. Devuelve la función que la retira (idempotente). */
export function pushEscapeLayer(onEscape: () => void): () => void {
  const id = ++nextId;
  stack.push({ id, onEscape });
  sync();
  return () => {
    const i = stack.findIndex(l => l.id === id);
    if (i >= 0) stack.splice(i, 1);
    sync();
  };
}

/** Cuántas capas hay abiertas (tests y depuración). */
export const escapeLayerCount = (): number => stack.length;
