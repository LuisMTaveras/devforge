/**
 * ⚡ DEVFORGE Date Engine — fuente única del selector de fechas y del filtro de período.
 * Zero-dependency, framework-agnostic (lo usan DatePicker.vue y DateRangeFilter.vue).
 *
 * Una fecha de calendario es una CLAVE `YYYY-MM-DD`, no un `Date`: un `Date` es un
 * instante, y "hoy" depende de la zona. Por eso `todayKey()` se calcula en la zona
 * del negocio (por defecto República Dominicana, UTC-4), no en la del navegador.
 *
 * Regla de negocio: el rango nunca se vacía por accidente. "Limpiar filtros" vuelve
 * a HOY; solo el atajo "Historial completo", elegido a propósito, quita el límite.
 */

export type DayKey = string;

export type RangePreset = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom' | 'all';

export interface DateRange {
  preset: RangePreset;
  /** Clave `YYYY-MM-DD`. Vacía solo en el preset `all`. */
  from: DayKey;
  to: DayKey;
}

export interface CalendarCell {
  day: number;
  dateKey: DayKey;
  isCurrentMonth: boolean;
  isToday: boolean;
  isDisabled: boolean;
}

export const dateConfig = {
  timeZone: 'America/Santo_Domingo',
};

/** Cambia la zona horaria del negocio (IANA), p. ej. `setDateTimeZone('America/Bogota')`. */
export function setDateTimeZone(timeZone: string): void {
  dateConfig.timeZone = timeZone;
}

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;

export const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;

export const WEEK_DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'] as const;

export const RANGE_OPTIONS: { id: RangePreset; name: string }[] = [
  { id: 'today', name: 'Hoy' },
  { id: 'yesterday', name: 'Ayer' },
  { id: 'week', name: 'Últimos 7 días' },
  { id: 'month', name: 'Este mes' },
  { id: 'quarter', name: 'Este trimestre' },
  { id: 'year', name: 'Este año' },
  { id: 'custom', name: 'Rango personalizado' },
  { id: 'all', name: 'Historial completo' },
];

const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDayKey(value: unknown): value is DayKey {
  return typeof value === 'string' && DAY_KEY_RE.test(value);
}

