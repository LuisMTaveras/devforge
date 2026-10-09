<template>
  <ModalShell :open="state.open" :title="state.title" size="md" body-class="flex min-h-0 flex-col" @close="tracker.close()">
    <template #subtitle>
      <span v-if="running">Procesando {{ fmt(state.processed + 1 > state.total ? state.total : state.processed + 1) }} de {{ fmt(state.total) }}…</span>
      <span v-else>{{ summary }}</span>
    </template>

    <div class="space-y-3 border-b border-border px-5 py-4">
      <div class="h-2 overflow-hidden rounded-full bg-primary-subtle" role="progressbar" :aria-valuenow="state.processed" :aria-valuemax="state.total" aria-label="Avance del lote">
        <div class="h-full rounded-full bg-primary transition-[width] duration-300" :style="{ width: `${percent}%` }" />
      </div>
      <div class="flex flex-wrap gap-2 text-caption font-semibold">
        <span class="rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-success">{{ batchCountLabel(state.counts.done, 'done', fmt) }}</span>
        <span v-if="state.counts.skipped" class="rounded-full border border-warning/20 bg-warning/10 px-2.5 py-0.5 text-warning">{{ batchCountLabel(state.counts.skipped, 'skipped', fmt) }}</span>
        <span v-if="state.counts.failed" class="rounded-full border border-danger/20 bg-danger/10 px-2.5 py-0.5 text-danger">{{ fmt(state.counts.failed) }} con error</span>
      </div>
      <p v-if="state.error" class="rounded-control border border-danger/20 bg-danger/10 px-3 py-2 text-small text-danger">{{ state.error }}</p>
    </div>

    <ul class="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
      <li
        v-for="item in state.items"
        :key="item.id"
        :ref="el => item.id === state.currentId && el && (el as HTMLElement).scrollIntoView({ block: 'nearest' })"
        class="flex items-start gap-3 px-5 py-2.5"
        :class="item.id === state.currentId ? 'bg-primary-subtle' : ''"
      >
        <DfIcon :name="STATUS[item.status].icon" class="mt-0.5 size-4 shrink-0" :class="[STATUS[item.status].color, item.status === 'RUNNING' ? 'animate-spin' : '']" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-small font-semibold text-foreground">{{ item.label }}</p>
          <p v-if="item.detail || item.sublabel" class="truncate text-caption" :class="item.detail ? STATUS[item.status].color : 'text-muted-foreground'">
            {{ item.detail || item.sublabel }}
          </p>
        </div>
        <span class="shrink-0 text-caption text-muted-foreground">{{ STATUS[item.status].label }}</span>
      </li>
    </ul>

    <template #footer>
      <button
        type="button"
        class="h-9 cursor-pointer rounded-control px-4 text-small font-semibold transition"
        :class="running ? 'border border-border text-muted-foreground hover:bg-surface-hover' : 'bg-primary text-primary-foreground hover:bg-primary-hover'"
        @click="tracker.close()"
      >
        {{ running ? 'Seguir en segundo plano' : 'Cerrar' }}
      </button>
    </template>
  </ModalShell>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE BatchProgressModal — «3 de 10 · Distribuidora del Caribe» mientras corre un lote.
 *
 *   const lote = createBatchTracker()            // @/core/batch/batch-progress
 *   <BatchProgressModal :tracker="lote" />
 *   await lote.run({ title: 'Enviando facturas', items, worker: item => api.enviar(item.id) })
 *
 * Cerrarlo mientras corre solo lo esconde (`lote.reopen()` lo vuelve a mostrar).
 * El único icono que gira es el de la fila en curso: un indicador pequeño, no un spinner que tape.
 */
import { computed, onScopeDispose, ref } from 'vue';
import { batchCountLabel, batchSummary, type BatchItemStatus, type BatchTracker } from '../../../core/batch/batch-progress.js';
import { formatNumber } from '../../../core/formatters/formatters.js';
import type { IconName } from '../../shared/icon-paths.js';
import { DfIcon } from './DfIcon.js';
import ModalShell from './ModalShell.vue';

const props = defineProps<{ tracker: BatchTracker }>();

const state = ref(props.tracker.getState());
onScopeDispose(props.tracker.subscribe(next => (state.value = next)));

const STATUS: Record<BatchItemStatus, { icon: IconName; color: string; label: string }> = {
  PENDING: { icon: 'clock', color: 'text-dim-foreground', label: 'En cola' },
  RUNNING: { icon: 'refresh', color: 'text-foreground', label: 'Procesando' },
  DONE: { icon: 'success', color: 'text-success', label: 'Listo' },
  SKIPPED: { icon: 'minus', color: 'text-warning', label: 'Omitido' },
  FAILED: { icon: 'error', color: 'text-danger', label: 'Error' },
};

const fmt = (n: number) => formatNumber(n, { maximumFractionDigits: 0 });
const running = computed(() => state.value.state === 'RUNNING');
const percent = computed(() => (state.value.total ? Math.round((state.value.processed / state.value.total) * 100) : 0));
const summary = computed(() => batchSummary(state.value, fmt));
</script>
