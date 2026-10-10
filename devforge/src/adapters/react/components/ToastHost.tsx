import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { dismissToast, getToasts, subscribeToasts, type ToastType } from '../../../core/feedback/toast.js';
import { Icon, type IconName } from './icons';
import { cx } from './usePopover';

/**
 * ⚡ DEVFORGE ToastHost (React) — avisos que no interrumpen. Va UNA vez en la raíz.
 * `notify('Cliente guardado')`, `notify('No se pudo guardar', 'error')` desde cualquier sitio.
 */
const LOOKS: Record<ToastType, { icon: IconName; color: string }> = {
  success: { icon: 'success', color: 'text-success' },
  error: { icon: 'error', color: 'text-danger' },
  warning: { icon: 'warning', color: 'text-warning' },
  info: { icon: 'info', color: 'text-muted-foreground' },
};

export function ToastHost() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  return createPortal(
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[10001] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:top-6" aria-live="polite" role="status">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-border bg-surface-raised px-4 py-3 shadow-popover">
          <Icon name={LOOKS[toast.type].icon} className={cx('mt-0.5 size-5 shrink-0', LOOKS[toast.type].color)} />
          <p className="min-w-0 flex-1 text-small font-medium text-foreground">{toast.message}</p>
          <button type="button" aria-label="Cerrar aviso" onClick={() => dismissToast(toast.id)}
            className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground">
            <Icon name="close" className="size-4" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
