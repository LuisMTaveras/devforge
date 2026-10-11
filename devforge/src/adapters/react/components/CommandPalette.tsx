import { useEffect, useMemo, useRef, useState } from 'react';
import { highlightSegments, queryRanges, rankEntries, type SearchableEntry } from '../../../core/search/nav-search.js';
import type { RecordPage } from '../../../core/search/record-search.js';
import { normalizeApiError } from '../../../core/errors/api-error.js';
import { useRecordSearch } from '../hooks/useRecordSearch.js';
import { EmptyState } from './EmptyState';
import { ModalShell } from './ModalShell';
import { SearchInput } from './SearchInput';
import { Icon } from './icons';

/**
 * ⚡ DEVFORGE CommandPalette (React) — ⌘K / Ctrl+K: ir a una PANTALLA (buscada en el navegador) o a
 * un REGISTRO (buscado en el servidor desde `minChars` letras). ↑/↓ + Enter, Escape cierra.
 *
 *   useEffect(() => { const h = (e: KeyboardEvent) => { if (isPaletteShortcut(e)) { e.preventDefault(); setOpen(true); } };
 *     window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);
 *   <CommandPalette open={open} screens={pantallas} fetchRecords={buscar} onNavigate={navigate} onClose={() => setOpen(false)} />
 */
export interface PaletteScreen extends SearchableEntry {
  to: string;
}
export interface PaletteRecord {
  id: string;
  label: string;
  hint?: string | null;
  group: string;
  to: string;
}
interface Item {
  key: string;
  kind: 'screen' | 'record';
  to: string;
  hint?: string | null;
  segments: Array<{ text: string; hit: boolean }>;
}

export interface CommandPaletteProps {
  open: boolean;
  screens: PaletteScreen[];
  fetchRecords?: (q: string, ctx: { page: number; pageSize: number; signal: AbortSignal }) => Promise<RecordPage<PaletteRecord>>;
  placeholder?: string;
  minChars?: number;
  maxScreens?: number;
  onNavigate: (to: string) => void;
  onClose: () => void;
}

export function CommandPalette({
  open,
  screens,
  fetchRecords,
  placeholder = 'Buscar pantallas y registros…',
  minChars = 2,
  maxScreens = 8,
  onNavigate,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const box = useRef<{ focus: () => void }>(null);
  const records = useRecordSearch<PaletteRecord>({
    fetch: (q, ctx) => (fetchRecords ? fetchRecords(q, ctx) : Promise.resolve({ items: [] })),
    minChars,
    pageSize: 8,
    debounceMs: 180,
    toMessage: e => normalizeApiError(e).message,
  });
  const rs = records.state;

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    records.reset();
    setTimeout(() => box.current?.focus(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim();
    const ranked = q ? rankEntries(screens, q).slice(0, maxScreens) : screens.slice(0, maxScreens).map(entry => ({ entry, hit: { score: 0, ranges: [] as Array<[number, number]> } }));
    const screenItems: Item[] = ranked.map(({ entry, hit }) => ({
      key: `s:${entry.to}`,
      kind: 'screen',
      to: entry.to,
      hint: entry.trail.join(' › ') || null,
      segments: highlightSegments(entry.label, hit.ranges),
    }));
    const byGroup = new Map<string, Item[]>();
    if (q.length >= minChars) {
      for (const r of rs.items) {
        const list = byGroup.get(r.group) ?? [];
        list.push({ key: `r:${r.group}:${r.id}`, kind: 'record', to: r.to, hint: r.hint, segments: highlightSegments(r.label, queryRanges(r.label, q)) });
        byGroup.set(r.group, list);
      }
    }
    return [{ title: 'Pantallas', items: screenItems }, ...[...byGroup].map(([title, items]) => ({ title, items }))];
  }, [query, screens, maxScreens, minChars, rs.items]);
  const flat = groups.flatMap(g => g.items);

  const go = (item: Item | undefined) => {
    if (!item) return;
    onNavigate(item.to);
    onClose();
  };
  const move = (delta: number) => {
    if (flat.length) setActive((active + delta + flat.length) % flat.length);
  };

  return (
    <ModalShell open={open} title="Buscar" size="xl" bodyClassName="flex min-h-0 flex-1 flex-col" onClose={onClose}>
      <div
        className="border-b border-border p-3"
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
          else if (e.key === 'Enter') { e.preventDefault(); go(flat[active]); }
        }}
      >
        <SearchInput
          ref={box}
          value={query}
          placeholder={placeholder}
          debounceMs={0}
          onChange={v => {
            setQuery(v);
            setActive(0);
            if (fetchRecords) records.setQuery(v);
          }}
        />
      </div>
      <div className="max-h-[60vh] min-h-48 overflow-y-auto py-2" role="listbox" aria-label="Resultados">
        {groups.map(group =>
          group.items.length ? (
            <div key={group.title}>
              <p className="px-4 pb-1 pt-3 text-caption font-bold uppercase tracking-wide text-dim-foreground">{group.title}</p>
              {group.items.map(item => {
                const i = flat.indexOf(item);
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left ${i === active ? 'bg-surface-hover' : 'hover:bg-surface'}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(item)}
                  >
                    <Icon name={item.kind === 'screen' ? 'chevronRight' : 'document'} className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-small text-foreground">
                        {item.segments.map((seg, k) => (seg.hit ? <mark key={k} className="bg-transparent font-bold text-foreground">{seg.text}</mark> : <span key={k}>{seg.text}</span>))}
                      </span>
                      {item.hint && <span className="block truncate text-caption text-muted-foreground">{item.hint}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null,
        )}
        {rs.error ? (
          <p className="px-4 py-3 text-caption text-muted-foreground" role="status">Los registros no están disponibles ahora: {rs.error}</p>
        ) : query.trim().length >= minChars && rs.loading && !rs.items.length ? (
          <p className="px-4 py-3 text-caption text-muted-foreground">Buscando registros…</p>
        ) : null}
        {!flat.length && query && !rs.loading && <EmptyState title="Sin resultados" text={`Nada coincide con «${query}».`} icon="search" />}
      </div>
    </ModalShell>
  );
}
