import { useMemo, useState, type ButtonHTMLAttributes, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  MONTH_NAMES,
  MONTH_NAMES_SHORT,
  WEEK_DAYS,
  buildCalendar,
  formatDayKey,
  parseYearMonth,
  toDayKey,
  todayKey,
  type CalendarCell,
} from '../../../core/dates/date-range.js';
import { Icon } from './icons';
import { cx, usePopover } from './usePopover';

/**
 * ⚡ DEVFORGE DatePicker (React) — selector de fecha estándar (una fecha o un rango).
 *
 *   <DatePicker value={vencimiento} onChange={setVencimiento} label="Vencimiento" min={todayKey()} />
 *   <DatePicker range value={rango} onChange={setRango} />   // ['2026-10-01', '2026-10-31']
 *
 * El valor es una CLAVE `YYYY-MM-DD` (o `[desde, hasta]` en rango), nunca un `Date`.
 * Muestra `dd/mm/aaaa`. El input de fecha nativo está prohibido: ignora el tema.
 */
type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange' | 'type' | 'children'> & {
  label?: string;
  placeholder?: string;
  /** Clave `YYYY-MM-DD` mínima / máxima seleccionable. */
  min?: string;
  max?: string;
  compact?: boolean;
  clearable?: boolean;
};

export type DatePickerProps = BaseProps &
  (
    | { range?: false; value: string | Date | null | undefined; onChange: (value: string) => void }
    | { range: true; value: (string | Date)[] | null | undefined; onChange: (value: string[]) => void }
  );

const navBtn = 'grid size-8 shrink-0 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground';
const footerBtn = 'cursor-pointer rounded-control px-2.5 py-1 text-caption font-semibold text-muted-foreground transition hover:bg-surface-hover hover:text-foreground';

