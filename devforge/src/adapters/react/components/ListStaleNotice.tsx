import { Icon } from './icons';

/**
 * ⚡ DEVFORGE ListStaleNotice (React) — «hay cambios nuevos», sin recargar la lista sola.
 * Recargar sola le movería la fila que estaba leyendo; se avisa y decide quien mira.
 *
 *   {hayCambios && <ListStaleNotice onRefresh={recargar} />}
 */
export interface ListStaleNoticeProps {
  onRefresh: () => void;
  message?: string;
  actionText?: string;
}

export function ListStaleNotice({ onRefresh, message = 'Hay cambios nuevos en esta lista.', actionText = 'Actualizar lista' }: ListStaleNoticeProps) {
  return (
    <div className="flex items-center gap-3 border-b border-warning/20 bg-warning/10 px-4 py-2.5 text-small" role="status">
      <Icon name="refresh" className="size-4 shrink-0 text-warning" />
      <span className="font-semibold text-foreground">{message}</span>
      <button type="button" onClick={onRefresh}
        className="ml-auto shrink-0 cursor-pointer rounded-control border border-warning/30 bg-surface-raised px-3 py-1 text-caption font-bold text-foreground transition hover:bg-warning/10">
        {actionText}
      </button>
    </div>
  );
}
