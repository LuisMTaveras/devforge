import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '../hooks/useOverlay.js';
import { Icon } from './icons';
import { cx } from './usePopover';

/**
 * ⚡ DEVFORGE ModalShell (React) — el armazón de TODO modal: telón, panel, encabezado y pie.
 * Escape cierra solo la capa de arriba, el fondo no se desplaza y el telón NO cierra.
 *
 *   <ModalShell open={abierto} title="Nuevo cliente" onClose={() => setAbierto(false)}
 *               footer={<button form="f">Guardar</button>}>
 *     <form id="f" onSubmit={guardar}>…</form>
 *   </ModalShell>
 */
const WIDTHS = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '4xl': 'sm:max-w-4xl',
  '6xl': 'sm:max-w-6xl',
} as const;

export interface ModalShellProps {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  size?: keyof typeof WIDTHS;
  /** Clases del cuerpo. Por defecto rueda con relleno. */
  bodyClassName?: string;
  footer?: ReactNode;
  children?: ReactNode;
}

export function ModalShell({ open, title, subtitle, onClose, size = 'lg', bodyClassName = 'space-y-4 overflow-y-auto p-5', footer, children }: ModalShellProps) {
  const titleId = `df-modal-${useId().replace(/:/g, '')}`;
  useOverlay(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-200 flex items-end justify-center bg-overlay backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={cx('flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-panel border border-border bg-surface-raised shadow-popover sm:rounded-panel', WIDTHS[size])}>
        <header className="flex items-start justify-between gap-3 border-b border-border bg-surface px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-body font-bold text-foreground">{title}</h2>
            {subtitle && <p className="mt-0.5 text-caption text-muted-foreground">{subtitle}</p>}
          </div>
          <button type="button" aria-label="Cerrar" title="Cerrar" onClick={onClose}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground">
            <Icon name="close" className="size-5" />
          </button>
        </header>
        <div className={cx('min-h-0 flex-1', bodyClassName)}>{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface px-5 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
