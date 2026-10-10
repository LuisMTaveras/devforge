/**
 * ⚡ DEVFORGE Scroll Lock — el fondo no se desplaza mientras haya un modal abierto.
 *
 * Con contador: cerrar un diálogo secundario NO desbloquea el fondo mientras el modal
 * principal sigue abierto. Compensa el ancho de la barra de desplazamiento para que la
 * página no salte de lado al abrir.
 *
 *   const release = lockScroll()   // al abrir
 *   release()                      // al cerrar (idempotente)
 */

let count = 0;
let previous = { overflow: '', paddingRight: '' };

export function lockScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  const body = document.body;
  if (count === 0) {
    previous = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
  }
  count += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    count -= 1;
    if (count === 0) {
      body.style.overflow = previous.overflow;
      body.style.paddingRight = previous.paddingRight;
    }
  };
}

export const scrollLockCount = (): number => count;
