<template>
  <ModalShell :open="open" :title="title" :subtitle="subtitle" size="2xl" body-class="flex min-h-0 flex-1 flex-col" @close="emit('close')">
    <div class="border-b border-border p-4">
      <SearchInput
        ref="searchBox"
        :model-value="query"
        :placeholder="placeholder"
        :debounce-ms="0"
        @update:model-value="onQuery"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="pickActive"
      />
    </div>

    <div class="min-h-72 flex-1 overflow-y-auto" role="listbox" :aria-label="title" :aria-busy="state.loading">
      <div class="h-0.5" :class="state.loading ? 'flickerless-progress-bar' : ''" aria-hidden="true"></div>

      <div v-if="state.error" class="px-5 py-10 text-center" role="alert">
        <p class="text-small font-bold text-foreground">No se pudo buscar</p>
        <p class="mt-0.5 text-caption text-muted-foreground">{{ state.error }}</p>
        <button type="button" class="mt-3 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-control border border-border bg-surface-raised px-3.5 text-small font-bold text-foreground hover:bg-surface-hover" @click="search.flush()">
          <DfIcon name="refresh" class="size-4" /> Reintentar
        </button>
      </div>

      <!-- Sin respuesta todavía: «—», nunca «no hay resultados». -->
      <ul v-else-if="!state.settled && !state.items.length" aria-hidden="true">
        <li v-for="n in 5" :key="n" class="flex items-center gap-3 border-b border-border px-5 py-3 text-small">
          <span class="size-9 rounded-full bg-surface"></span><FlickerlessValue />
        </li>
      </ul>

      <EmptyState v-else-if="!state.items.length" :title="emptyTitle" :text="query ? `Nada coincide con «${query}».` : emptyText" icon="search">
        <slot name="empty" />
      </EmptyState>

      <ul v-else :class="state.stale ? 'opacity-60 transition-opacity' : ''">
        <li
          v-for="(item, i) in state.items"
          :key="getKey(item)"
          :ref="el => (rows[i] = el as HTMLElement | null)"
          role="option"
          :aria-selected="getKey(item) === selectedKey"
          class="flex cursor-pointer items-center gap-3 border-b border-border px-5 py-3 transition-colors"
          :class="i === active ? 'bg-surface-hover' : 'hover:bg-surface'"
          @mouseenter="active = i"
          @click="pick(item)"
        >
          <div class="min-w-0 flex-1">
            <slot name="row" :item="item" :active="i === active">
              <p class="truncate text-small font-semibold text-foreground">{{ getLabel(item) }}</p>
              <p v-if="getHint" class="truncate text-caption text-muted-foreground">{{ getHint(item) || '—' }}</p>
            </slot>
          </div>
          <DfIcon v-if="getKey(item) === selectedKey" name="check" class="size-4 shrink-0 text-foreground" />
        </li>
        <li v-if="state.hasMore" class="p-3 text-center">
          <button type="button" class="h-9 cursor-pointer rounded-control border border-border px-4 text-small font-bold text-foreground hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50" :disabled="state.loading" @click="search.loadMore()">
            {{ state.loading ? 'Cargando…' : 'Mostrar más' }}
          </button>
        </li>
      </ul>
    </div>

    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </ModalShell>
</template>

<script setup lang="ts" generic="T">
/**
 * ⚡ DEVFORGE RecordPickerModal — elegir UN registro (cliente, proveedor, artículo) en un diálogo,
 * buscando EN EL SERVIDOR: hay catálogos que no caben en memoria, y lo que un usuario puede ver lo
 * decide el servidor, no el navegador. Muestra resultados al abrir, busca desde la primera letra,
 * pagina con «Mostrar más», ↑/↓ + Enter eligen, Escape cierra y el telón NO cierra.
 *
 *   <RecordPickerModal
 *     :open="eligiendo" title="Seleccionar cliente" placeholder="Buscar por nombre, RNC o teléfono"
 *     :fetch="(q, ctx) => clientesService.buscar({ q, ...ctx, fields: 'id,nombre,rnc' })"
 *     :get-key="c => c.id" :get-label="c => c.nombre" :get-hint="c => formatTaxId(c.rnc)"
 *     :selected-key="factura.clienteId" @select="c => (factura.clienteId = c.id)" @close="eligiendo = false">
 *     <template #footer><button class="…" @click="crearCliente">Nuevo cliente</button></template>
 *   </RecordPickerModal>
 */
import { nextTick, ref, watch } from 'vue';
import type { RecordPage } from '../../../core/search/record-search.js';
import { normalizeApiError } from '../../../core/errors/api-error.js';
import { FlickerlessValue } from '../../../vendor/flickerless/vue/index.js';
import { useRecordSearch } from '../composables/useRecordSearch.js';
import EmptyState from './EmptyState.vue';
import ModalShell from './ModalShell.vue';
import SearchInput from './SearchInput.vue';
import { DfIcon } from './DfIcon.js';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    subtitle?: string;
    placeholder?: string;
    fetch: (query: string, ctx: { page: number; pageSize: number; signal: AbortSignal }) => Promise<RecordPage<T>>;
    getKey: (item: T) => string;
    getLabel?: (item: T) => string;
    getHint?: (item: T) => string | null | undefined;
    selectedKey?: string | null;
    emptyTitle?: string;
    emptyText?: string;
    pageSize?: number;
  }>(),
  { subtitle: '', placeholder: 'Buscar…', getLabel: (item: T) => String(item), selectedKey: null, emptyTitle: 'Sin resultados', emptyText: 'Todavía no hay registros.', pageSize: 20 },
);
const emit = defineEmits<{ select: [item: T]; close: [] }>();

const search = useRecordSearch<T>({ fetch: (q, ctx) => props.fetch(q, ctx), pageSize: props.pageSize, toMessage: e => normalizeApiError(e).message });
const state = search.state;
const query = ref('');
const active = ref(0);
const rows = ref<(HTMLElement | null)[]>([]);
const searchBox = ref<{ focus: () => void } | null>(null);

watch(
  () => props.open,
  open => {
    if (!open) return;
    query.value = '';
    active.value = 0;
    search.reset();
    search.flush();
    void nextTick(() => searchBox.value?.focus());
  },
  { immediate: true },
);

function onQuery(value: string) {
  query.value = value;
  active.value = 0;
  search.setQuery(value);
}

function move(delta: number) {
  const n = state.value.items.length;
  if (!n) return;
  active.value = (active.value + delta + n) % n;
  rows.value[active.value]?.scrollIntoView({ block: 'nearest' });
}

function pick(item: T) {
  emit('select', item);
  emit('close');
}

function pickActive() {
  const item = state.value.items[active.value];
  if (item !== undefined) pick(item);
}
</script>
