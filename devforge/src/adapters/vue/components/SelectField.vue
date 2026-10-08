<template>
  <div class="relative w-full">
    <button
      ref="triggerRef"
      type="button"
      role="combobox"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      :aria-controls="listboxId"
      :aria-label="label || selectedLabel"
      class="flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-control border bg-surface text-left transition disabled:cursor-not-allowed disabled:opacity-60"
      :class="[
        isOpen ? 'border-primary-border ring-2 ring-ring' : 'border-border hover:border-primary-border',
        compact ? 'min-h-9 px-3 py-1.5 text-small' : 'min-h-11 px-4 py-2.5 text-body',
        $attrs.class,
      ]"
      :disabled="disabled"
      v-bind="triggerAttrs"
      @click="toggleOpen"
      @keydown="onTriggerKeydown"
    >
      <span class="flex min-w-0 flex-1 flex-col">
        <span v-if="label" class="mb-1 text-caption font-bold uppercase leading-none tracking-wider text-muted-foreground">
          {{ label }}
        </span>
        <span class="truncate font-semibold leading-tight" :class="hasSelection ? 'text-foreground' : 'text-dim-foreground'">
          {{ selectedLabel }}
        </span>
      </span>
      <svg
        viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
        class="size-5 shrink-0 transition-transform duration-200"
        :class="isOpen ? 'rotate-180 text-foreground' : 'text-muted-foreground'"
      ><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>
    </button>

    <!-- Teleport: un menú dentro de un modal con overflow no se recorta. -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-95"
        leave-active-class="transition duration-100 ease-in"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="isOpen"
          :id="listboxId"
          ref="popoverRef"
          role="listbox"
          tabindex="-1"
          :aria-label="label || placeholder || 'Opciones'"
          :aria-activedescendant="activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined"
          :style="popoverStyle"
          class="max-h-72 overflow-y-auto rounded-card border border-border bg-surface-raised p-1.5 shadow-popover focus:outline-none"
          @keydown="onListKeydown"
        >
          <template v-for="block in optionGroups" :key="block.group ?? '__'">
            <div
              v-if="block.group"
              role="presentation"
              class="px-3.5 pb-1 pt-2 text-caption font-bold uppercase tracking-wider text-dim-foreground"
            >
              {{ block.group }}
            </div>
            <button
              v-for="opt in block.items"
              :id="`${listboxId}-${opt.index}`"
              :key="String(opt.value)"
              type="button"
              role="option"
              :aria-selected="isSelected(opt.value)"
              :aria-disabled="opt.disabled || undefined"
              :disabled="opt.disabled"
              class="flex w-full items-center justify-between gap-3 rounded-control border px-3.5 py-2.5 text-left text-body transition"
              :class="optionClass(opt)"
              @click="select(opt)"
              @mouseenter="activeIndex = opt.index"
            >
              <span class="flex min-w-0 flex-col">
                <span class="truncate">{{ opt.label }}</span>
                <span v-if="opt.hint" class="truncate text-caption font-normal text-dim-foreground">{{ opt.hint }}</span>
              </span>
              <svg v-if="isSelected(opt.value)" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4 shrink-0 text-foreground">
                <path fill-rule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z" clip-rule="evenodd" />
              </svg>
            </button>
          </template>

          <p v-if="!flatOptions.length" class="px-4 py-3 text-center text-caption text-dim-foreground">
            Sin opciones disponibles
          </p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE SelectField — el combo estándar. Reemplaza al select nativo del navegador.
 *
 * El nativo lo pinta el navegador: ignora el tema Claro/Oscuro y se recorta dentro
 * de un modal con `overflow`. Este menú se teleporta a `body`, usa los tokens del
 * tema y es accesible (combobox + listbox, flechas, Enter, Escape, Home/End).
 *
 *   <SelectField v-model="filters.estado" label="Estado" :options="estados" />
 *
 * Opciones: `{ value, label, disabled?, group?, hint? }` (o `string | number`).
 * Ojo al migrar: el disparador es un `<button>`, así que el `required` nativo NO veta
 * el envío. Valida ese campo en tu `submit()`.
 */
import { computed, nextTick, onUnmounted, ref, useAttrs, useId, watch } from 'vue';

defineOptions({ inheritAttrs: false });

export type SelectValue = string | number | null;

export interface SelectOption {
  value: SelectValue;
  label: string;
  /** Se muestra apagada (no se esconde): el usuario ve que existe y que no aplica. */
  disabled?: boolean;
  /** Encabezado bajo el que se agrupa (el equivalente de `<optgroup>`). */
  group?: string;
  /** Línea de ayuda debajo del nombre, solo en el menú. */
  hint?: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: SelectValue | undefined;
    options: readonly (SelectOption | string | number)[];
    label?: string;
    placeholder?: string;
    compact?: boolean;
    disabled?: boolean;
  }>(),
  { placeholder: 'Seleccionar…', compact: false, disabled: false },
);

const emit = defineEmits<{
  'update:modelValue': [value: SelectValue];
  change: [value: SelectValue];
}>();

const isOpen = ref(false);
const activeIndex = ref(-1);
const triggerRef = ref<HTMLButtonElement | null>(null);
const popoverRef = ref<HTMLElement | null>(null);
const popoverStyle = ref<Record<string, string>>({});
const listboxId = `df-select-${useId()}`;

