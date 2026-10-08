import { useMemo } from 'react';
import {
  RANGE_OPTIONS,
  isSingleDay,
  makeRange,
  normalizeRange,
  stepRangeDay,
  type DateRange,
  type RangePreset,
} from '../../../core/dates/date-range.js';
import { DatePicker } from './DatePicker';
import { Icon } from './icons';
import { SelectField } from './SelectField';

/**
 * ⚡ DEVFORGE DateRangeFilter (React) — el filtro de período de los listados.
 *
 *   const [periodo, setPeriodo] = useState(() => defaultRange('month'));
 *   <DateRangeFilter value={periodo} onChange={setPeriodo} onCommit={cargar} />
 *   // en el servicio: api.list({ page, pageSize, ...resolveRange(periodo) })
 *
 * `onChange` recibe cada cambio; `onCommit` solo cuando el rango es utilizable (un
 * personalizado a medio elegir no dispara la consulta).
 */
export interface DateRangeFilterProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  onCommit?: (value: DateRange) => void;
  /** Ocultar "Historial completo" en listados que nunca deben traerlo todo. */
  allowAll?: boolean;
}

const iconBtn = 'flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface-hover hover:text-foreground';

export function DateRangeFilter({ value, onChange, onCommit, allowAll = true }: DateRangeFilterProps) {
  const options = useMemo(
    () => RANGE_OPTIONS.filter(o => allowAll || o.id !== 'all').map(o => ({ value: o.id, label: o.name })),
    [allowAll],
  );
  const single = isSingleDay(value);

  const apply = (next: DateRange) => {
    const normalized = normalizeRange(next);
    onChange(normalized);
    if (normalized.preset !== 'custom' || (normalized.from && normalized.to)) onCommit?.(normalized);
  };

  const onPreset = (preset: RangePreset) => apply(makeRange(preset, value));
  const step = (delta: number) => apply(stepRangeDay(value, delta));

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <div className="flex h-10 shrink-0 items-center gap-1 rounded-control border border-border bg-surface-raised px-2">
        {/* Flechas solo con un día: mover «este mes» un día no significa nada. */}
        {single && (
          <button type="button" className={iconBtn} title="Día anterior" aria-label="Día anterior" onClick={() => step(-1)}>
            <Icon name="chevronLeft" />
          </button>
        )}
        <div className="flex items-center gap-1 px-1 text-small">
          <span className="text-muted-foreground">Período:</span>
          <div className="w-44">
            <SelectField
              value={value.preset}
              options={options}
              compact
              aria-label="Período"
              className="h-8! min-h-8! border-transparent! bg-transparent! px-2! font-bold"
              onChange={v => onPreset(v as RangePreset)}
            />
          </div>
        </div>
        {single && (
          <button type="button" className={iconBtn} title="Día siguiente" aria-label="Día siguiente" onClick={() => step(1)}>
            <Icon name="chevronRight" />
          </button>
        )}
        {value.preset !== 'today' && (
          <button
            type="button"
            className="cursor-pointer rounded-lg px-2.5 py-1.5 text-caption font-bold uppercase tracking-wider text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
            title="Volver a hoy"
            onClick={() => onPreset('today')}
          >
            Hoy
          </button>
        )}
      </div>

      {value.preset === 'custom' && (
        <div className="w-64 shrink-0">
          <DatePicker
            range
            compact
            clearable={false}
            placeholder="Seleccionar rango"
            className="h-10!"
            value={[value.from, value.to].filter(Boolean)}
            onChange={keys => apply({ preset: 'custom', from: keys[0] ?? '', to: keys[1] ?? '' })}
          />
        </div>
      )}
    </div>
  );
}