export function DatePicker(props: DatePickerProps) {
  const {
    range = false,
    value,
    onChange,
    label,
    placeholder,
    min,
    max,
    compact = false,
    clearable = true,
    disabled = false,
    className,
    ...rest
  } = props;

  const { triggerRef, popoverRef, isOpen, style, open, close } = usePopover({
    width: () => (range ? 616 : 304),
    height: 360,
  });
  const [viewMode, setViewMode] = useState<'days' | 'months'>('days');
  const [view, setView] = useState({ year: 0, month: 0 });
  const [hoverKey, setHoverKey] = useState('');

  const rangeValue = useMemo(
    () => (Array.isArray(value) ? value.map(v => toDayKey(v)).filter(Boolean).slice(0, 2) : []),
    [value],
  );
  const singleValue = Array.isArray(value) ? '' : toDayKey(value);
  const hasSelection = range ? rangeValue.length > 0 : Boolean(singleValue);
  const placeholderText = placeholder ?? (range ? 'Seleccionar rango' : 'Seleccionar fecha');
  const displayLabel = !hasSelection
    ? placeholderText
    : !range
      ? formatDayKey(singleValue)
      : `${formatDayKey(rangeValue[0])} — ${rangeValue[1] ? formatDayKey(rangeValue[1]) : '…'}`;

  const commit = (next: string | string[]) => (onChange as (v: string | string[]) => void)(next);

  const openPicker = () => {
    if (disabled) return;
    setView(parseYearMonth(range ? rangeValue[0] : singleValue));
    setViewMode('days');
    setHoverKey('');
    open();
  };

  const panels = useMemo(
    () =>
      Array.from({ length: range ? 2 : 1 }, (_, i) => {
        const offset = view.month + i;
        const year = view.year + Math.floor(offset / 12);
        const month = offset % 12;
        return { year, month, cells: buildCalendar(year, month, { min, max }) };
      }),
    [range, view, min, max],
  );

  const shiftMonth = (delta: number) =>
    setView(v => {
      const total = v.year * 12 + v.month + delta;
      return { year: Math.floor(total / 12), month: total % 12 };
    });

  const isEndpoint = (key: string) => (range ? rangeValue.includes(key) : singleValue === key);

  const isInRange = (key: string) => {
    if (!range) return false;
    const [from, to] = rangeValue;
    const end = to ?? (from && hoverKey ? hoverKey : '');
    if (!from || !end) return false;
    const [a, b] = from < end ? [from, end] : [end, from];
    return key > a && key < b;
  };

  const cellClass = (cell: CalendarCell) => {
    if (cell.isDisabled) return 'cursor-not-allowed text-dim-foreground opacity-30';
    if (isEndpoint(cell.dateKey)) return 'cursor-pointer bg-primary font-bold text-primary-foreground shadow-sm';
    if (range && rangeValue.length === 1 && cell.dateKey === hoverKey) return 'cursor-pointer bg-primary/70 font-bold text-primary-foreground';
    if (isInRange(cell.dateKey)) return 'cursor-pointer bg-primary-subtle font-semibold text-foreground';
    if (cell.isToday) return 'cursor-pointer border border-primary font-semibold text-foreground hover:bg-surface-hover';
    if (cell.isCurrentMonth) return 'cursor-pointer text-foreground hover:bg-surface-hover';
    return 'cursor-pointer text-dim-foreground opacity-50 hover:bg-surface-hover hover:opacity-90';
  };

  const pick = (key: string) => {
    if (!range) {
      commit(key);
      close();
      return;
    }
    if (rangeValue.length !== 1) {
      commit([key]); // empieza un rango nuevo
      return;
    }
    const [start] = rangeValue;
    commit(key < start ? [key, start] : [start, key]);
    close();
  };

  const pickToday = () => {
    const today = todayKey();
    if ((min && today < min) || (max && today > max)) return;
    if (range) {
      commit([today, today]);
      close();
    } else pick(today);
  };

  const clear = () => commit(range ? [] : '');

  const onTriggerKeyDown = (e: KeyboardEvent) => {
    if (!isOpen && ['ArrowDown', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openPicker();
    }
  };

  return (
    <div className="relative w-full">
      <button
        {...rest}
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={rest['aria-label'] ?? (label || placeholderText)}
        disabled={disabled}
        className={cx(
          'flex w-full cursor-pointer select-none items-center gap-2.5 rounded-control border bg-surface text-left transition disabled:cursor-not-allowed disabled:opacity-60',
          isOpen ? 'border-primary-border ring-2 ring-ring' : 'border-border hover:border-primary-border',
          compact ? 'min-h-9 px-3 py-1.5 text-small' : 'min-h-11 px-4 py-2.5 text-body',
          className,
        )}
        onClick={() => (isOpen ? close() : openPicker())}
        onKeyDown={onTriggerKeyDown}
      >
        <Icon name="calendar" className={cx('size-5 shrink-0', hasSelection ? 'text-foreground' : 'text-muted-foreground')} />
        <span className="flex min-w-0 flex-1 flex-col">
          {label && <span className="mb-1 text-caption font-bold uppercase leading-none tracking-wider text-muted-foreground">{label}</span>}
          <span className={cx('truncate font-semibold leading-tight tabular-nums', hasSelection ? 'text-foreground' : 'text-dim-foreground')}>
            {displayLabel}
          </span>
        </span>
        {hasSelection && clearable && !disabled && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Borrar fecha"
            className="grid size-6 shrink-0 place-items-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
            onClick={e => {
              e.stopPropagation();
              clear();
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                clear();
              }
            }}
          >
            <Icon name="close" className="size-4" />
          </span>
        )}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={range ? 'Seleccionar rango de fechas' : 'Seleccionar fecha'}
            tabIndex={-1}
            style={style}
            className="select-none rounded-card border border-border bg-surface-raised p-3 shadow-popover focus:outline-none"
            onKeyDown={e => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close();
              }
            }}
          >
            {viewMode === 'months' ? (
              <div>
                <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
                  <button type="button" className={navBtn} title="Año anterior" onClick={() => setView(v => ({ ...v, year: v.year - 1 }))}>
                    <Icon name="chevronLeft" />
                  </button>
                  <span className="text-body font-semibold text-foreground">{view.year}</span>
                  <button type="button" className={navBtn} title="Año siguiente" onClick={() => setView(v => ({ ...v, year: v.year + 1 }))}>
                    <Icon name="chevronRight" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {MONTH_NAMES_SHORT.map((name, idx) => (
                    <button
                      key={name}
                      type="button"
                      className={cx(
                        'cursor-pointer rounded-control py-2 text-small transition',
                        view.month === idx ? 'bg-primary font-semibold text-primary-foreground' : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
                      )}
                      onClick={() => {
                        setView(v => ({ ...v, month: idx }));
                        setViewMode('days');
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={range ? 'grid grid-cols-1 gap-5 sm:grid-cols-2' : ''}>
                {panels.map((panel, p) => (
                  <div key={p}>
                    <div className="mb-2 flex items-center justify-between gap-1 border-b border-border pb-2">
                      {p === 0 ? (
                        <button type="button" className={navBtn} title="Mes anterior" onClick={() => shiftMonth(-1)}>
                          <Icon name="chevronLeft" />
                        </button>
                      ) : (
                        <span className="size-8" />
                      )}
                      <button
                        type="button"
                        className="cursor-pointer rounded-control px-2.5 py-1 text-small font-semibold text-foreground transition hover:bg-surface-hover"
                        title="Ver meses y años"
                        onClick={() => setViewMode('months')}
                      >
                        {MONTH_NAMES[panel.month]} {panel.year}
                      </button>
                      {p === panels.length - 1 ? (
                        <button type="button" className={navBtn} title="Mes siguiente" onClick={() => shiftMonth(1)}>
                          <Icon name="chevronRight" />
                        </button>
                      ) : (
                        <span className="size-8" />
                      )}
                    </div>
                    <div className="mb-1 grid grid-cols-7 gap-1 py-1 text-center text-caption font-bold uppercase tracking-wider text-muted-foreground">
                      {WEEK_DAYS.map(wd => (
                        <span key={wd}>{wd}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {panel.cells.map(cell => (
                        <button
                          key={cell.dateKey}
                          type="button"
                          className={cx('grid size-8.5 place-items-center rounded-control text-small tabular-nums transition', cellClass(cell))}
                          disabled={cell.isDisabled}
                          aria-label={formatDayKey(cell.dateKey)}
                          aria-pressed={isEndpoint(cell.dateKey)}
                          onClick={() => pick(cell.dateKey)}
                          onMouseEnter={() => setHoverKey(cell.dateKey)}
                          onMouseLeave={() => setHoverKey('')}
                        >
                          {cell.day}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {range && viewMode === 'days' && (
              <p className="mt-2 text-center text-caption text-muted-foreground">
                {rangeValue.length === 1 ? (
                  <>Ahora selecciona la <strong className="text-foreground">fecha final</strong></>
                ) : (
                  <>Haz clic en la <strong className="text-foreground">fecha de inicio</strong></>
                )}
              </p>
            )}

            <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5">
              <button type="button" className={footerBtn} onClick={pickToday}>
                Hoy
              </button>
              <div className="flex items-center gap-1">
                {hasSelection && clearable && (
                  <button type="button" className={cx(footerBtn, 'hover:bg-danger/10! hover:text-danger!')} onClick={clear}>
                    Borrar
                  </button>
                )}
                <button type="button" className={footerBtn} onClick={() => close()}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
