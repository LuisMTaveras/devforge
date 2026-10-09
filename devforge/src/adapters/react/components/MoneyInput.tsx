import { useMemo, useState, type InputHTMLAttributes } from 'react';
import { formatConfig, formatNumber } from '../../../core/formatters/formatters.js';
import { amountToEditable, parseAmount, sanitizeAmountInput } from '../../../core/formatters/input-masks.js';
import { cx } from './usePopover';

/**
 * ⚡ DEVFORGE MoneyInput (React) — campo de monto. El valor es un NÚMERO o `null` (vacío ≠ 0).
 *
 *   <MoneyInput value={monto} onChange={setMonto} label="Monto" />          // RD$ 1,500.00
 *   <MoneyInput value={montoUsd} onChange={setMontoUsd} currency="USD" />    // US$ 250.00
 *
 * Sin foco muestra el monto con los separadores del país; con foco, el número para editar.
 */
export interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  currency?: string;
  label?: string;
  decimals?: number;
  invalid?: boolean;
  compact?: boolean;
}

export function MoneyInput({ value, onChange, currency, label, decimals = 2, invalid = false, compact = false, disabled, placeholder = '0.00', className, ...rest }: MoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const code = currency || formatConfig.defaultCurrency;
  const symbol = useMemo(
    () => new Intl.NumberFormat(formatConfig.defaultLocale, { style: 'currency', currency: code }).formatToParts(0).find(p => p.type === 'currency')?.value ?? code,
    [code],
  );
  const display = value === null || value === undefined ? '' : formatNumber(value, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <label className="block w-full">
      {label && <span className="mb-1.5 block text-caption font-bold uppercase tracking-wider text-muted-foreground">{label}</span>}
      <span className={cx(
        'flex w-full items-center gap-2 rounded-control border bg-surface px-3.5 transition focus-within:ring-2 focus-within:ring-ring',
        invalid ? 'border-danger' : 'border-input focus-within:border-primary-border',
        disabled && 'opacity-60',
        compact ? 'h-9' : 'h-11',
        className,
      )}>
        <span className="shrink-0 text-small font-semibold text-dim-foreground">{symbol}</span>
        <input
          {...rest}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          className="min-w-0 flex-1 bg-transparent text-right text-body font-semibold tabular-nums text-foreground outline-none placeholder:text-dim-foreground"
          value={focused ? draft : display}
          onFocus={() => {
            setDraft(amountToEditable(value));
            setFocused(true);
          }}
          onChange={e => {
            const next = sanitizeAmountInput(e.target.value, undefined, decimals);
            setDraft(next);
            onChange(parseAmount(next));
          }}
          onBlur={() => {
            setFocused(false);
            const parsed = parseAmount(draft);
            onChange(parsed === null ? null : Number(parsed.toFixed(decimals)));
          }}
        />
      </span>
    </label>
  );
}
