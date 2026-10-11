import { onBeforeUnmount, shallowRef } from 'vue';
import { createRecordSearch, type RecordSearchOptions, type RecordSearchState } from '../../../core/search/record-search.js';

/**
 * ⚡ DEVFORGE useRecordSearch — `createRecordSearch` con estado reactivo de Vue.
 *
 *   const search = useRecordSearch({ fetch: (q, ctx) => clientesService.buscar(q, ctx), toMessage: e => normalizeApiError(e).message })
 *   search.state.value.items · search.setQuery(q) · search.loadMore()
 */
export function useRecordSearch<T>(options: RecordSearchOptions<T>) {
  const engine = createRecordSearch<T>(options);
  const state = shallowRef<RecordSearchState<T>>(engine.getState());
  const stop = engine.subscribe(s => (state.value = s));
  onBeforeUnmount(() => {
    stop();
    engine.destroy();
  });
  return { state, setQuery: engine.setQuery, flush: engine.flush, loadMore: engine.loadMore, reset: engine.reset };
}
