import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '../hooks/useOverlay.js';
import { Icon } from './icons';
import { cx } from './usePopover';

/**
 * ⚡ DEVFORGE DrawerShell (React) — panel lateral derecho (bitácora, detalle de un registro).
 * Mismas reglas que ModalShell: Escape cierra la capa de arriba, el telón no cierra.
 */
const WIDTHS = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl', '3xl': 'max-w-3xl' } as const;

export interface DrawerShellProps {
  open: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  size?: keyof typeof WIDTHS;
  bodyClassName?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export function DrawerShell({ open, title, subtitle, onClose, size = '2xl', bodyClassName = 'space-y-4 overflow-y-auto p-5', actions, footer, children }: DrawerShellProps) {
  const titleId = `df-drawer-${useId().replace(/:/g, '')}`;
  useOverlay(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-200 flex justify-end bg-overlay backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <aside className={cx('flex h-full w-full flex-col border-l border-border bg-surface-raised shadow-popover', WIDTHS[size])}>
        <header className="flex items-start justify-between gap-3 border-b border-border bg-surface px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-body font-bold text-foreground">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-caption text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {actions}
            <button type="button" aria-label="Cerrar" title="Cerrar" onClick={onClose}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground">
              <Icon name="close" className="size-5" />
            </button>
          </div>
        </header>
        <div className={cx('min-h-0 flex-1', bodyClassName)}>{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface px-5 py-4">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
}
