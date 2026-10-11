import type { DateRange } from '../../../core/dates/date-range.js';
import { DateRangeFilter } from './DateRangeFilter';
import { Icon } from './icons';

/**
 * ⚡ DEVFORGE HistoryPeriodFilter (React) — el filtro de fecha de una bandeja de documentos.
 * Lo PENDIENTE se enseña entero (sin rango, y se dice por qué); lo RESUELTO se acota con el
 * `DateRangeFilter` de siempre. El servidor aplica la misma regla.
 */
export interface HistoryPeriodFilterProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  onCommit?: (value: DateRange) => void;
  pending?: boolean;
  pendingLabel?: string;
  allowAll?: boolean;
}

export function HistoryPeriodFilter({
  value,
  onChange,
  onCommit,
  pending = false,
  pendingLabel = 'Todos los pendientes, de cualquier fecha',
  allowAll = true,
}: HistoryPeriodFilterProps) {
  if (!pending) return <DateRangeFilter value={value} onChange={onChange} onCommit={onCommit} allowAll={allowAll} />;
  return (
    <span className="inline-flex h-10 items-center gap-1.5 px-1 text-caption text-muted-foreground">
      <Icon name="inbox" className="size-4" /> {pendingLabel}
    </span>
  );
}
