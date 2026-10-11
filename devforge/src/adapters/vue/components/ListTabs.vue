<template>
  <nav class="flex h-11 items-center gap-1 overflow-x-auto" role="tablist" :aria-label="label" @keydown="onKey">
    <button
      v-for="(t, i) in tabs"
      :key="t.id"
      :ref="el => (buttons[i] = el as HTMLButtonElement | null)"
      type="button"
      role="tab"
      :aria-selected="t.id === modelValue"
      :tabindex="t.id === modelValue ? 0 : -1"
      class="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-control px-3 text-small font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :class="t.id === modelValue ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'"
      @click="select(t.id)"
    >
      {{ t.label }}
      <span
        v-if="t.count !== undefined"
        class="min-w-5 rounded-full px-1.5 text-center text-caption tabular-nums"
        :class="t.id === modelValue ? 'bg-primary-foreground/15' : 'bg-surface'"
      >
        <FlickerlessValue :value="t.count">{{ formatNumber(t.count) }}</FlickerlessValue>
      </span>
    </button>
  </nav>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE ListTabs — las pestañas de estado de un listado («Todos», «Pendientes»…) con su
 * conteo. El conteo lo da el servidor para TODAS las pestañas a la vez, calculado sobre los mismos
 * filtros SIN el estado (así «Pendientes 12» no cambia al pasar a «Todos»). `count: null` = aún no
 * se sabe («—»); sin `count`, no hay globo. Flechas ←/→ mueven entre pestañas.
 *
 *   <ListTabs v-model="estado" :tabs="[{ id: 'todos', label: 'Todos', count: meta?.counts.todos ?? null }, …]" />
 */
import { ref } from 'vue';
import { formatNumber } from '../../../core/formatters/formatters.js';
import { FlickerlessValue } from '../../../vendor/flickerless/vue/index.js';

export interface ListTab {
  id: string;
  label: string;
  count?: number | null;
}

const props = withDefaults(defineProps<{ modelValue: string; tabs: ListTab[]; label?: string }>(), { label: 'Estados' });
const emit = defineEmits<{ 'update:modelValue': [id: string]; change: [id: string] }>();
const buttons = ref<(HTMLButtonElement | null)[]>([]);

function select(id: string) {
  if (id === props.modelValue) return;
  emit('update:modelValue', id);
  emit('change', id);
}

function onKey(e: KeyboardEvent) {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const i = props.tabs.findIndex(t => t.id === props.modelValue);
  const next = props.tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + props.tabs.length) % props.tabs.length];
  if (!next) return;
  e.preventDefault();
  select(next.id);
  buttons.value[props.tabs.indexOf(next)]?.focus();
}
</script>
