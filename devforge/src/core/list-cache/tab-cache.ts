/**
 * ⚡ DEVFORGE tab cache — volver a una pestaña ya vista («Pendientes» → «Todos» → «Pendientes»)
 * con los mismos filtros la pinta al instante, sin petición ni parpadeo.
 *
 * La llave es la consulta ENTERA (pestaña + búsqueda + rango + página), en orden estable y sin
 * vacíos. Solo el CAMBIO DE PESTAÑA lee de aquí. Cualquier otra carga —un filtro, una acción sobre
 * un documento, «Actualizar»— va al servidor y VACÍA el caché: anular un pedido lo saca de
 * «Pendientes» y lo mete en «Cancelados», así que lo guardado de todas las pestañas deja de ser verdad.
 *
 *   const tabs = createTabCache<Pagina>();
 *   async function load(opts: { tab?: boolean } = {}) {
 *     const page = await api.listar(params);
 *     opts.tab ? tabs.add(params, page) : tabs.remember(params, page);
 *     aplicar(page);
 *   }
 *   function cambiarPestana(id) {
 *     estado = id;
 *     const guardada = tabs.recall(params());
 *     guardada ? aplicar(guardada) : load({ tab: true });
 *   }
 */
export interface TabCache<T> {
  /** Lo que ya se trajo para esta consulta, o `undefined`. */
  recall(params: Record<string, unknown>): T | undefined;
  /** Una carga que fue al servidor: vacía lo anterior y guarda solo esta respuesta. */
  remember(params: Record<string, unknown>, data: T): void;
  /** Guarda sin vaciar: la respuesta de una pestaña pedida porque no estaba. */
  add(params: Record<string, unknown>, data: T): void;
  clear(): void;
  readonly size: number;
}

export function tabCacheKey(params: Record<string, unknown>): string {
  return JSON.stringify(
    Object.keys(params)
      .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
      .sort()
      .map(k => [k, params[k]]),
  );
}

export function createTabCache<T>(options: { max?: number } = {}): TabCache<T> {
  const max = options.max ?? 12;
  const entries = new Map<string, T>();
  return {
    recall: params => entries.get(tabCacheKey(params)),
    remember(params, data) {
      entries.clear();
      entries.set(tabCacheKey(params), data);
    },
    add(params, data) {
      const key = tabCacheKey(params);
      entries.delete(key);
      entries.set(key, data);
      while (entries.size > max) entries.delete(entries.keys().next().value as string);
    },
    clear: () => entries.clear(),
    get size() {
      return entries.size;
    },
  };
}
