import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type KeyboardEvent } from 'react';
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
 * ⚡ DEVFORGE DatePicker (React) — el calendario (port de B2BDatePicker de Snowlr).
 *
 * En una pantalla NO se usa directo:
 *   · campo de formulario  → <DateField value={fecha} onChange={setFecha} label="Fecha" />
 *   · filtro de un listado → <DateRangeFilter value={periodo} onChange={setPeriodo} onCommit={cargar} />
 * Directo solo para un rango suelto fuera de un listado:
 *   <DatePicker range value={rango} onChange={setRango} />   // ['2026-10-01', '2026-10-31']
 *
 * El valor es una CLAVE `YYYY-MM-DD` (o `[desde, hasta]`), nunca un `Date`. Muestra `dd/mm/aaaa`.
 */
type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange' | 'type' | 'children'> & {
  /** Rótulo dentro del campo, en mayúsculas (como en Snowlr). */
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
const navBtnSmall = 'grid size-7 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground';
const footerBtn = 'cursor-pointer rounded-control px-2.5 py-1 text-caption font-bold text-muted-foreground transition hover:bg-surface-hover hover:text-foreground';
const monthBtn = 'flex cursor-pointer items-center gap-1.5 rounded-control px-2.5 py-1 text-small font-bold text-foreground transition hover:bg-surface-hover';

