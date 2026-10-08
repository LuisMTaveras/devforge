<template>
  <div class="flex shrink-0 flex-wrap items-center gap-2">
    <div class="flex h-10 shrink-0 items-center gap-1 rounded-control border border-border bg-surface-raised px-2">
      <!-- Flechas solo con un día: mover «este mes» un día no significa nada. -->
      <button v-if="single" type="button" :class="iconBtn" title="Día anterior" aria-label="Día anterior" @click="step(-1)">
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" /></svg>
      </button>

      <div class="flex items-center gap-1 px-1 text-small">
        <span class="text-muted-foreground">Período:</span>
        <div class="w-44">
          <SelectField
            :model-value="modelValue.preset"
            :options="options"
            compact
            aria-label="Período"
            class="h-8! min-h-8! border-transparent! bg-transparent! px-2! font-bold"
            @update:model-value="onPreset($event as RangePreset)"
          />
        </div>
      </div>

      <button v-if="single" type="button" :class="iconBtn" title="Día siguiente" aria-label="Día siguiente" @click="step(1)">
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>
      </button>
      <button
        v-if="modelValue.preset !== 'today'"
        type="button"
        class="cursor-pointer rounded-lg px-2.5 py-1.5 text-caption font-bold uppercase tracking-wider text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
        title="Volver a hoy"
        @click="onPreset('today')"
      >
        Hoy
      </button>
    </div>

    <div v-if="modelValue.preset === 'custom'" class="w-64 shrink-0">
      <DatePicker
        :model-value="pickerValue"
        range
        compact
        placeholder="Seleccionar rango"
        :clearable="false"
        class="h-10!"
        @update:model-value="onRange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE DateRangeFilter — el filtro de período de los listados.
 *
 *   const periodo = ref(defaultRange('month'))
 *   <DateRangeFilter v-model="periodo" @change="cargar" />
 *   // en el servicio: api.list({ page, pageSize, ...resolveRange(periodo.value) })
 *
 * Une los atajos (Hoy, Ayer, Este mes…), el paso de día con flechas y el rango
 * explícito desde/hasta. `change` solo se emite cuando el rango es utilizable: un
 * personalizado a medio elegir no dispara la consulta.
 */
import { computed } from 'vue';
import {
  RANGE_OPTIONS,
  isSingleDay,
  makeRange,
  normalizeRange,
  stepRangeDay,
  type DateRange,
  type RangePreset,
} from '../../../core/dates/date-range.js';
import DatePicker from './DatePicker.vue';
import SelectField from './SelectField.vue';

const props = withDefaults(
  defineProps<{
    modelValue: DateRange;
    /** Ocultar "Historial completo" en listados que nunca deben traerlo todo. */
    allowAll?: boolean;
  }>(),
  { allowAll: true },
);

const emit = defineEmits<{
  'update:modelValue': [value: DateRange];
  change: [value: DateRange];
}>();

const iconBtn = 'flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface-hover hover:text-foreground';

const options = computed(() =>
  RANGE_OPTIONS.filter(o => props.allowAll || o.id !== 'all').map(o => ({ value: o.id, label: o.name })),
);
const single = computed(() => isSingleDay(props.modelValue));

function apply(next: DateRange) {
  const value = normalizeRange(next);
  emit('update:modelValue', value);
  if (value.preset !== 'custom' || (value.from && value.to)) emit('change', value);
}

const onPreset = (preset: RangePreset) => apply(makeRange(preset, props.modelValue));
const step = (delta: number) => apply(stepRangeDay(props.modelValue, delta));

const pickerValue = computed(() => [props.modelValue.from, props.modelValue.to].filter(Boolean));

function onRange(value: string | string[]) {
  if (!Array.isArray(value)) return;
  apply({ preset: 'custom', from: value[0] ?? '', to: value[1] ?? '' });
}
</script>
