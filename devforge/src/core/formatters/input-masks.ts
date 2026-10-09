/**
 * ⚡ DEVFORGE Input Masks — identificadores y montos enmascarados MIENTRAS se escribe.
 *
 * `formatters.ts` formatea para MOSTRAR un dato guardado; esto formatea lo que el usuario
 * está tecleando. Son idempotentes y tolerantes: solo miran los dígitos, así que aceptan
 * texto ya formateado o pegado y se pueden usar directo en un `@input` / `onChange`.
 * Lo que se GUARDA es el valor limpio: `onlyDigits(cedula)`, `parseAmount(texto)`.
 *
 *   formatCedula('00112345678')  -> '001-1234567-8'
 *   formatRnc('101234567')       -> '1-01-23456-7'
 *   formatPhoneInput('8095781234') -> '(809) 578-1234'
 *   parseAmount('RD$1,500.50')   -> 1500.5
 */
import { formatConfig } from './formatters.ts';

/** Deja solo los dígitos. */
export const onlyDigits = (value: string | number | null | undefined): string => String(value ?? '').replace(/\D/g, '');

/** Cédula dominicana -> `000-0000000-0` (11 dígitos, 3-7-1). Progresiva. */
export function formatCedula(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 10)}-${d.slice(10)}`;
}

/** RNC dominicano -> `0-00-00000-0` (9 dígitos, 1-2-5-1, formato DGII). Progresiva. */
export function formatRnc(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 9);
  if (d.length <= 1) return d;
  if (d.length <= 3) return `${d.slice(0, 1)}-${d.slice(1)}`;
  if (d.length <= 8) return `${d.slice(0, 1)}-${d.slice(1, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 1)}-${d.slice(1, 3)}-${d.slice(3, 8)}-${d.slice(8)}`;
}

/**
 * Campo combinado «RNC / Cédula»: hasta 9 dígitos -> RNC; 10-11 -> cédula.
 * Con letras (un pasaporte) se deja tal cual.
 */
export function formatTaxId(value: string | null | undefined): string {
  const raw = String(value ?? '');
  if (/[a-zA-Z]/.test(raw)) return raw;
  return onlyDigits(raw).length > 9 ? formatCedula(raw) : formatRnc(raw);
}

/** Teléfono NANP (RD, EE. UU., PR) -> `(000) 000-0000`. Tolera el `1` del país al pegar. */
export function formatPhoneInput(value: string | null | undefined): string {
  let digits = onlyDigits(value);
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  const d = digits.slice(0, 10);
  if (!d) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export type InputMask = 'cedula' | 'rnc' | 'taxId' | 'phone';

export const INPUT_MASKS: Record<InputMask, (value: string) => string> = {
  cedula: formatCedula,
  rnc: formatRnc,
  taxId: formatTaxId,
  phone: formatPhoneInput,
};

/** Separador decimal del locale del proyecto (`.` en es-DO, `,` en es-CO). */
export function decimalSeparator(locale = formatConfig.defaultLocale): string {
  return new Intl.NumberFormat(locale).formatToParts(1.1).find(p => p.type === 'decimal')?.value ?? '.';
}

/**
 * Texto de monto -> número, con el separador decimal del país. Ignora símbolo y miles.
 * `''` o basura -> `null` (nunca `0`: un monto vacío no es cero).
 */
export function parseAmount(text: string | null | undefined, locale = formatConfig.defaultLocale): number | null {
  const decimal = decimalSeparator(locale);
  const cleaned = String(text ?? '')
    .replace(new RegExp(`[^0-9${decimal === ',' ? ',' : '.'}-]`, 'g'), '')
    .replace(decimal, '.');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Lo que se ve en el campo de monto MIENTRAS se escribe: solo dígitos y un separador decimal. */
export function sanitizeAmountInput(text: string, locale = formatConfig.defaultLocale, decimals = 2): string {
  const decimal = decimalSeparator(locale);
  const [int = '', ...rest] = text.replace(new RegExp(`[^0-9${decimal === ',' ? ',' : '.'}]`, 'g'), '').split(decimal);
  if (!rest.length) return int;
  return `${int}${decimal}${rest.join('').slice(0, decimals)}`;
}

/** Valor del campo de monto al ENFOCARLO: el número sin miles, con el separador del país. */
export function amountToEditable(value: number | null | undefined, locale = formatConfig.defaultLocale): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return String(value).replace('.', decimalSeparator(locale));
}
