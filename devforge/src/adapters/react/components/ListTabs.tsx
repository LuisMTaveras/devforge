import { useRef, type KeyboardEvent } from 'react';
import { formatNumber } from '../../../core/formatters/formatters.js';
import { FlickerlessValue } from '../../../vendor/flickerless/react/index.js';

/**
 * ⚡ DEVFORGE ListTabs (React) — pestañas de estado con su conteo. El conteo lo da el servidor
 * para TODAS las pestañas a la vez, sobre los mismos filtros SIN el estado. `count: null` = aún no
 * se sabe («—»); sin `count`, no hay globo. Flechas ←/→ mueven entre pestañas.
 */
export interface ListTab {
  id: string;
  label: string;
  count?: number | null;
}

export interface ListTabsProps {
  value: string;
  onChange: (id: string) => void;
  tabs: ListTab[];
  label?: string;
}

export function ListTabs({ value, onChange, tabs, label = 'Estados' }: ListTabsProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (id: string) => {
    if (id !== value) onChange(id);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex(t => t.id === value);
    const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    const next = tabs[n];
    if (!next) return;
    e.preventDefault();
    select(next.id);
    buttons.current[n]?.focus();
  };

  return (
    <nav className="flex h-11 items-center gap-1 overflow-x-auto" role="tablist" aria-label={label} onKeyDown={onKey}>
      {tabs.map((t, i) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            ref={el => {
              buttons.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={`flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-control px-3 text-small font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
            }`}
            onClick={() => select(t.id)}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`min-w-5 rounded-full px-1.5 text-center text-caption tabular-nums ${active ? 'bg-primary-foreground/15' : 'bg-surface'}`}>
                <FlickerlessValue value={t.count}>{v => formatNumber(v)}</FlickerlessValue>
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
