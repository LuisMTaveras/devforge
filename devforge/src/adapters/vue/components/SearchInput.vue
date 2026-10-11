<template>
  <div class="relative">
    <DfIcon name="search" class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim-foreground" />
    <input
      ref="input"
      type="search"
      :value="modelValue"
      :placeholder="placeholder"
      :aria-label="ariaLabel || placeholder"
      class="h-10 w-full rounded-control border border-border bg-surface pl-9 pr-9 text-small text-foreground placeholder:text-dim-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
      @input="onInput(($event.target as HTMLInputElement).value)"
      @keydown.enter.prevent="flush"
      @keydown.esc="modelValue && clear($event)"
    />
    <button
      v-if="modelValue"
      type="button"
      class="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover hover:text-foreground"
      :aria-label="clearLabel"
      @click="clear()"
    >
      <DfIcon name="close" class="size-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE SearchInput — la búsqueda de un listado. `v-model` sigue cada tecla; `search` sale
 * cuando el usuario hace una pausa (`debounceMs`), al pulsar Enter o al limpiar. La búsqueda la
 * hace el SERVIDOR (con la página reiniciada a 1): nunca se filtran en el cliente filas ya traídas.
 * Escape limpia (si hay texto; si no, deja pasar el Escape al modal que lo contenga).
 *
 *   <SearchInput v-model="q" placeholder="Buscar por número, cliente o RNC" @search="() => { page = 1; load() }" />
 */
import { onBeforeUnmount, ref } from 'vue';
import { DfIcon } from './DfIcon.js';

const props = withDefaults(
  defineProps<{ modelValue: string; placeholder?: string; ariaLabel?: string; clearLabel?: string; debounceMs?: number }>(),
  { placeholder: 'Buscar…', ariaLabel: '', clearLabel: 'Limpiar búsqueda', debounceMs: 300 },
);
const emit = defineEmits<{ 'update:modelValue': [value: string]; search: [value: string] }>();
const input = ref<HTMLInputElement | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;
let last = props.modelValue;

function fire(value: string) {
  if (timer) clearTimeout(timer);
  timer = null;
  const q = value.trim();
  if (q === last) return;
  last = q;
  emit('search', q);
}

function onInput(value: string) {
  emit('update:modelValue', value);
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => fire(value), props.debounceMs);
}

function flush() {
  fire(props.modelValue);
}

function clear(e?: KeyboardEvent) {
  e?.stopPropagation();
  emit('update:modelValue', '');
  fire('');
  input.value?.focus();
}

onBeforeUnmount(() => timer && clearTimeout(timer));
defineExpose({ focus: () => input.value?.focus() });
</script>
