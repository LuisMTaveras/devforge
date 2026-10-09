/**
 * ⚡ DEVFORGE Localized Formatters Engine
 * Zero-dependency, pure TypeScript localization and formatting utility.
 */

export interface FormatOptions {
  locale?: string;
  currency?: string;
  country?: string;
}

export type CountryCode = 'DO' | 'US' | 'PR' | 'CO' | 'MX' | 'ES' | 'CL' | 'PE' | 'AR';
export type PhoneDisplay = 'national' | 'international';

export interface CountryPreset {
  name: string;
  locale: string;
  currency: string;
  dialCode: string;
  /** IANA time zone of the country's business day (the capital's). */
  timeZone: string;
}

/**
 * Country presets: one call to setFormatCountry() configures locale (thousands/decimal
 * separators, date names), currency and phone mask for the whole project.
 */
export const COUNTRY_PRESETS: Record<CountryCode, CountryPreset> = {
  DO: { name: 'República Dominicana', locale: 'es-DO', currency: 'DOP', dialCode: '1', timeZone: 'America/Santo_Domingo' },
  US: { name: 'Estados Unidos', locale: 'en-US', currency: 'USD', dialCode: '1', timeZone: 'America/New_York' },
  PR: { name: 'Puerto Rico', locale: 'es-PR', currency: 'USD', dialCode: '1', timeZone: 'America/Puerto_Rico' },
  CO: { name: 'Colombia', locale: 'es-CO', currency: 'COP', dialCode: '57', timeZone: 'America/Bogota' },
  MX: { name: 'México', locale: 'es-MX', currency: 'MXN', dialCode: '52', timeZone: 'America/Mexico_City' },
  ES: { name: 'España', locale: 'es-ES', currency: 'EUR', dialCode: '34', timeZone: 'Europe/Madrid' },
  CL: { name: 'Chile', locale: 'es-CL', currency: 'CLP', dialCode: '56', timeZone: 'America/Santiago' },
  PE: { name: 'Perú', locale: 'es-PE', currency: 'PEN', dialCode: '51', timeZone: 'America/Lima' },
  AR: { name: 'Argentina', locale: 'es-AR', currency: 'ARS', dialCode: '54', timeZone: 'America/Argentina/Buenos_Aires' },
};

// Global project defaults: República Dominicana (es-DO, DOP, (809) 578-1234).
// Change them once at startup with setFormatCountry('<CODE>') or setFormatDefaults().
export const formatConfig = {
  defaultLocale: 'es-DO',
  defaultCurrency: 'DOP',
  defaultCountry: 'DO' as string,
  phoneDisplay: 'national' as PhoneDisplay,
  fallbackString: '—',
  /**
   * Dates and times are shown in the BUSINESS time zone, never the process one: a server
   * pinned to UTC formats 9:00 p.m. in Santo Domingo as the next day.
   */
  timeZone: 'America/Santo_Domingo',
};

export function setFormatDefaults(config: Partial<typeof formatConfig>): void {
  Object.assign(formatConfig, config);
}

/**
 * Applies a country preset in one call. Call it once in main.ts / main.tsx.
 * Example: setFormatCountry('DO') -> es-DO, DOP, phones as (809) 578-1234
 */
export function setFormatCountry(country: CountryCode, overrides: Partial<typeof formatConfig> = {}): void {
  const preset = COUNTRY_PRESETS[country];
  setFormatDefaults({
    defaultLocale: preset.locale,
    defaultCurrency: preset.currency,
    defaultCountry: country,
    timeZone: preset.timeZone,
    ...overrides,
  });
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(num) ? num : null;
}

/**
 * Formats a plain number with the country's thousands and decimal separators.
 * Example (es-DO): 1234567.891 -> "1,234,567.89" | (es-CO): "1.234.567,89"
 */
