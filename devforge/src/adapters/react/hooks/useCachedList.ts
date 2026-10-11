import { useCallback, useEffect, useState } from 'react';
import { drainDocumentChanges, patchRows, takeListShifted } from '../../../core/list-cache/document-changes.js';

/**
 * ⚡ DEVFORGE useCachedList (React) — una lista cuyos datos sobreviven a la navegación (caché de
 * TanStack Query, un store, o `<Activity>`): al volver a mostrarse no va al servidor; parchea lo
 * que el usuario cambió en el detalle (`recordDocumentChange`) y, si la lista ganó o perdió filas
 * (`markListShifted`), OFRECE recargar.
 *
 *   const cache = useCachedList({ resource: 'factura', setRows: setFacturas, reload: refetch });
 *   {cache.listStale && <ListStaleNotice onRefresh={cache.refresh} />}
 *
 * Con TanStack Query, `setRows` es `rows => queryClient.setQueryData(key, (p) => ({ ...p, items: rows(p.items) }))`.
 */
export function useCachedList<T extends { id?: unknown }>(options: {
  resource: string;
  /** Recibe un actualizador: copia las filas, las parchea y las devuelve. */
  setRows: (update: (rows: T[]) => T[]) => void;
  reload: () => void;
  onChange?: () => void;
}) {
  const { resource, setRows, reload, onChange } = options;
  const [listStale, setListStale] = useState(false);

  useEffect(() => {
    const changes = drainDocumentChanges(resource);
    if (changes.length) {
      setRows(rows => {
        const copy = rows.map(r => ({ ...r }));
        patchRows(copy, changes);
        return copy;
      });
    }
    const shifted = takeListShifted(resource);
    if (shifted) setListStale(true);
    if (changes.length || shifted) onChange?.();
    // Solo al volver a montarse la lista: es el momento en que el usuario regresa del detalle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  const refresh = useCallback(() => {
    setListStale(false);
    reload();
  }, [reload]);

  return { listStale, refresh };
}
