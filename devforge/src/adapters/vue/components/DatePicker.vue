<template>
  <div class="relative w-full">
    <button
      ref="triggerRef"
      type="button"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-label="label || placeholderText"
      class="flex w-full cursor-pointer select-none items-center gap-2.5 rounded-control border bg-surface text-left transition disabled:cursor-not-allowed disabled:opacity-60"
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
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5 shrink-0" :class="hasSelection ? 'text-foreground' : 'text-muted-foreground'">
        <path fill-rule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clip-rule="evenodd" />
      </svg>
      <span class="flex min-w-0 flex-1 flex-col">
        <span v-if="label" class="mb-1 text-caption font-bold uppercase leading-none tracking-wider text-muted-foreground">{{ label }}</span>
        <span class="truncate font-semibold leading-tight tabular-nums" :class="hasSelection ? 'text-foreground' : 'text-dim-foreground'">
          {{ displayLabel }}
        </span>
      </span>
      <span
        v-if="hasSelection && clearable && !disabled"
        role="button"
        tabindex="0"
        aria-label="Borrar fecha"
        class="grid size-6 shrink-0 place-items-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
        @click.stop="clear"
        @keydown.enter.stop.prevent="clear"
        @keydown.space.stop.prevent="clear"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
      </span>
    </button>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-95"
        leave-active-class="transition duration-100 ease-in"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="isOpen"
          ref="popoverRef"
          role="dialog"
          :aria-label="range ? 'Seleccionar rango de fechas' : 'Seleccionar fecha'"
          tabindex="-1"
          :style="popoverStyle"
          class="select-none rounded-card border border-border bg-surface-raised p-3 shadow-popover focus:outline-none"
          @keydown.esc.stop.prevent="close()"
        >
          <!-- Vista de meses / años -->
          <div v-if="viewMode === 'months'">
            <div class="mb-2 flex items-center justify-between border-b border-border pb-2">
              <button type="button" :class="navBtn" title="Año anterior" @click="viewYear--"><span v-html="chevronLeft" /></button>
              <span class="text-body font-semibold text-foreground">{{ viewYear }}</span>
              <button type="button" :class="navBtn" title="Año siguiente" @click="viewYear++"><span v-html="chevronRight" /></button>
            </div>
            <div class="grid grid-cols-3 gap-1.5">
              <button
                v-for="(name, idx) in MONTH_NAMES_SHORT"
                :key="name"
                type="button"
                class="cursor-pointer rounded-control py-2 text-small transition"
                :class="viewMonth === idx ? 'bg-primary font-semibold text-primary-foreground' : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'"
                @click="pickMonth(idx)"
              >
                {{ name }}
              </button>
            </div>
          </div>

          <!-- Vista de días: un mes, o dos lado a lado en rango -->
          <div v-else :class="range ? 'grid grid-cols-1 gap-5 sm:grid-cols-2' : ''">
            <div v-for="(panel, p) in panels" :key="p">
              <div class="mb-2 flex items-center justify-between gap-1 border-b border-border pb-2">
                <button v-if="p === 0" type="button" :class="navBtn" title="Mes anterior" @click="shiftMonth(-1)"><span v-html="chevronLeft" /></button>
                <span v-else class="size-8" />
                <button
                  type="button"
                  class="cursor-pointer rounded-control px-2.5 py-1 text-small font-semibold text-foreground transition hover:bg-surface-hover"
                  title="Ver meses y años"
                  @click="viewMode = 'months'"
                >
                  {{ MONTH_NAMES[panel.month] }} {{ panel.year }}
                </button>
                <button v-if="p === panels.length - 1" type="button" :class="navBtn" title="Mes siguiente" @click="shiftMonth(1)"><span v-html="chevronRight" /></button>
                <span v-else class="size-8" />
              </div>
              <div class="mb-1 grid grid-cols-7 gap-1 py-1 text-center text-caption font-bold uppercase tracking-wider text-muted-foreground">
                <span v-for="wd in WEEK_DAYS" :key="wd">{{ wd }}</span>
              </div>
              <div class="grid grid-cols-7 gap-1 text-center">
                <button
                  v-for="cell in panel.cells"
                  :key="cell.dateKey"
                  type="button"
                  class="grid size-8.5 place-items-center rounded-control text-small tabular-nums transition"
                  :class="cellClass(cell)"
                  :disabled="cell.isDisabled"
                  :aria-label="formatDayKey(cell.dateKey)"
                  :aria-pressed="isEndpoint(cell.dateKey)"
                  @click="pick(cell.dateKey)"
                  @mouseenter="hoverKey = cell.dateKey"
                  @mouseleave="hoverKey = ''"
                >
                  {{ cell.day }}
                </button>
              </div>
            </div>
          </div>

          <p v-if="range && viewMode === 'days'" class="mt-2 text-center text-caption text-muted-foreground">
            <template v-if="rangeValue.length === 1">Ahora selecciona la <strong class="text-foreground">fecha final</strong></template>
            <template v-else>Haz clic en la <strong class="text-foreground">fecha de inicio</strong></template>
          </p>

          <div class="mt-2.5 flex items-center justify-between border-t border-border pt-2.5">
            <button type="button" :class="footerBtn" @click="pickToday">Hoy</button>
            <div class="flex items-center gap-1">
              <button v-if="hasSelection && clearable" type="button" :class="footerBtn" class="hover:bg-danger/10! hover:text-danger!" @click="clear">Borrar</button>
              <button type="button" :class="footerBtn" @click="close()">Cerrar</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE DatePicker — selector de fecha estándar (una fecha o un rango).
 *
 *   <DatePicker v-model="form.fechaVencimiento" label="Vencimiento" :min="hoy" />
 *   <DatePicker v-model="rango" range placeholder="Seleccionar rango" />   // ['2026-10-01', '2026-10-31']
 *
 * El v-model es una CLAVE `YYYY-MM-DD` (o `[desde, hasta]` en rango), nunca un `Date`:
 * así "hoy" no depende de la zona del navegador (ver core/dates/date-range.ts).
 * Muestra `dd/mm/aaaa`. El input nativo `type="date"` está prohibido: ignora el tema.
 */
