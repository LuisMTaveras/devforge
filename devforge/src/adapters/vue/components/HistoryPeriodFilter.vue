<template>
  <DateRangeFilter
    v-if="!pending"
    :model-value="modelValue"
    :allow-all="allowAll"
    @update:model-value="emit('update:modelValue', $event)"
    @change="emit('change', $event)"
  />
  <span v-else class="inline-flex h-10 items-center gap-1.5 px-1 text-caption text-muted-foreground">
    <DfIcon name="inbox" class="size-4" /> {{ pendingLabel }}
  </span>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE HistoryPeriodFilter — el filtro de fecha de una bandeja de documentos.
 * Lo PENDIENTE es trabajo y se enseña entero: en esa pestaña no hay rango, y se dice por qué en vez
 * de esconder el control. Lo RESUELTO es historial y se acota con el `DateRangeFilter` de siempre.
 * El servidor aplica la misma regla: «Todos» = pendientes de cualquier fecha + resueltos del rango.
 *
 *   <HistoryPeriodFilter v-model="rango" :pending="estado === 'pendientes'" @change="load" />
 */
import type { DateRange } from '../../../core/dates/date-range.js';
import DateRangeFilter from './DateRangeFilter.vue';
import { DfIcon } from './DfIcon.js';

withDefaults(defineProps<{ modelValue: DateRange; pending?: boolean; pendingLabel?: string; allowAll?: boolean }>(), {
  pending: false,
  pendingLabel: 'Todos los pendientes, de cualquier fecha',
  allowAll: true,
});
const emit = defineEmits<{ 'update:modelValue': [value: DateRange]; change: [value: DateRange] }>();
</script>
