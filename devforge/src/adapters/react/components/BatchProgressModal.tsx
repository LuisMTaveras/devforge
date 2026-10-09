import { useEffect, useRef, useSyncExternalStore } from 'react';
import { batchCountLabel, batchSummary, type BatchItemStatus, type BatchTracker } from '../../../core/batch/batch-progress.js';
import { formatNumber } from '../../../core/formatters/formatters.js';
import { Icon, type IconName } from './icons';
import { ModalShell } from './ModalShell';
import { cx } from './usePopover';

/**
 * ⚡ DEVFORGE BatchProgressModal (React) — «3 de 10 · Distribuidora del Caribe» mientras corre un lote.
 *
 *   const lote = useMemo(() => createBatchTracker(), [])
 *   <BatchProgressModal tracker={lote} />
 *   await lote.run({ title: 'Enviando facturas', items, worker: item => api.enviar(item.id) })
 */
const STATUS: Record<BatchItemStatus, { icon: IconName; color: string; label: string }> = {
  PENDING: { icon: 'clock', color: 'text-dim-foreground', label: 'En cola' },
  RUNNING: { icon: 'refresh', color: 'text-foreground', label: 'Procesando' },
  DONE: { icon: 'success', color: 'text-success', label: 'Listo' },
  SKIPPED: { icon: 'minus', color: 'text-warning', label: 'Omitido' },
  FAILED: { icon: 'error', color: 'text-danger', label: 'Error' },
};

const fmt = (n: number) => formatNumber(n, { maximumFractionDigits: 0 });

export function BatchProgressModal({ tracker }: { tracker: BatchTracker }) {
  const state = useSyncExternalStore(tracker.subscribe, tracker.getState, tracker.getState);
  const currentRef = useRef<HTMLLIElement>(null);
  useEffect(() => currentRef.current?.scrollIntoView({ block: 'nearest' }), [state.currentId]);

  const running = state.state === 'RUNNING';
  const percent = state.total ? Math.round((state.processed / state.total) * 100) : 0;
  const { counts } = state;
  const summary = batchSummary(state, fmt);

  return (
    <ModalShell
      open={state.open}
      title={state.title}
      size="md"
      bodyClassName="flex min-h-0 flex-col"
      onClose={tracker.close}
      subtitle={running ? `Procesando ${fmt(Math.min(state.processed + 1, state.total))} de ${fmt(state.total)}…` : summary}
      footer={
        <button type="button" onClick={tracker.close}
          className={cx('h-9 cursor-pointer rounded-control px-4 text-small font-semibold transition',
            running ? 'border border-border text-muted-foreground hover:bg-surface-hover' : 'bg-primary text-primary-foreground hover:bg-primary-hover')}>
          {running ? 'Seguir en segundo plano' : 'Cerrar'}
        </button>
      }
    >
      <div className="space-y-3 border-b border-border px-5 py-4">
        <div className="h-2 overflow-hidden rounded-full bg-primary-subtle" role="progressbar" aria-valuenow={state.processed} aria-valuemax={state.total} aria-label="Avance del lote">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
        <div className="flex flex-wrap gap-2 text-caption font-semibold">
          <span className="rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-success">{batchCountLabel(counts.done, 'done', fmt)}</span>
          {counts.skipped > 0 && <span className="rounded-full border border-warning/20 bg-warning/10 px-2.5 py-0.5 text-warning">{batchCountLabel(counts.skipped, 'skipped', fmt)}</span>}
          {counts.failed > 0 && <span className="rounded-full border border-danger/20 bg-danger/10 px-2.5 py-0.5 text-danger">{fmt(counts.failed)} con error</span>}
        </div>
        {state.error && <p className="rounded-control border border-danger/20 bg-danger/10 px-3 py-2 text-small text-danger">{state.error}</p>}
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {state.items.map(item => {
          const look = STATUS[item.status];
          const current = item.id === state.currentId;
          return (
            <li key={item.id} ref={current ? currentRef : undefined} className={cx('flex items-start gap-3 px-5 py-2.5', current && 'bg-primary-subtle')}>
              <Icon name={look.icon} className={cx('mt-0.5 size-4 shrink-0', look.color, item.status === 'RUNNING' && 'animate-spin')} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-small font-semibold text-foreground">{item.label}</p>
                {(item.detail || item.sublabel) && (
                  <p className={cx('truncate text-caption', item.detail ? look.color : 'text-muted-foreground')}>{item.detail || item.sublabel}</p>
                )}
              </div>
              <span className="shrink-0 text-caption text-muted-foreground">{look.label}</span>
            </li>
          );
        })}
      </ul>
    </ModalShell>
  );
}