import { computed, nextTick, onUnmounted, ref, useAttrs, watch } from 'vue';
import {
  MONTH_NAMES,
  MONTH_NAMES_SHORT,
  WEEK_DAYS,
  buildCalendar,
  formatDayKey,
  parseYearMonth,
  toDayKey,
  todayKey,
  type CalendarCell,
} from '../../../core/dates/date-range.js';

defineOptions({ inheritAttrs: false });

type Model = string | Date | null | undefined | (string | Date)[];

const props = withDefaults(
  defineProps<{
    modelValue?: Model;
    range?: boolean;
    label?: string;
    placeholder?: string;
    /** Clave `YYYY-MM-DD` mínima / máxima seleccionable. */
    min?: string;
    max?: string;
    compact?: boolean;
    disabled?: boolean;
    clearable?: boolean;
  }>(),
  { modelValue: '', range: false, compact: false, disabled: false, clearable: true },
);

const emit = defineEmits<{
  'update:modelValue': [value: string | string[]];
  change: [value: string | string[]];
}>();

const chevronLeft = '<svg viewBox="0 0 20 20" fill="currentColor" class="size-5"><path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/></svg>';
const chevronRight = '<svg viewBox="0 0 20 20" fill="currentColor" class="size-5"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>';
const navBtn = 'grid size-8 shrink-0 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground';
const footerBtn = 'cursor-pointer rounded-control px-2.5 py-1 text-caption font-semibold text-muted-foreground transition hover:bg-surface-hover hover:text-foreground';

const attrs = useAttrs();
const triggerAttrs = computed(() => {
  const { class: _class, type: _type, ...rest } = attrs;
  return rest;
});

const triggerRef = ref<HTMLButtonElement | null>(null);
const popoverRef = ref<HTMLElement | null>(null);
const popoverStyle = ref<Record<string, string>>({});
const isOpen = ref(false);
const viewMode = ref<'days' | 'months'>('days');
const hoverKey = ref('');

/** Rango normalizado: 0, 1 o 2 claves (sin vacíos al final). */
const rangeValue = computed<string[]>(() =>
  Array.isArray(props.modelValue) ? props.modelValue.map(v => toDayKey(v)).filter(Boolean).slice(0, 2) : [],
);
const singleValue = computed(() => (Array.isArray(props.modelValue) ? '' : toDayKey(props.modelValue)));

const hasSelection = computed(() => (props.range ? rangeValue.value.length > 0 : Boolean(singleValue.value)));
const placeholderText = computed(() => props.placeholder ?? (props.range ? 'Seleccionar rango' : 'Seleccionar fecha'));
const displayLabel = computed(() => {
  if (!hasSelection.value) return placeholderText.value;
  if (!props.range) return formatDayKey(singleValue.value);
  const [from, to] = rangeValue.value;
  return `${formatDayKey(from)} — ${to ? formatDayKey(to) : '…'}`;
});

