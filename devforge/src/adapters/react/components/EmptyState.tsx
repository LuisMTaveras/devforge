import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons';

/**
 * ⚡ DEVFORGE EmptyState (React) — lo que se ve cuando una lista RESPONDIÓ vacía.
 * Icono + titular + explicación + acción directa. Va en el `emptyState` de `<FlickerlessSurface>`.
 *
 *   <EmptyState title="Aún no hay facturas" text="Las facturas que emitas aparecerán aquí.">
 *     <button onClick={nueva}>Nueva factura</button>
 *   </EmptyState>
 */
export interface EmptyStateProps {
  title: string;
  text?: string;
  icon?: IconName | ReactNode;
  children?: ReactNode;
}

export function EmptyState({ title, text, icon = 'inbox', children }: EmptyStateProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-card bg-surface text-muted-foreground">
        {typeof icon === 'string' ? <Icon name={icon as IconName} className="size-7" /> : icon}
      </span>
      <h3 className="mt-4 text-body font-bold text-foreground">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-small text-muted-foreground">{text}</p>}
      {children && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
