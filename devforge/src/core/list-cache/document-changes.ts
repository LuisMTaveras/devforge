/**
 * ⚡ DEVFORGE document changes — lo que el usuario cambió mientras su lista estaba guardada.
 *
 * Regla del producto: una lista conservada al navegar NO vuelve al servidor sola. El único borde
 * es lo que cambiaste TÚ: entras a una factura, la anulas, vuelves — y la lista la seguiría
 * pintando activa. Se resuelve sin una petición:
 *
 *  1. El DETALLE, después de mutar y recargar lo suyo, deja el documento ya confirmado por el
 *     servidor: `recordDocumentChange('factura', f.id, f)`.
 *  2. La LISTA, al volver, recoge los cambios y parchea sus filas copiando SOLO las claves que la
 *     fila ya tenía (`patchRows`): el detalle no sabe qué columnas pinta la lista y la fila no
 *     engorda con `lineas` o `pagos`.
 *  3. Crear o eliminar cambia QUÉ filas hay, y eso no se parchea: `markListShifted('factura')`
 *     hace que la lista OFREZCA actualizar (`ListStaleNotice`) en vez de recargar sola.
 */

export type DocumentSnapshot = Record<string, unknown>;

const patches = new Map<string, Map<string, DocumentSnapshot>>();
const shifted = new Set<string>();

/** «Este documento cambió, y así quedó.» Llamar DESPUÉS de recargar el detalle (el último gana). */
export function recordDocumentChange(resource: string, id: string, snapshot: DocumentSnapshot): void {
  if (!resource || !id || !snapshot) return;
  const byId = patches.get(resource) ?? new Map<string, DocumentSnapshot>();
  byId.set(id, snapshot);
  patches.set(resource, byId);
}

/** «La lista de este recurso ya no tiene las mismas filas» (nació o desapareció un documento). */
export function markListShifted(resource: string): void {
  if (resource) shifted.add(resource);
}

/** Recoge los cambios de un recurso y los CONSUME: un parche aplicado no vuelve a aplicarse. */
export function drainDocumentChanges(resource: string): Array<{ id: string; snapshot: DocumentSnapshot }> {
  const byId = patches.get(resource);
  if (!byId?.size) return [];
  patches.delete(resource);
  return [...byId.entries()].map(([id, snapshot]) => ({ id, snapshot }));
}

/** ¿Le faltan o le sobran filas a la lista de este recurso? Consume el aviso. */
export function takeListShifted(resource: string): boolean {
  return shifted.delete(resource);
}

/**
 * Aplica los cambios a las filas en su sitio, copiando solo las claves que cada fila ya tenía.
 * Devuelve cuántas filas cambiaron. Las filas sin `id` o que no están en pantalla se ignoran.
 */
export function patchRows<T extends { id?: unknown }>(rows: T[], changes: Array<{ id: string; snapshot: DocumentSnapshot }>): number {
  let patched = 0;
  for (const { id, snapshot } of changes) {
    const row = rows.find(r => String(r.id) === id);
    if (!row) continue;
    const target = row as Record<string, unknown>;
    for (const key of Object.keys(target)) {
      if (key in snapshot) target[key] = snapshot[key];
    }
    patched++;
  }
  return patched;
}

/** Solo para tests. */
export function resetDocumentChanges(): void {
  patches.clear();
  shifted.clear();
}