const viewYear = ref(0);
const viewMonth = ref(0);

function resetView() {
  const anchor = parseYearMonth(props.range ? rangeValue.value[0] : singleValue.value);
  viewYear.value = anchor.year;
  viewMonth.value = anchor.month;
  viewMode.value = 'days';
  hoverKey.value = '';
}

const panels = computed(() => {
  const count = props.range ? 2 : 1;
  return Array.from({ length: count }, (_, i) => {
    const offset = viewMonth.value + i;
    const year = viewYear.value + Math.floor(offset / 12);
    const month = offset % 12;
    return { year, month, cells: buildCalendar(year, month, { min: props.min, max: props.max }) };
  });
});

function shiftMonth(delta: number) {
  const total = viewYear.value * 12 + viewMonth.value + delta;
  viewYear.value = Math.floor(total / 12);
  viewMonth.value = total % 12;
}

function pickMonth(idx: number) {
  viewMonth.value = idx;
  viewMode.value = 'days';
}

const isEndpoint = (key: string) => (props.range ? rangeValue.value.includes(key) : singleValue.value === key);

function isInRange(key: string) {
  if (!props.range) return false;
  const [from, to] = rangeValue.value;
  // Con una sola fecha elegida, el hover previsualiza el rango.
  const end = to ?? (from && hoverKey.value ? hoverKey.value : '');
  if (!from || !end) return false;
  const [a, b] = from < end ? [from, end] : [end, from];
  return key > a && key < b;
}

function cellClass(cell: CalendarCell) {
  if (cell.isDisabled) return 'cursor-not-allowed text-dim-foreground opacity-30';
  if (isEndpoint(cell.dateKey)) return 'cursor-pointer bg-primary font-bold text-primary-foreground shadow-sm';
  if (props.range && rangeValue.value.length === 1 && cell.dateKey === hoverKey.value) {
    return 'cursor-pointer bg-primary/70 font-bold text-primary-foreground';
  }
  if (isInRange(cell.dateKey)) return 'cursor-pointer bg-primary-subtle font-semibold text-foreground';
  if (cell.isToday) return 'cursor-pointer border border-primary font-semibold text-foreground hover:bg-surface-hover';
  if (cell.isCurrentMonth) return 'cursor-pointer text-foreground hover:bg-surface-hover';
  return 'cursor-pointer text-dim-foreground opacity-50 hover:bg-surface-hover hover:opacity-90';
}

function commit(value: string | string[]) {
  emit('update:modelValue', value);
  emit('change', value);
}

function pick(key: string) {
  if (!props.range) {
    commit(key);
    close();
    return;
  }
  const current = rangeValue.value;
  if (current.length !== 1) {
    commit([key]); // empieza un rango nuevo
    return;
  }
  const [start] = current;
  commit(key < start ? [key, start] : [start, key]);
  close();
}

function pickToday() {
  const today = todayKey();
  if ((props.min && today < props.min) || (props.max && today > props.max)) return;
  if (props.range) {
    commit([today, today]);
    close();
  } else {
    pick(today);
  }
}

function clear() {
  commit(props.range ? [] : '');
}

function updatePosition() {
  const rect = triggerRef.value?.getBoundingClientRect();
  if (!rect) return;
  const height = 360;
  const openUp = window.innerHeight - rect.bottom < height && rect.top > height;
  const width = props.range ? 616 : 304;
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
  resetView();
  updatePosition();
  isOpen.value = true;
  await nextTick();
  popoverRef.value?.focus();
}

function close(refocus = true) {
  isOpen.value = false;
  if (refocus) triggerRef.value?.focus();
}

const toggleOpen = () => (isOpen.value ? close() : open());

function onTriggerKeydown(e: KeyboardEvent) {
  if (['ArrowDown', 'Enter', ' '].includes(e.key)) {
    e.preventDefault();
    open();
  }
}

const onScrollOrResize = () => isOpen.value && updatePosition();
function onPointerDownOutside(event: PointerEvent) {
  const target = event.target as Node | null;
  if (target && !triggerRef.value?.contains(target) && !popoverRef.value?.contains(target)) close(false);
}
function listen(on: boolean) {
  const method = on ? 'addEventListener' : 'removeEventListener';
  document[method]('pointerdown', onPointerDownOutside as EventListener);
  window[method]('scroll', onScrollOrResize, true);
  window[method]('resize', onScrollOrResize);
}
watch(isOpen, listen);
onUnmounted(() => listen(false));

defineExpose({ focus: () => triggerRef.value?.focus() });
</script>