export function DatePicker(props: DatePickerProps) {
  const { range = false, value, onChange, label, placeholder, min, max, compact = false, clearable = true, disabled = false, className, ...rest } = props;

  const { triggerRef, popoverRef, isOpen, style, open, close } = usePopover({ width: () => (range ? 616 : 304), height: 340 });
  const [viewMode, setViewMode] = useState<'days' | 'monthYear'>('days');
  // Arranca en el mes de la fecha elegida (o de hoy) desde el primer render.
  const [view, setView] = useState(() => parseYearMonth(Array.isArray(value) ? toDayKey(value[0]) : toDayKey(value)));
  const [hoverDate, setHoverDate] = useState('');

  const rangeValue = useMemo(() => {
    if (!Array.isArray(value)) return [] as string[];
    const keys = value.map(v => toDayKey(v));
    while (keys.length && !keys[keys.length - 1]) keys.pop();
    return keys.slice(0, 2);
  }, [value]);
  const singleValue = Array.isArray(value) ? '' : toDayKey(value);
  const hasSelection = range ? rangeValue.some(Boolean) : Boolean(singleValue);
  const placeholderText = placeholder || (range ? 'Seleccionar rango' : 'Seleccionar fecha');
  const [start, end] = rangeValue;
  const displayLabel = range
    ? start && end
      ? `${formatDayKey(start)} — ${formatDayKey(end)}`
      : start
        ? `${formatDayKey(start)} — ...`
        : placeholderText
    : singleValue
      ? formatDayKey(singleValue)
      : placeholderText;

  const selectingFirst = rangeValue.length === 0 || rangeValue.length === 2;
  const rightMonth = view.month === 11 ? 0 : view.month + 1;
  const rightYear = view.month === 11 ? view.year + 1 : view.year;
  const leftCells = useMemo(() => buildCalendar(view.year, view.month, { min, max }), [view, min, max]);
  const rightCells = useMemo(() => buildCalendar(rightYear, rightMonth, { min, max }), [rightYear, rightMonth, min, max]);

  // Al abrir: el mes de la fecha elegida (o de hoy), en la vista de días.
  useEffect(() => {
    if (!isOpen) return setHoverDate('');
    setView(parseYearMonth(range ? rangeValue[0] : singleValue));
    setViewMode('days');
    setHoverDate('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const commit = (next: string | string[]) => (onChange as (v: string | string[]) => void)(next);
  const prevMonth = () => setView(v => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }));
  const nextMonth = () => setView(v => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }));
  const toggleViewMode = () => setViewMode(m => (m === 'days' ? 'monthYear' : 'days'));

  const isSelected = (key: string) => (range ? rangeValue.includes(key) : singleValue === key);
  const isInRange = (key: string) => {
    if (!range) return false;
    if (start && end) return key > start && key < end;
    if (start && hoverDate) {
      if (hoverDate > start) return key > start && key < hoverDate;
      if (hoverDate < start) return key > hoverDate && key < start;
    }
    return false;
  };
  const isHoverEnd = (key: string) => range && rangeValue.length === 1 && key === hoverDate;

  const cellClass = (cell: CalendarCell) =>
    cx(
      isSelected(cell.dateKey)
        ? 'z-10 bg-primary font-black text-primary-foreground shadow-sm'
        : isHoverEnd(cell.dateKey)
          ? 'bg-primary/70 font-black text-primary-foreground'
          : isInRange(cell.dateKey)
            ? 'bg-primary-subtle font-bold text-foreground'
            : cell.isToday
              ? 'border border-primary font-bold text-primary hover:bg-surface-hover'
              : cell.isCurrentMonth
                ? 'text-foreground hover:bg-surface-hover'
                : 'text-dim-foreground opacity-40 hover:bg-surface-hover hover:opacity-90',
      cell.isDisabled && 'pointer-events-none cursor-not-allowed opacity-20',
    );

  const selectDate = (key: string) => {
    if (!range) {
      commit(key);
      close();
      return;
    }
    if (selectingFirst) {
      commit([key]); // empieza un rango nuevo
      return;
    }
    commit(key < start ? [key, start] : [start, key]);
    setHoverDate('');
    close();
  };

  const selectToday = () => {
    const today = todayKey();
    if ((min && today < min) || (max && today > max)) return;
    setView(parseYearMonth(today));
    selectDate(today);
  };

  const handleClear = () => commit(range ? [] : '');

  const handleKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Escape' && isOpen) {
      // Cierra el calendario y no el modal que lo contiene.
      e.stopPropagation();
      e.preventDefault();
      close();
    } else if ((e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') && !isOpen) {
      e.preventDefault();
      open();
    }
  };

  const days = (cells: CalendarCell[]) => (
    <>
      <div className="mb-1 grid grid-cols-7 gap-1 py-1 text-center text-caption font-black uppercase tracking-wider text-muted-foreground">
        {WEEK_DAYS.map(wd => (
          <span key={wd}>{wd}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {cells.map(cell => (
          <button
            key={cell.dateKey}
            type="button"
            className={cx('relative grid size-8.5 cursor-pointer place-items-center rounded-control text-small tabular-nums transition', cellClass(cell))}
            disabled={cell.isDisabled}
            aria-label={formatDayKey(cell.dateKey)}
            onClick={() => selectDate(cell.dateKey)}
            onMouseEnter={() => range && rangeValue.length === 1 && setHoverDate(cell.dateKey)}
            onMouseLeave={() => range && rangeValue.length === 1 && setHoverDate('')}
          >
            {cell.day}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="relative w-full">
      <button
        {...rest}
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-label={rest['aria-label'] ?? (label || placeholderText)}
        disabled={disabled}
        onClick={() => (isOpen ? close() : !disabled && open())}
        onKeyDown={handleKeyDown}
        className={cx(
          'flex w-full cursor-pointer select-none items-center justify-between gap-2.5 text-left transition',
          isOpen ? 'border-primary-border bg-surface ring-2 ring-ring' : 'border-border bg-surface hover:border-primary-border',
          compact ? 'min-h-9 rounded-control border px-3 py-1.5 text-small' : 'min-h-11 rounded-control border px-4 py-2.5 text-body',
          disabled && 'pointer-events-none cursor-not-allowed opacity-60',
          className,
        )}
      >
        <Icon name="calendar" className={cx('size-5 shrink-0 transition-colors', isOpen || hasSelection ? 'text-foreground' : 'text-muted-foreground')} />
        <div className="flex min-w-0 flex-1 flex-col">
          {label && <span className="mb-1 text-caption font-black uppercase leading-none tracking-wider text-primary">{label}</span>}
          <span className={cx('truncate font-bold leading-tight tabular-nums', hasSelection ? 'text-foreground' : 'text-dim-foreground')}>{displayLabel}</span>
        </div>
        {hasSelection && clearable && !disabled ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Limpiar fecha"
            className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
            onClick={e => {
              e.stopPropagation();
              handleClear();
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                handleClear();
              }
            }}
          >
            <Icon name="close" className="size-4" />
          </span>
        ) : (
          <Icon name="chevronDown" className={cx('size-5 shrink-0 transition-transform duration-200', isOpen ? 'rotate-180 text-foreground' : 'text-muted-foreground')} />
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
            className="select-none rounded-card border border-border bg-surface-raised p-3 shadow-popover backdrop-blur-md focus:outline-none"
            onKeyDown={e => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close();
              }
            }}
          >
            <div className={range ? 'grid grid-cols-2 gap-5' : ''}>
              {/* Panel izquierdo / único */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-1 border-b border-border pb-2">
                  <button type="button" className={navBtn} title="Mes anterior" onClick={prevMonth}>
                    <Icon name="chevronLeft" />
                  </button>
                  <button type="button" className={monthBtn} title={viewMode === 'days' ? 'Ver meses y años' : 'Ver días'} onClick={toggleViewMode}>
                    <span>
                      {MONTH_NAMES[view.month]} {view.year}
                    </span>
                    <Icon name="chevronDown" className={cx('size-4 transition-transform duration-150', viewMode === 'monthYear' && 'rotate-180')} />
                  </button>
                  {!range ? (
                    <button type="button" className={navBtn} title="Mes siguiente" onClick={nextMonth}>
                      <Icon name="chevronRight" />
                    </button>
                  ) : (
                    <div className="size-8 shrink-0" />
                  )}
                </div>

                {viewMode === 'monthYear' ? (
                  <div className="py-1">
                    <div className="flex items-center justify-between px-2 pb-2">
                      <button type="button" className={navBtnSmall} title="Año anterior" onClick={() => setView(v => ({ ...v, year: v.year - 1 }))}>
                        <Icon name="chevronLeft" className="size-4" />
                      </button>
                      <span className="text-body font-bold text-foreground">{view.year}</span>
                      <button type="button" className={navBtnSmall} title="Año siguiente" onClick={() => setView(v => ({ ...v, year: v.year + 1 }))}>
                        <Icon name="chevronRight" className="size-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {MONTH_NAMES_SHORT.map((name, idx) => (
                        <button
                          key={name}
                          type="button"
                          className={cx(
                            'cursor-pointer rounded-control py-2 text-small font-medium transition',
                            view.month === idx ? 'bg-primary font-bold text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
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
                  days(leftCells)
                )}
              </div>

              {/* Panel derecho (solo rango): siempre el mes siguiente */}
              {range && (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-1 border-b border-border pb-2">
                    <div className="size-8 shrink-0" />
                    <button type="button" className={monthBtn} onClick={toggleViewMode}>
                      <span>
                        {MONTH_NAMES[rightMonth]} {rightYear}
                      </span>
                      <Icon name="chevronDown" className={cx('size-4 transition-transform duration-150', viewMode === 'monthYear' && 'rotate-180')} />
                    </button>
                    <button type="button" className={navBtn} title="Mes siguiente" onClick={nextMonth}>
                      <Icon name="chevronRight" />
                    </button>
                  </div>
                  {days(rightCells)}
                </div>
              )}
            </div>

            {range && (
              <div className="mb-0.5 mt-2 text-center text-caption text-muted-foreground">
                {selectingFirst ? (
                  <span>
                    Haz clic en la <strong className="text-foreground">fecha de inicio</strong>
                  </span>
                ) : (
                  <span>
                    Ahora selecciona la <strong className="text-foreground">fecha final</strong>
                  </span>
                )}
              </div>
            )}

            <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5">
              <button type="button" className={footerBtn} onClick={selectToday}>
                Hoy
              </button>
              <div className="flex items-center gap-1">
                {hasSelection && clearable && (
                  <button
                    type="button"
                    className="cursor-pointer rounded-control px-2.5 py-1 text-caption font-bold text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
                    onClick={handleClear}
                  >
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