/** La clave del día de un instante, vista en la zona del negocio. */
export function dayKeyOf(date: Date, timeZone = dateConfig.timeZone): DayKey {
  if (isNaN(date.getTime())) return '';
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function todayKey(timeZone = dateConfig.timeZone): DayKey {
  return dayKeyOf(new Date(), timeZone);
}

/** Normaliza lo que llegue al v-model (`Date`, ISO completo o clave) a una clave. */
export function toDayKey(value: string | Date | null | undefined): DayKey {
  if (!value) return '';
  if (value instanceof Date) return dayKeyOf(value);
  if (isDayKey(value)) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? '' : dayKeyOf(parsed);
}

/** Suma días a una clave sin arrastrar husos: se opera en UTC a mediodía. */
export function shiftDayKey(key: DayKey, days: number): DayKey {
  const base = new Date(`${key}T12:00:00Z`);
  if (isNaN(base.getTime())) return key;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** `2026-10-05` ➔ `05/10/2026` (día/mes/año, como se lee en RD y Latinoamérica). */
export function formatDayKey(key: DayKey | null | undefined, fallback = '—'): string {
  const match = key ? DAY_KEY_RE.exec(key) : null;
  return match ? `${match[3]}/${match[2]}/${match[1]}` : fallback;
}

export function parseYearMonth(key: DayKey | null | undefined): { year: number; month: number } {
  const source = key && isDayKey(key) ? key : todayKey();
  return { year: Number(source.slice(0, 4)), month: Number(source.slice(5, 7)) - 1 };
}

/** Rejilla de 5 o 6 semanas (domingo a sábado) del mes `month` (0-11). */
export function buildCalendar(year: number, month: number, opts: { min?: DayKey; max?: DayKey } = {}): CalendarCell[] {
  const today = todayKey();
  const pad = (n: number) => String(n).padStart(2, '0');
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const first = `${year}-${pad(month + 1)}-01`;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const total = firstWeekday + daysInMonth > 35 ? 42 : 35;
  const start = shiftDayKey(first, -firstWeekday);

  return Array.from({ length: total }, (_, i) => {
    const dateKey = shiftDayKey(start, i);
    return {
      day: Number(dateKey.slice(8, 10)),
      dateKey,
      isCurrentMonth: dateKey.slice(0, 7) === first.slice(0, 7),
      isToday: dateKey === today,
      isDisabled: Boolean((opts.min && dateKey < opts.min) || (opts.max && dateKey > opts.max)),
    };
  });
}

/** Rango concreto de un atajo. `custom` conserva lo que ya hubiera elegido. */
export function makeRange(preset: RangePreset, current?: DateRange): DateRange {
  const today = todayKey();
  switch (preset) {
    case 'today': return { preset, from: today, to: today };
    case 'yesterday': { const d = shiftDayKey(today, -1); return { preset, from: d, to: d }; }
    case 'week': return { preset, from: shiftDayKey(today, -6), to: today };
    case 'month': return { preset, from: `${today.slice(0, 7)}-01`, to: today };
    case 'quarter': {
      // Trimestre civil: ene–mar, abr–jun, jul–sep, oct–dic.
      const firstMonth = Math.floor((Number(today.slice(5, 7)) - 1) / 3) * 3 + 1;
      return { preset, from: `${today.slice(0, 4)}-${String(firstMonth).padStart(2, '0')}-01`, to: today };
    }
    case 'year': return { preset, from: `${today.slice(0, 4)}-01-01`, to: today };
    case 'all': return { preset, from: '', to: '' };
    case 'custom': return { preset, from: current?.from || today, to: current?.to || current?.from || today };
  }
}

/** Rango con el que nace una consulta y al que vuelve "Limpiar filtros". */
export const defaultRange = (preset: RangePreset = 'today'): DateRange => makeRange(preset);

/** Parámetros de la petición (`?from=&to=`). `all` los omite para no acotar la consulta. */
export function resolveRange(range: DateRange): { from?: DayKey; to?: DayKey } {
  if (range.preset === 'all') return {};
  return { from: range.from || undefined, to: range.to || range.from || undefined };
}

/** Un solo día: es cuando tienen sentido las flechas de día anterior/siguiente. */
export function isSingleDay(range: DateRange): boolean {
  return range.preset !== 'all' && !!range.from && (range.to || range.from) === range.from;
}

/** Mueve un rango de un día. Si cae en hoy o ayer recupera ese atajo. */
export function stepRangeDay(range: DateRange, delta: number): DateRange {
  const day = shiftDayKey(range.from || todayKey(), delta);
  const today = todayKey();
  if (day === today) return makeRange('today');
  if (day === shiftDayKey(today, -1)) return makeRange('yesterday');
  return { preset: 'custom', from: day, to: day };
}

/** Normaliza un rango personalizado escrito al revés (hasta antes que desde). */
export function normalizeRange(range: DateRange): DateRange {
  if (range.preset !== 'custom' || !range.from || !range.to) return range;
  return range.to < range.from ? { ...range, from: range.to, to: range.from } : range;
}

/** Etiqueta corta para la barra de estado del listado. */
export function rangeLabel(range: DateRange): string {
  if (range.preset === 'all') return 'Historial completo';
  const named = RANGE_OPTIONS.find(o => o.id === range.preset && o.id !== 'custom')?.name;
  if (named) return `${named} · ${formatDayKey(range.from)}`;
  return range.from === range.to ? formatDayKey(range.from) : `${formatDayKey(range.from)} — ${formatDayKey(range.to)}`;
}
