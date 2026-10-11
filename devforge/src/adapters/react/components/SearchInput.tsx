import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Icon } from './icons';

/**
 * ⚡ DEVFORGE SearchInput (React) — la búsqueda de un listado. `onChange` sigue cada tecla;
 * `onSearch` sale tras la pausa (`debounceMs`), con Enter o al limpiar. La búsqueda la hace el
 * SERVIDOR (con la página reiniciada a 1). Escape limpia si hay texto.
 *
 *   <SearchInput value={q} onChange={setQ} placeholder="Buscar por número o cliente" onSearch={() => { setPage(1); load(); }} />
 */
export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  clearLabel?: string;
  debounceMs?: number;
}

export const SearchInput = forwardRef<{ focus: () => void }, SearchInputProps>(function SearchInput(
  { value, onChange, onSearch, placeholder = 'Buscar…', ariaLabel, clearLabel = 'Limpiar búsqueda', debounceMs = 300 },
  ref,
) {
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = useRef(value.trim());
  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }));
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const fire = (raw: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const q = raw.trim();
    if (q === last.current) return;
    last.current = q;
    onSearch?.(q);
  };

  const clear = () => {
    onChange('');
    fire('');
    input.current?.focus();
  };

  return (
    <div className="relative">
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim-foreground" />
      <input
        ref={input}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        className="h-10 w-full rounded-control border border-border bg-surface pl-9 pr-9 text-small text-foreground placeholder:text-dim-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
        onChange={e => {
          const v = e.target.value;
          onChange(v);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => fire(v), debounceMs);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            fire(value);
          } else if (e.key === 'Escape' && value) {
            e.stopPropagation();
            clear();
          }
        }}
      />
      {value && (
        <button
          type="button"
          className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          aria-label={clearLabel}
          onClick={clear}
        >
          <Icon name="close" className="size-4" />
        </button>
      )}
    </div>
  );
});