/** `id`, `title`, `aria-*`… van al disparador. `type` no: lo volvería un botón de envío. */
const attrs = useAttrs();
const triggerAttrs = computed(() => {
  const { class: _class, type: _type, ...rest } = attrs;
  return rest;
});

const flatOptions = computed(() =>
  props.options.map((opt, index) =>
    typeof opt === 'object'
      ? { ...opt, index }
      : { value: opt, label: String(opt), disabled: false, group: undefined, hint: undefined, index },
  ),
);

type FlatOption = (typeof flatOptions.value)[number];

const optionGroups = computed(() => {
  const groups: { group: string | null; items: FlatOption[] }[] = [];
  for (const opt of flatOptions.value) {
    const last = groups[groups.length - 1];
    const group = opt.group ?? null;
    if (last && last.group === group) last.items.push(opt);
    else groups.push({ group, items: [opt] });
  }
  return groups;
});

const isSelected = (value: SelectValue) => String(props.modelValue ?? '') === String(value ?? '');
const selectedOption = computed(() => flatOptions.value.find(o => isSelected(o.value)) ?? null);
/** El vacío cuenta como elegido cuando es una OPCIÓN (el "Todos" de un filtro). */
const hasSelection = computed(() => selectedOption.value !== null && props.modelValue !== undefined);
const selectedLabel = computed(() => (hasSelection.value ? selectedOption.value!.label : props.placeholder));

function optionClass(opt: FlatOption) {
  if (opt.disabled) return 'cursor-not-allowed border-transparent text-dim-foreground opacity-50';
  if (isSelected(opt.value)) return 'cursor-pointer border-primary-border bg-primary-subtle font-semibold text-foreground';
  if (opt.index === activeIndex.value) return 'cursor-pointer border-transparent bg-surface-hover text-foreground';
  return 'cursor-pointer border-transparent text-muted-foreground hover:text-foreground';
}

function updatePosition() {
  const rect = triggerRef.value?.getBoundingClientRect();
  if (!rect) return;
  const openUp = window.innerHeight - rect.bottom < 260 && rect.top > 260;
  const width = Math.max(rect.width, 220);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  popoverStyle.value = {
    position: 'fixed',
    left: `${left}px`,
    width: `${width}px`,
    maxWidth: 'calc(100vw - 1rem)',
    zIndex: '9999',
    transformOrigin: openUp ? 'bottom' : 'top',
    ...(openUp ? { bottom: `${window.innerHeight - rect.top + 6}px` } : { top: `${rect.bottom + 6}px` }),
  };
}

async function open() {
  if (props.disabled || isOpen.value) return;
  updatePosition();
  isOpen.value = true;
  activeIndex.value = selectedOption.value?.index ?? firstEnabled(0, 1);
  await nextTick();
  popoverRef.value?.focus();
  scrollActiveIntoView();
}

function close(refocus = true) {
  isOpen.value = false;
  if (refocus) triggerRef.value?.focus();
}

const toggleOpen = () => (isOpen.value ? close() : open());

function select(opt: FlatOption) {
  if (opt.disabled) return;
  emit('update:modelValue', opt.value);
  emit('change', opt.value);
  close();
}

/** Siguiente opción habilitada desde `from` en dirección `step` (sin dar la vuelta). */
function firstEnabled(from: number, step: 1 | -1): number {
  for (let i = from; i >= 0 && i < flatOptions.value.length; i += step) {
    if (!flatOptions.value[i]?.disabled) return i;
  }
  return activeIndex.value;
}

function scrollActiveIntoView() {
  document.getElementById(`${listboxId}-${activeIndex.value}`)?.scrollIntoView({ block: 'nearest' });
}

function onTriggerKeydown(e: KeyboardEvent) {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
    e.preventDefault();
    open();
  }
}

function onListKeydown(e: KeyboardEvent) {
  const last = flatOptions.value.length - 1;
  const moves: Record<string, () => number> = {
    ArrowDown: () => firstEnabled(activeIndex.value + 1, 1),
    ArrowUp: () => firstEnabled(activeIndex.value - 1, -1),
    Home: () => firstEnabled(0, 1),
    End: () => firstEnabled(last, -1),
  };
  if (moves[e.key]) {
    e.preventDefault();
    activeIndex.value = moves[e.key]();
    scrollActiveIntoView();
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    const opt = flatOptions.value[activeIndex.value];
    if (opt) select(opt);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation(); // no cierra el modal que contiene al campo
    close();
  } else if (e.key === 'Tab') {
    close(false);
  }
}

const onScrollOrResize = () => isOpen.value && updatePosition();
function onPointerDownOutside(event: PointerEvent) {
  const target = event.target as Node | null;
  if (target && !triggerRef.value?.contains(target) && !popoverRef.value?.contains(target)) close(false);
}

// Escuchar solo mientras está ABIERTO: una tabla con un combo por fila no deja
// decenas de manejadores colgando de `document`.
function listen(on: boolean) {
  const method = on ? 'addEventListener' : 'removeEventListener';
  document[method]('pointerdown', onPointerDownOutside as EventListener);
  window[method]('scroll', onScrollOrResize, true);
  window[method]('resize', onScrollOrResize);
}
watch(isOpen, listen);
onUnmounted(() => listen(false));

/** Enfoca el disparador, como `selectEl.focus()` en el nativo. */
defineExpose({ focus: () => triggerRef.value?.focus() });
</script>
