<template>
  <footer class="flex flex-col gap-2.5 border-t border-border px-4 py-3 text-caption text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
    <p>
      <FlickerlessValue :value="settled ? summary : undefined" />
      <slot name="note" />
    </p>
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        :class="navBtn"
        :disabled="!state.hasPrev"
        aria-label="Página anterior"
        @click="go(state.page - 1)"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" /></svg>
      </button>
      <!-- El total de páginas se ENSEÑA: sin él, el «2» no dice si queda algo detrás. -->
      <span class="flex h-8.5 items-center justify-center rounded-control border border-border bg-surface-raised px-3 font-bold tabular-nums text-foreground" aria-live="polite">
        {{ fmt(state.page) }}<span v-if="state.pages > 1" class="text-dim-foreground">&nbsp;/&nbsp;{{ fmt(state.pages) }}</span>
      </span>
      <button
        type="button"
        :class="navBtn"
        :disabled="!state.hasNext"
        aria-label="Página siguiente"
        @click="go(state.page + 1)"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>
      </button>
    </div>
  </footer>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE ListPager — el pie estándar de un listado paginado.
 *
 *   <FlickerlessSurface :loading="loading">
 *     <table>…</table>
 *     <ListPager v-model:page="page" :page-size="pageSize" :total="meta?.total" :has-more="meta?.hasMore"
 *                singular="factura" plural="facturas" />
 *   </FlickerlessSurface>
 *
 * "Mostrando 11–20 de 57 facturas" + ‹ 2 / 6 ›. El total de páginas se deriva del
 * total y del tamaño de página. Hasta la primera respuesta muestra «—», nunca
 * "0 de 0" (eso es una cifra falsa, ver Flickerless).
 */
import { computed } from 'vue';
import { pageState, pageSummary } from '../../../core/pagination/pagination.js';
import { formatNumber } from '../../../core/formatters/formatters.js';
import { FlickerlessValue } from '../../../vendor/flickerless/vue/index.js';

const props = withDefaults(
  defineProps<{
    page: number;
    pageSize: number;
    /** Filas de la consulta completa (no las cargadas). `undefined` mientras no hay respuesta. */
    total?: number | null;
    /** Lo dice el servidor (`meta.hasMore`). */
    hasMore?: boolean;
    singular?: string;
    plural?: string;
  }>(),
  { total: undefined, hasMore: undefined, singular: 'registro', plural: 'registros' },
);

const emit = defineEmits<{ 'update:page': [page: number] }>();

const navBtn = 'flex size-8.5 cursor-pointer items-center justify-center rounded-control border border-border bg-surface-raised text-foreground transition hover:bg-surface-hover disabled:cursor-default disabled:opacity-40';

const settled = computed(() => props.total !== undefined && props.total !== null);
const meta = computed(() => ({ page: props.page, pageSize: props.pageSize, total: props.total ?? 0, hasMore: props.hasMore }));
const state = computed(() => pageState(meta.value));
const fmt = (n: number) => formatNumber(n, { maximumFractionDigits: 0 });
const summary = computed(() => pageSummary(meta.value, { singular: props.singular, plural: props.plural, format: fmt }));

function go(page: number) {
  if (page >= 1 && page !== props.page) emit('update:page', page);
}
</script>
