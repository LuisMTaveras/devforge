<template>
  <ModalShell :open="open" title="Buscar" size="xl" body-class="flex min-h-0 flex-1 flex-col" @close="emit('close')">
    <div class="border-b border-border p-3" @keydown.down.prevent="move(1)" @keydown.up.prevent="move(-1)" @keydown.enter.prevent="go(flat[active])">
      <SearchInput ref="box" :model-value="query" :placeholder="placeholder" :debounce-ms="0" @update:model-value="onQuery" />
    </div>
    <div class="max-h-[60vh] min-h-48 overflow-y-auto py-2" role="listbox" aria-label="Resultados">
      <template v-for="group in groups" :key="group.title">
        <p v-if="group.items.length" class="px-4 pb-1 pt-3 text-caption font-bold uppercase tracking-wide text-dim-foreground">{{ group.title }}</p>
        <button
          v-for="item in group.items"
          :key="item.key"
          type="button"
          role="option"
          :aria-selected="flat.indexOf(item) === active"
          class="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left"
          :class="flat.indexOf(item) === active ? 'bg-surface-hover' : 'hover:bg-surface'"
          @mouseenter="active = flat.indexOf(item)"
          @click="go(item)"
        >
          <DfIcon :name="item.kind === 'screen' ? 'chevronRight' : 'document'" class="size-4 shrink-0 text-muted-foreground" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-small text-foreground">
              <template v-for="(seg, i) in item.segments" :key="i"><mark v-if="seg.hit" class="bg-transparent font-bold text-foreground">{{ seg.text }}</mark><template v-else>{{ seg.text }}</template></template>
            </span>
            <span v-if="item.hint" class="block truncate text-caption text-muted-foreground">{{ item.hint }}</span>
          </span>
        </button>
      </template>

      <p v-if="records.state.value.error" class="px-4 py-3 text-caption text-muted-foreground" role="status">Los registros no están disponibles ahora: {{ records.state.value.error }}</p>
      <p v-else-if="query.trim().length >= minChars && records.state.value.loading && !records.state.value.items.length" class="px-4 py-3 text-caption text-muted-foreground">Buscando registros…</p>
      <EmptyState v-if="!flat.length && query && !records.state.value.loading" title="Sin resultados" :text="`Nada coincide con «${query}».`" icon="search" />
    </div>
  </ModalShell>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE CommandPalette — ⌘K / Ctrl+K: ir a una PANTALLA (buscada en el navegador con
 * `nav-search`, sin acentos y tolerando un error de dedo) o a un REGISTRO (buscado en el servidor
 * desde `minChars` letras, cancelando la consulta anterior). ↑/↓ + Enter, Escape cierra.
 *
 *   window.addEventListener('keydown', e => { if (isPaletteShortcut(e)) { e.preventDefault(); abierto.value = true } })
 *   <CommandPalette :open="abierto" :screens="pantallas" :fetch-records="buscarRegistros"
 *                   @navigate="to => router.push(to)" @close="abierto = false" />
 *
 * `screens` sale del mismo menú que se pinta (filtrado por permisos), nunca de una lista aparte.
 */
import { computed, nextTick, ref, watch } from 'vue';
import { highlightSegments, queryRanges, rankEntries, type SearchableEntry } from '../../../core/search/nav-search.js';
import type { RecordPage } from '../../../core/search/record-search.js';
import { normalizeApiError } from '../../../core/errors/api-error.js';
import { useRecordSearch } from '../composables/useRecordSearch.js';
import EmptyState from './EmptyState.vue';
import ModalShell from './ModalShell.vue';
import SearchInput from './SearchInput.vue';
import { DfIcon } from './DfIcon.js';

export interface PaletteScreen extends SearchableEntry {
  to: string;
}
export interface PaletteRecord {
  id: string;
  label: string;
  hint?: string | null;
  /** Encabezado del grupo («Clientes», «Facturas»). */
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

const props = withDefaults(
  defineProps<{
    open: boolean;
    screens: PaletteScreen[];
    fetchRecords?: ((q: string, ctx: { page: number; pageSize: number; signal: AbortSignal }) => Promise<RecordPage<PaletteRecord>>) | null;
    placeholder?: string;
    minChars?: number;
    maxScreens?: number;
  }>(),
  { fetchRecords: null, placeholder: 'Buscar pantallas y registros…', minChars: 2, maxScreens: 8 },
);
const emit = defineEmits<{ navigate: [to: string]; close: [] }>();

const query = ref('');
const active = ref(0);
const box = ref<{ focus: () => void } | null>(null);
const records = useRecordSearch<PaletteRecord>({
  fetch: (q, ctx) => (props.fetchRecords ? props.fetchRecords(q, ctx) : Promise.resolve({ items: [] })),
  minChars: props.minChars,
  pageSize: 8,
  debounceMs: 180,
  toMessage: e => normalizeApiError(e).message,
});

const groups = computed(() => {
  const q = query.value.trim();
  const screens: Item[] = (q ? rankEntries(props.screens, q).slice(0, props.maxScreens) : props.screens.slice(0, props.maxScreens).map(entry => ({ entry, hit: { score: 0, ranges: [] } }))).map(({ entry, hit }) => ({
    key: `s:${entry.to}`,
    kind: 'screen',
    to: entry.to,
    hint: entry.trail.join(' › ') || null,
    segments: highlightSegments(entry.label, hit.ranges),
  }));
  const byGroup = new Map<string, Item[]>();
  if (q.length >= props.minChars) {
    for (const r of records.state.value.items) {
      const list = byGroup.get(r.group) ?? [];
      list.push({ key: `r:${r.group}:${r.id}`, kind: 'record', to: r.to, hint: r.hint, segments: highlightSegments(r.label, queryRanges(r.label, q)) });
      byGroup.set(r.group, list);
    }
  }
  return [{ title: 'Pantallas', items: screens }, ...[...byGroup].map(([title, items]) => ({ title, items }))];
});
const flat = computed(() => groups.value.flatMap(g => g.items));

watch(
  () => props.open,
  open => {
    if (!open) return;
    query.value = '';
    active.value = 0;
    records.reset();
    void nextTick(() => box.value?.focus());
  },
);

function onQuery(value: string) {
  query.value = value;
  active.value = 0;
  if (props.fetchRecords) records.setQuery(value);
}

function move(delta: number) {
  const n = flat.value.length;
  if (n) active.value = (active.value + delta + n) % n;
}

function go(item: Item | undefined) {
  if (!item) return;
  emit('navigate', item.to);
  emit('close');
}
</script>
