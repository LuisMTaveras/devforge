/**
 * ⚡ DEVFORGE Localized Formatters Engine
 * Zero-dependency, pure TypeScript localization and formatting utility.
 */

export interface FormatOptions {
  locale?: string;
  currency?: string;
  country?: string;
}

// Global project defaults (can be updated via setFormatDefaults)
export const formatConfig = {
  defaultLocale: 'es-CO',
  defaultCurrency: 'USD',
  defaultCountry: 'CO',
  fallbackString: '—',
};

export function setFormatDefaults(config: Partial<typeof formatConfig>): void {
  Object.assign(formatConfig, config);
}

/**
 * Formats a monetary amount into a clean, localized currency string.
 * Example: 17870000 -> "$ 17.870.000,00" (or USD/EUR depending on locale)
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options: { currency?: string; locale?: string; minimumFractionDigits?: number } = {}
): string {
  if (amount === null || amount === undefined || amount === '') {
    return formatConfig.fallbackString;
  }

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return formatConfig.fallbackString;

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
 * Formats a date into localized string (e.g., "11 sept 2026").
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

  return new Intl.DateTimeFormat(locale, optionsMap[style] || optionsMap.medium).format(date);
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

/**
 * Formats phone numbers according to country format.
 * Supported countries: CO (+57), MX (+52), US (+1), ES (+34), AR (+54), CL (+56), PE (+51)
 */
export function formatPhoneNumber(
  phone: string | number | null | undefined,
  country = formatConfig.defaultCountry
): string {
  if (!phone) return formatConfig.fallbackString;

  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return formatConfig.fallbackString;

  switch (country.toUpperCase()) {
    case 'CO': {
      // 10 digits mobile: 3001234567 -> +57 (300) 123-4567
      if (digits.length === 10) {
        return `+57 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      }
      if (digits.length === 12 && digits.startsWith('57')) {
        return `+57 (${digits.slice(2, 5)}) ${digits.slice(5, 8)}-${digits.slice(8)}`;
      }
      break;
    }
    case 'MX': {
      // 10 digits: 5512345678 -> +52 (55) 1234-5678
      if (digits.length === 10) {
        return `+52 (${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
      }
      break;
    }
    case 'US': {
      // 10 digits: 5551234567 -> +1 (555) 123-4567
      if (digits.length === 10) {
        return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      }
      break;
    }
    case 'ES': {
      // 9 digits: 612345678 -> +34 612 34 56 78
      if (digits.length === 9) {
        return `+34 ${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
      }
      break;
    }
    default:
      break;
  }

  // Fallback: return with a clean prefix
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
