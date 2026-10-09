import type { InputHTMLAttributes } from 'react';
import { INPUT_MASKS, type InputMask } from '../../../core/formatters/input-masks.js';
import { cx } from './usePopover';

/**
 * ⚡ DEVFORGE MaskedInput (React) — cédula, RNC, «RNC / Cédula» y teléfono enmascarados
 * MIENTRAS se escribe. Recibe y entrega el texto FORMATEADO; para guardar: `onlyDigits(valor)`.
 *
 *   <MaskedInput mask="cedula" value={cedula} onChange={setCedula} label="Cédula" />
 *   <MaskedInput mask="phone" value={telefono} onChange={setTelefono} label="Teléfono" />
 */
const PLACEHOLDERS: Record<InputMask, string> = {
  cedula: '000-0000000-0',
  rnc: '0-00-00000-0',
  taxId: 'RNC o cédula',
  phone: '(000) 000-0000',
};

export interface MaskedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string | null | undefined;
  onChange: (value: string) => void;
  mask: InputMask;
  label?: string;
  invalid?: boolean;
  compact?: boolean;
}

export function MaskedInput({ value, onChange, mask, label, invalid = false, compact = false, placeholder, className, ...rest }: MaskedInputProps) {
  const format = INPUT_MASKS[mask];
  return (
    <label className="block w-full">
      {label && <span className="mb-1.5 block text-caption font-bold uppercase tracking-wider text-muted-foreground">{label}</span>}
      <input
        {...rest}
        type="text"
        inputMode={mask === 'taxId' ? 'text' : 'numeric'}
        autoComplete={mask === 'phone' ? 'tel' : 'off'}
        placeholder={placeholder ?? PLACEHOLDERS[mask]}
        aria-invalid={invalid || undefined}
        value={format(value ?? '')}
        onChange={e => onChange(format(e.target.value))}
        className={cx(
          'w-full rounded-control border bg-surface px-3.5 text-body tabular-nums text-foreground outline-none transition placeholder:text-dim-foreground focus:ring-2 focus:ring-ring disabled:opacity-60',
          invalid ? 'border-danger' : 'border-input focus:border-primary-border',
          compact ? 'h-9' : 'h-11',
          className,
        )}
      />
    </label>
  );
}