export function formatNumber(
  value: number | string | null | undefined,
  options: { locale?: string; minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
): string {
  const num = toNumber(value);
  if (num === null) return formatConfig.fallbackString;

  return new Intl.NumberFormat(options.locale || formatConfig.defaultLocale, {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(num);
}

/**
 * Formats a ratio as a localized percentage.
 * Example (es-DO): 0.125 -> "12.5%" | (es-CO): "12,5%"
 * Pass { isRatio: false } when the value is already 0-100 (e.g. 12.5).
 */
export function formatPercent(
  value: number | string | null | undefined,
  options: { locale?: string; fractionDigits?: number; isRatio?: boolean } = {}
): string {
  const num = toNumber(value);
  if (num === null) return formatConfig.fallbackString;

  const ratio = options.isRatio === false ? num / 100 : num;
  return new Intl.NumberFormat(options.locale || formatConfig.defaultLocale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: options.fractionDigits ?? 1,
  }).format(ratio);
}

/**
 * Formats a monetary amount into a clean, localized currency string.
 * Example: 17870000 -> "RD$17,870,000.00" (es-DO, DOP) | "$ 17.870.000,00" (es-CO, COP)
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options: { currency?: string; locale?: string; minimumFractionDigits?: number } = {}
): string {
  const num = toNumber(amount);
  if (num === null) return formatConfig.fallbackString;

  const locale = options.locale || formatConfig.defaultLocale;
  const currency = options.currency || formatConfig.defaultCurrency;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats a date into localized string (e.g., "11 sept 2026", es-DO).
 */
export function formatDate(
  dateInput: string | number | Date | null | undefined,
  style: 'short' | 'medium' | 'long' | 'datetime' = 'medium',
  locale = formatConfig.defaultLocale
): string {
  if (!dateInput) return formatConfig.fallbackString;

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return formatConfig.fallbackString;

  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    datetime: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  };

  return new Intl.DateTimeFormat(locale, { ...(optionsMap[style] || optionsMap.medium), timeZone: formatConfig.timeZone }).format(date);
}

/**
 * Formats the time of day in the business time zone (e.g., "9:05 p. m.", es-DO).
 */
export function formatTime(
  dateInput: string | number | Date | null | undefined,
  locale = formatConfig.defaultLocale
): string {
  if (!dateInput) return formatConfig.fallbackString;
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return formatConfig.fallbackString;
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: formatConfig.timeZone }).format(date);
}

/**
 * Formats a date into a human relative time string (e.g., "hace 5 minutos", "hace 2 días").
 */
export function formatRelativeTime(
  dateInput: string | number | Date | null | undefined,
  locale = formatConfig.defaultLocale
): string {
  if (!dateInput) return formatConfig.fallbackString;

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return formatConfig.fallbackString;

  const now = new Date();
  const diffInSeconds = Math.round((date.getTime() - now.getTime()) / 1000);

  const cutoffs = [60, 3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365, Infinity];
  const units: Intl.RelativeTimeFormatUnit[] = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'];

  const unitIndex = cutoffs.findIndex(cutoff => cutoff > Math.abs(diffInSeconds));
  const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1;
  const count = Math.round(diffInSeconds / divisor);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  return rtf.format(count, units[unitIndex]);
}

interface PhoneMask {
  /** Digits in the national number (without country code). */
  length: number;
  national: (d: string) => string;
}

// NANP: República Dominicana (809/829/849), Estados Unidos, Puerto Rico
const NANP_MASK: PhoneMask = {
  length: 10,
  national: d => `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`,
};

const PHONE_MASKS: Partial<Record<CountryCode, PhoneMask>> = {
  DO: NANP_MASK,
  US: NANP_MASK,
  PR: NANP_MASK,
  // 3001234567 -> (300) 123-4567
  CO: { length: 10, national: d => `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` },
  // 5512345678 -> (55) 1234-5678
  MX: { length: 10, national: d => `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` },
  // 612345678 -> 612 34 56 78
  ES: { length: 9, national: d => `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}` },
  // 912345678 -> 9 1234 5678
  CL: { length: 9, national: d => `${d.slice(0, 1)} ${d.slice(1, 5)} ${d.slice(5)}` },
  // 912345678 -> 912 345 678
  PE: { length: 9, national: d => `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` },
};

/**
 * Formats phone numbers according to country format.
 * Supported countries: DO, US, PR (+1), CO (+57), MX (+52), ES (+34), CL (+56), PE (+51)
 *
 * formatPhoneNumber('8095781234', 'DO')                  -> "(809) 578-1234"
 * formatPhoneNumber('18095781234', 'DO', 'international') -> "+1 (809) 578-1234"
 */
export function formatPhoneNumber(
  phone: string | number | null | undefined,
  country: string = formatConfig.defaultCountry,
  display: PhoneDisplay = formatConfig.phoneDisplay
): string {
  if (!phone) return formatConfig.fallbackString;

  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return formatConfig.fallbackString;

  const code = country.toUpperCase() as CountryCode;
  const mask = PHONE_MASKS[code];
  const dialCode = COUNTRY_PRESETS[code]?.dialCode;

  if (mask && dialCode) {
    let national: string | null = null;
    if (digits.length === mask.length) {
      national = digits;
    } else if (digits.length === dialCode.length + mask.length && digits.startsWith(dialCode)) {
      national = digits.slice(dialCode.length);
    }

    if (national) {
      const formatted = mask.national(national);
      return display === 'international' ? `+${dialCode} ${formatted}` : formatted;
    }
  }

  // Fallback: unknown country or length, return with a clean prefix
  return `+${digits}`;
}

/**
 * Fallback helper: Returns the value or an em-dash ('—') if null, undefined, or empty.
 */
export function formatFallback<T>(value: T | null | undefined, fallback = formatConfig.fallbackString): T | string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return value;
}
