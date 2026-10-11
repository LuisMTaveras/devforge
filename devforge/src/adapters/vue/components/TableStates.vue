<template>
  <!-- Recargando con filas en pantalla: se quedan (la superficie las atenúa) y arriba corre la barra. -->
  <tr v-if="reloading" aria-hidden="true">
    <td :colspan="cols" style="position: relative; height: 0; padding: 0; border: 0">
      <div class="flickerless-progress-bar" style="position: absolute; top: 0; left: 0; right: 0"></div>
    </td>
  </tr>

  <!-- Sin respuesta y sin nada que conservar: la tabla real con «—». -->
  <FlickerlessTableShell v-if="empty && (loading || (!answered && !error))" :cols="cols" :rows="shellRows" :cell-class="cellClass" />

  <!-- Un fallo de carga NO es una lista vacía: se enseña el motivo y se ofrece reintentar. -->
  <tr v-else-if="error">
    <td :colspan="cols" class="px-5 py-12 text-center">
      <span class="mx-auto flex size-10 items-center justify-center rounded-full bg-danger/10 text-danger">
        <DfIcon name="error" class="size-5" />
      </span>
      <p class="mt-2 text-small font-bold text-foreground">{{ errorTitle }}</p>
      <p class="mx-auto mt-0.5 max-w-md text-caption text-muted-foreground">{{ error }}</p>
      <button
        type="button"
        class="mt-3 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-control border border-border bg-surface-raised px-3.5 text-small font-bold text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="emit('retry')"
      >
        <DfIcon name="refresh" class="size-4" /> {{ retryText }}
      </button>
    </td>
  </tr>

  <tr v-else-if="empty">
    <td :colspan="cols" class="px-5 py-12 text-center">
      <span class="mx-auto flex size-10 items-center justify-center rounded-full bg-surface text-muted-foreground">
        <DfIcon :name="icon" class="size-5" />
      </span>
      <p class="mt-2 text-small font-bold text-foreground">{{ emptyTitle }}</p>
      <p v-if="emptyHint" class="mt-0.5 text-caption text-muted-foreground">{{ emptyHint }}</p>
      <div v-if="$slots.default" class="mt-3 flex justify-center gap-2"><slot /></div>
    </td>
  </tr>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE TableStates — los tres estados que no son filas: cargando, error y vacío, con el
 * mismo texto y tamaño en todas las tablas. Va DENTRO del `<tbody>`, antes del `v-for`:
 *
 *   <tbody>
 *     <TableStates :cols="7" :loading="loading" :error="loadError" :empty="!rows.length"
 *                  empty-title="Aún no hay facturas" @retry="load" />
 *     <tr v-for="row in error ? [] : rows" :key="row.id">…</tr>
 *   </tbody>
 *
 * Mientras recarga, las filas que ya estaban se quedan; la carcasa con «—» solo aparece si no
 * hay ninguna que conservar. `error` es el mensaje ya normalizado (`normalizeApiError(e).message`).
 * El «vacío» solo se pinta con una respuesta en la mano (`settled`, o el de la superficie que la envuelve).
 */
import { computed, inject } from 'vue';
import { FLICKERLESS_SETTLED, FlickerlessTableShell, useFlickerless } from '../../../vendor/flickerless/vue/index.js';
import type { IconName } from '../../shared/icon-paths.js';
import { DfIcon } from './DfIcon.js';

const props = withDefaults(
  defineProps<{
    /** Columnas de la tabla: el `colspan` de la fila de estado. */
    cols: number;
    loading?: boolean;
    /** Motivo del fallo para el usuario. Vacío = no hubo fallo. */
    error?: string | null;
    /** No hay filas en pantalla. Con `loading`, pinta la carcasa; sin él, el vacío. */
    empty?: boolean;
    icon?: IconName;
    emptyTitle?: string;
    emptyHint?: string;
    errorTitle?: string;
    retryText?: string;
    shellRows?: number;
    cellClass?: string;
    /** Ya hubo respuesta. Sin la prop se lee de la `<FlickerlessSurface>` que envuelve la tabla. */
    settled?: boolean;
  }>(),
  {
    loading: false,
    error: '',
    empty: false,
    icon: 'inbox',
    emptyTitle: 'Sin resultados',
    emptyHint: '',
    errorTitle: 'No se pudo cargar la consulta',
    retryText: 'Reintentar',
    shellRows: 4,
    cellClass: 'px-3.5 py-2.5',
    settled: undefined,
  },
);

const emit = defineEmits<{ retry: [] }>();

const { isVisibleLoading } = useFlickerless(() => ({ loading: props.loading && !props.empty, delayMs: 180 }));
const reloading = computed(() => isVisibleLoading.value && !props.empty);
// «Vacío» solo con una respuesta en la mano: antes de la primera, la tabla real con «—».
const surfaceSettled = inject(FLICKERLESS_SETTLED, null);
const answered = computed(() => props.settled ?? surfaceSettled?.value ?? true);
</script>
