import { onActivated, onDeactivated, ref, type Ref } from 'vue';
import { drainDocumentChanges, patchRows, takeListShifted } from '../../../core/list-cache/document-changes.js';

/**
 * ⚡ DEVFORGE useCachedList — una lista que se CONSERVA al navegar (la vista va dentro de
 * `<KeepAlive>`): volver de un detalle la devuelve como estaba —filtros, filas, página, scroll—
 * sin una petición. Resuelve las tres cosas que toda lista conservada necesita:
 *
 *  1. Atar y soltar lo global: una vista en `<KeepAlive>` no se desmonta, se DESACTIVA, así que
 *     `onBeforeUnmount` no corre; lo que se suelta allí (escuchas, temporizadores) va en `unbind`.
 *  2. Parchear las filas que el usuario cambió en el detalle (`recordDocumentChange`), sin red.
 *  3. Avisar si la lista ganó o perdió filas (`markListShifted`) y OFRECER recargar.
 *
 *   defineOptions({ name: 'FacturasView' })   // <KeepAlive :include="['FacturasView']"> casa por NOMBRE
 *   const cache = useCachedList({ resource: 'factura', rows: facturas, reload: load, onChange: tabs.clear })
 *   <ListStaleNotice v-if="cache.listStale.value" @refresh="cache.refresh" />
 */
export function useCachedList<T extends { id?: unknown }>(options: {
  /** La misma clave que usa el detalle al avisar (`recordDocumentChange('factura', …)`). */
  resource: string;
  /** Las filas que pinta la tabla: se parchean en su sitio. */
  rows: Ref<T[]>;
  /** Cómo recarga la lista cuando el usuario ACEPTA el viaje. */
  reload: () => void;
  bind?: () => void;
  unbind?: () => void;
  /** Hubo cambios de este recurso: olvidar lo guardado aparte (p. ej. `tabs.clear`). */
  onChange?: () => void;
}) {
  const listStale = ref(false);

  onActivated(() => {
    options.bind?.();
    const changes = drainDocumentChanges(options.resource);
    patchRows(options.rows.value, changes);
    const shifted = takeListShifted(options.resource);
    if (shifted) listStale.value = true;
    if (changes.length || shifted) options.onChange?.();
  });

  onDeactivated(() => options.unbind?.());

  function refresh() {
    listStale.value = false;
    options.reload();
  }

  return { listStale, refresh };
}
