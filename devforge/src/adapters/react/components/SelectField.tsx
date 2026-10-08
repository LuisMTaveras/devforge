import { useEffect, useId, useMemo, useState, type ButtonHTMLAttributes, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import { cx, usePopover } from './usePopover';

/**
 * ⚡ DEVFORGE SelectField (React) — el combo estándar. Reemplaza al select nativo del navegador.
 *
 *   <SelectField value={estado} onChange={setEstado} label="Estado" options={estados} />
 *
 * Opciones: `{ value, label, disabled?, group?, hint? }` (o `string | number`).
 * El disparador es un `<button>`: el `required` nativo NO veta el envío; valida en `onSubmit`.
 */
export type SelectValue = string | number | null;

export interface SelectOption {
  value: SelectValue;
  label: string;
  /** Se muestra apagada (no se esconde). */
  disabled?: boolean;
  /** Encabezado bajo el que se agrupa (el equivalente de `<optgroup>`). */
  group?: string;
  /** Línea de ayuda debajo del nombre, solo en el menú. */
  hint?: string;
}

export interface SelectFieldProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange' | 'type' | 'children'> {
  value: SelectValue | undefined;
  onChange: (value: SelectValue) => void;
  options: readonly (SelectOption | string | number)[];
  label?: string;
  placeholder?: string;
  compact?: boolean;
}

type FlatOption = SelectOption & { index: number };

export function SelectField({
  value,
  onChange,
  options,
  label,
  placeholder = 'Seleccionar…',
  compact = false,
  disabled = false,
  className,
  ...rest
}: SelectFieldProps) {
  const listboxId = `df-select-${useId().replace(/:/g, '')}`;
  const { triggerRef, popoverRef, isOpen, style, open, close } = usePopover({
    width: w => Math.max(w, 220),
    height: 260,
  });
  const [activeIndex, setActiveIndex] = useState(-1);

  const flat = useMemo<FlatOption[]>(
    () => options.map((opt, index) => (typeof opt === 'object' ? { ...opt, index } : { value: opt, label: String(opt), index })),
    [options],
  );
  const groups = useMemo(() => {
    const out: { group: string | null; items: FlatOption[] }[] = [];
    for (const opt of flat) {
      const last = out[out.length - 1];
      const group = opt.group ?? null;
      if (last && last.group === group) last.items.push(opt);
      else out.push({ group, items: [opt] });
    }
    return out;
  }, [flat]);

  const isSelected = (v: SelectValue) => value !== undefined && String(value ?? '') === String(v ?? '');
  const selected = flat.find(o => isSelected(o.value)) ?? null;

  const firstEnabled = (from: number, step: 1 | -1) => {
    for (let i = from; i >= 0 && i < flat.length; i += step) if (!flat[i]?.disabled) return i;
    return activeIndex;
  };

  useEffect(() => {
    if (isOpen) setActiveIndex(selected?.index ?? firstEnabled(0, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.getElementById(`${listboxId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex, listboxId]);

  const choose = (opt: FlatOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    close();
  };

  const onTriggerKeyDown = (e: KeyboardEvent) => {
    if (!isOpen && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      open();
    }
  };

  const onListKeyDown = (e: KeyboardEvent) => {
    const moves: Record<string, () => number> = {
      ArrowDown: () => firstEnabled(activeIndex + 1, 1),
      ArrowUp: () => firstEnabled(activeIndex - 1, -1),
      Home: () => firstEnabled(0, 1),
      End: () => firstEnabled(flat.length - 1, -1),
    };
    if (moves[e.key]) {
      e.preventDefault();
      setActiveIndex(moves[e.key]());
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = flat[activeIndex];
      if (opt) choose(opt);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // no cierra el modal que contiene al campo
      close();
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  const optionClass = (opt: FlatOption) => {
    if (opt.disabled) return 'cursor-not-allowed border-transparent text-dim-foreground opacity-50';
    if (isSelected(opt.value)) return 'cursor-pointer border-primary-border bg-primary-subtle font-semibold text-foreground';
    if (opt.index === activeIndex) return 'cursor-pointer border-transparent bg-surface-hover text-foreground';
    return 'cursor-pointer border-transparent text-muted-foreground hover:text-foreground';
  };

  return (
    <div className="relative w-full">
      <button
        {...rest}
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={rest['aria-label'] ?? (label || selected?.label || placeholder)}
        disabled={disabled}
        className={cx(
          'flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-control border bg-surface text-left transition disabled:cursor-not-allowed disabled:opacity-60',
          isOpen ? 'border-primary-border ring-2 ring-ring' : 'border-border hover:border-primary-border',
          compact ? 'min-h-9 px-3 py-1.5 text-small' : 'min-h-11 px-4 py-2.5 text-body',
          className,
        )}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          {label && (
            <span className="mb-1 text-caption font-bold uppercase leading-none tracking-wider text-muted-foreground">{label}</span>
          )}
          <span className={cx('truncate font-semibold leading-tight', selected ? 'text-foreground' : 'text-dim-foreground')}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <Icon
          name="chevronDown"
          className={cx('size-5 shrink-0 transition-transform duration-200', isOpen ? 'rotate-180 text-foreground' : 'text-muted-foreground')}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            id={listboxId}
            ref={popoverRef}
            role="listbox"
            tabIndex={-1}
            aria-label={label || placeholder || 'Opciones'}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
            style={style}
            className="max-h-72 overflow-y-auto rounded-card border border-border bg-surface-raised p-1.5 shadow-popover focus:outline-none"
            onKeyDown={onListKeyDown}
          >
            {groups.map(block => (
              <div key={block.group ?? '__'} role="presentation">
                {block.group && (
                  <div className="px-3.5 pb-1 pt-2 text-caption font-bold uppercase tracking-wider text-dim-foreground">{block.group}</div>
                )}
                {block.items.map(opt => (
                  <button
                    key={String(opt.value)}
                    id={`${listboxId}-${opt.index}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected(opt.value)}
                    aria-disabled={opt.disabled || undefined}
                    disabled={opt.disabled}
                    className={cx('flex w-full items-center justify-between gap-3 rounded-control border px-3.5 py-2.5 text-left text-body transition', optionClass(opt))}
                    onClick={() => choose(opt)}
                    onMouseEnter={() => setActiveIndex(opt.index)}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{opt.label}</span>
                      {opt.hint && <span className="truncate text-caption font-normal text-dim-foreground">{opt.hint}</span>}
                    </span>
                    {isSelected(opt.value) && <Icon name="check" className="size-4 shrink-0 text-foreground" />}
                  </button>
                ))}
              </div>
            ))}
            {!flat.length && <p className="px-4 py-3 text-center text-caption text-dim-foreground">Sin opciones disponibles</p>}
          </div>,
          document.body,
        )}
    </div>
  );
}
