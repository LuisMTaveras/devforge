/**
 * ⚡ DEVFORGE Toast Engine — avisos que NO interrumpen («Guardado», «No se pudo cargar»).
 * Zero-dependency, framework-agnostic. Lo pinta una sola vez <ToastHost /> (Vue o React).
 *
 *   notify('Cliente guardado')
 *   notify('No se pudo guardar el cliente', 'error')
 *
 * Lo que obliga a decidir algo NO es un toast: es un diálogo (core/feedback/dialog.ts).
 * Se apilan (máximo 4) y se van solos; los errores duran más, porque hay que leerlos.
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const MAX_VISIBLE = 4;
const DURATION: Record<ToastType, number> = { success: 3000, info: 3500, warning: 5000, error: 6000 };

let toasts: Toast[] = [];
let nextId = 0;
const timers = new Map<number, ReturnType<typeof setTimeout>>();
const listeners = new Set<(toasts: Toast[]) => void>();

function emit(next: Toast[]) {
  toasts = next;
  listeners.forEach(l => l(toasts));
}

export function getToasts(): Toast[] {
  return toasts;
}

export function subscribeToasts(listener: (toasts: Toast[]) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function dismissToast(id: number): void {
  clearTimeout(timers.get(id));
  timers.delete(id);
  emit(toasts.filter(t => t.id !== id));
}

/** Muestra un aviso. `durationMs: 0` lo deja hasta que se cierre a mano. Devuelve su id. */
export function notify(message: string, type: ToastType = 'success', durationMs = DURATION[type]): number {
  const id = ++nextId;
  const next = [...toasts, { id, message, type }];
  // El más viejo sale primero si hay demasiados.
  next.slice(0, -MAX_VISIBLE).forEach(t => {
    clearTimeout(timers.get(t.id));
    timers.delete(t.id);
  });
  emit(next.slice(-MAX_VISIBLE));
  if (durationMs > 0) timers.set(id, setTimeout(() => dismissToast(id), durationMs));
  return id;
}
