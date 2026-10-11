<template>
  <div class="relative w-full">
    <!-- Disparador -->
    <button
      ref="triggerRef"
      type="button"
      role="combobox"
      :aria-expanded="isOpen"
      :aria-label="label || placeholderText"
      class="flex w-full cursor-pointer select-none items-center justify-between gap-2.5 text-left transition"
      :class="[
        isOpen ? 'border-primary-border bg-surface ring-2 ring-ring' : 'border-border bg-surface hover:border-primary-border',
        compact ? 'min-h-9 rounded-control border px-3 py-1.5 text-small' : 'min-h-11 rounded-control border px-4 py-2.5 text-body',
        disabled ? 'pointer-events-none cursor-not-allowed opacity-60' : '',
        $attrs.class,
      ]"
      :disabled="disabled"
      v-bind="triggerAttrs"
      @click="toggleOpen"
      @keydown="handleKeydown"
    >
      <DfIcon name="calendar" class="size-5 shrink-0 transition-colors" :class="isOpen || hasSelection ? 'text-foreground' : 'text-muted-foreground'" />

      <div class="flex min-w-0 flex-1 flex-col">
        <span v-if="label" class="mb-1 text-caption font-black uppercase leading-none tracking-wider text-primary">{{ label }}</span>
        <span class="truncate font-bold leading-tight tabular-nums" :class="hasSelection ? 'text-foreground' : 'text-dim-foreground'">
          {{ displayLabel }}
        </span>
      </div>

      <!-- Limpiar (con valor) o flecha (sin valor) -->
      <span
        v-if="hasSelection && clearable && !disabled"
        role="button"
        tabindex="0"
        aria-label="Limpiar fecha"
        class="grid size-6 shrink-0 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
        @click.stop="handleClear"
        @keydown.enter.stop.prevent="handleClear"
        @keydown.space.stop.prevent="handleClear"
      >
        <DfIcon name="close" class="size-4" />
      </span>
      <DfIcon
        v-else
        name="chevronDown"
        class="size-5 shrink-0 transition-transform duration-200"
        :class="isOpen ? 'rotate-180 text-foreground' : 'text-muted-foreground'"
      />
    </button>

    <!-- Calendario flotante -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="isOpen"
          ref="popoverRef"
          :style="popoverStyle"
          role="dialog"
          :aria-label="range ? 'Seleccionar rango de fechas' : 'Seleccionar fecha'"
          class="select-none rounded-card border border-border bg-surface-raised p-3 shadow-popover backdrop-blur-md focus:outline-none"
          tabindex="-1"
          @keydown="handlePopoverKeydown"
        >
          <!-- Dos meses lado a lado en rango; uno en fecha suelta -->
          <div :class="range ? 'grid grid-cols-2 gap-5' : ''">
            <!-- ── PANEL IZQUIERDO / ÚNICO ── -->
            <div>
              <div class="mb-2 flex items-center justify-between gap-1 border-b border-border pb-2">
                <button type="button" :class="navBtn" title="Mes anterior" @click="prevMonth">
                  <DfIcon name="chevronLeft" class="size-5" />
                </button>

                <button
                  type="button"
                  class="flex cursor-pointer items-center gap-1.5 rounded-control px-2.5 py-1 text-small font-bold text-foreground transition hover:bg-surface-hover"
                  :title="viewMode === 'days' ? 'Ver meses y años' : 'Ver días'"
                  @click="toggleViewMode"
                >
                  <span>{{ MONTH_NAMES[viewMonth] }} {{ viewYear }}</span>
                  <DfIcon name="chevronDown" class="size-4 transition-transform duration-150" :class="{ 'rotate-180': viewMode === 'monthYear' }" />
                </button>

                <!-- La flecha derecha va en el panel derecho cuando es rango -->
                <button v-if="!range" type="button" :class="navBtn" title="Mes siguiente" @click="nextMonth">
                  <DfIcon name="chevronRight" class="size-5" />
                </button>
                <div v-else class="size-8 shrink-0" />
              </div>

              <!-- Vista rápida de meses y año -->
              <div v-if="viewMode === 'monthYear'" class="py-1">
                <div class="flex items-center justify-between px-2 pb-2">
                  <button type="button" :class="navBtnSmall" title="Año anterior" @click="viewYear--">
                    <DfIcon name="chevronLeft" class="size-4" />
                  </button>
                  <span class="text-body font-bold text-foreground">{{ viewYear }}</span>
                  <button type="button" :class="navBtnSmall" title="Año siguiente" @click="viewYear++">
                    <DfIcon name="chevronRight" class="size-4" />
                  </button>
                </div>
                <div class="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    v-for="(name, idx) in MONTH_NAMES_SHORT"
                    :key="name"
                    type="button"
                    class="cursor-pointer rounded-control py-2 text-small font-medium transition"
                    :class="viewMonth === idx ? 'bg-primary font-bold text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'"
                    @click="selectMonth(idx)"
                  >
                    {{ name }}
                  </button>
                </div>
              </div>

              <!-- Días (panel izquierdo) -->
              <div v-else>
                <div class="mb-1 grid grid-cols-7 gap-1 py-1 text-center text-caption font-black uppercase tracking-wider text-muted-foreground">
                  <span v-for="wd in WEEK_DAYS" :key="wd">{{ wd }}</span>
                </div>
                <div class="grid grid-cols-7 gap-1 text-center">
                  <button
                    v-for="cell in leftCells"
                    :key="cell.dateKey"
                    type="button"
                    class="relative grid size-8.5 cursor-pointer place-items-center rounded-control text-small tabular-nums transition"
                    :class="cellClass(cell)"
                    :disabled="cell.isDisabled"
                    :aria-label="formatDayKey(cell.dateKey)"
                    @click="selectDate(cell.dateKey)"
                    @mouseenter="setHoverDate(cell.dateKey)"
                    @mouseleave="setHoverDate('')"
                  >
                    {{ cell.day }}
                  </button>
                </div>
              </div>
            </div>

            <!-- ── PANEL DERECHO (solo rango): siempre el mes siguiente ── -->
            <div v-if="range">
              <div class="mb-2 flex items-center justify-between gap-1 border-b border-border pb-2">
                <div class="size-8 shrink-0" />
                <button
                  type="button"
                  class="flex cursor-pointer items-center gap-1.5 rounded-control px-2.5 py-1 text-small font-bold text-foreground transition hover:bg-surface-hover"
                  @click="toggleViewMode"
                >
                  <span>{{ MONTH_NAMES[rightMonth] }} {{ rightYear }}</span>
                  <DfIcon name="chevronDown" class="size-4 transition-transform duration-150" :class="{ 'rotate-180': viewMode === 'monthYear' }" />
                </button>
                <button type="button" :class="navBtn" title="Mes siguiente" @click="nextMonth">
                  <DfIcon name="chevronRight" class="size-5" />
                </button>
              </div>
              <div class="mb-1 grid grid-cols-7 gap-1 py-1 text-center text-caption font-black uppercase tracking-wider text-muted-foreground">
                <span v-for="wd in WEEK_DAYS" :key="wd">{{ wd }}</span>
              </div>
              <div class="grid grid-cols-7 gap-1 text-center">
                <button
                  v-for="cell in rightCells"
                  :key="cell.dateKey"
                  type="button"
                  class="relative grid size-8.5 cursor-pointer place-items-center rounded-control text-small tabular-nums transition"
                  :class="cellClass(cell)"
                  :disabled="cell.isDisabled"
                  :aria-label="formatDayKey(cell.dateKey)"
                  @click="selectDate(cell.dateKey)"
                  @mouseenter="setHoverDate(cell.dateKey)"
                  @mouseleave="setHoverDate('')"
                >
                  {{ cell.day }}
                </button>
              </div>
            </div>
          </div>

          <!-- Pista del rango -->
          <div v-if="range" class="mb-0.5 mt-2 text-center text-caption text-muted-foreground">
            <span v-if="selectingFirst">Haz clic en la <strong class="text-foreground">fecha de inicio</strong></span>
            <span v-else>Ahora selecciona la <strong class="text-foreground">fecha final</strong></span>
          </div>

          <!-- Pie -->
          <div class="mt-2.5 flex items-center justify-between border-t border-border pt-2.5">
            <button type="button" :class="footerBtn" @click="selectToday">Hoy</button>
            <div class="flex items-center gap-1">
              <button
                v-if="hasSelection && clearable"
                type="button"
                class="cursor-pointer rounded-control px-2.5 py-1 text-caption font-bold text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
                @click="handleClear"
              >
                Borrar
              </button>
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
 * ⚡ DEVFORGE DatePicker — el calendario (port de B2BDatePicker de Snowlr).
 *
 * En una pantalla NO se usa directo:
 *   · campo de formulario  → <DateField v-model="form.fecha" label="Fecha" />
 *   · filtro de un listado → <DateRangeFilter v-model="periodo" @change="cargar" />
 * Directo solo cuando hace falta un rango suelto fuera de un listado:
 *   <DatePicker v-model="rango" range />          // ['2026-10-01', '2026-10-31']
 *
 * El valor es una CLAVE `YYYY-MM-DD` (o `[desde, hasta]`), nunca un `Date`: así «hoy»
 * no depende de la zona del navegador. Muestra `dd/mm/aaaa`.
 */
import { computed, onUnmounted, ref, useAttrs, watch } from 'vue';
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
import { DfIcon } from './DfIcon.js';

defineOptions({ inheritAttrs: false });

type Model = string | Date | null | undefined | (string | Date)[];

const props = withDefaults(
  defineProps<{
    modelValue?: Model;
    /** Dos meses lado a lado; el valor es `[desde, hasta]`. */
    range?: boolean;
    /** Rótulo dentro del campo, en mayúsculas (como en Snowlr). */
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

const navBtn = 'grid size-8 shrink-0 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground';
const navBtnSmall = 'grid size-7 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground';
const footerBtn = 'cursor-pointer rounded-control px-2.5 py-1 text-caption font-bold text-muted-foreground transition hover:bg-surface-hover hover:text-foreground';

const attrs = useAttrs();
const triggerAttrs = computed(() => {
  const { class: _class, type: _type, ...rest } = attrs;
  return rest;
});

const triggerRef = ref<HTMLButtonElement | null>(null);
const popoverRef = ref<HTMLDivElement | null>(null);
const isOpen = ref(false);
const viewMode = ref<'days' | 'monthYear'>('days');
/** Día bajo el cursor mientras se elige el final de un rango. */
const hoverDate = ref('');

/** Rango normalizado: 0, 1 o 2 claves (los vacíos del final no cuentan). */
const rangeValue = computed<string[]>(() => {
  if (!Array.isArray(props.modelValue)) return [];
  const keys = props.modelValue.map(v => toDayKey(v));
  while (keys.length && !keys[keys.length - 1]) keys.pop();
  return keys.slice(0, 2);
});
const singleValue = computed(() => (Array.isArray(props.modelValue) ? '' : toDayKey(props.modelValue)));

const hasSelection = computed(() => (props.range ? rangeValue.value.some(Boolean) : Boolean(singleValue.value)));
const placeholderText = computed(() => props.placeholder || (props.range ? 'Seleccionar rango' : 'Seleccionar fecha'));
const displayLabel = computed(() => {
  if (props.range) {
    const [start, end] = rangeValue.value;
    if (start && end) return `${formatDayKey(start)} — ${formatDayKey(end)}`;
    if (start) return `${formatDayKey(start)} — ...`;
    return placeholderText.value;
  }
  return singleValue.value ? formatDayKey(singleValue.value) : placeholderText.value;
});

// Mes a la vista
const anchor = computed(() => parseYearMonth(props.range ? rangeValue.value[0] : singleValue.value));
const viewYear = ref(anchor.value.year);
const viewMonth = ref(anchor.value.month);
const rightMonth = computed(() => (viewMonth.value === 11 ? 0 : viewMonth.value + 1));
const rightYear = computed(() => (viewMonth.value === 11 ? viewYear.value + 1 : viewYear.value));

const leftCells = computed(() => buildCalendar(viewYear.value, viewMonth.value, { min: props.min, max: props.max }));
const rightCells = computed(() => buildCalendar(rightYear.value, rightMonth.value, { min: props.min, max: props.max }));

/** Va a elegir el INICIO de un rango (nada elegido, o un rango completo). */
const selectingFirst = computed(() => rangeValue.value.length === 0 || rangeValue.value.length === 2);

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11;
    viewYear.value--;
  } else viewMonth.value--;
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0;
    viewYear.value++;
  } else viewMonth.value++;
}

const toggleViewMode = () => (viewMode.value = viewMode.value === 'days' ? 'monthYear' : 'days');

function selectMonth(idx: number) {
  viewMonth.value = idx;
  viewMode.value = 'days';
}

function isSelected(key: string) {
  return props.range ? rangeValue.value.includes(key) : singleValue.value === key;
}

function isInRange(key: string) {
  if (!props.range) return false;
  const [start, end] = rangeValue.value;
  if (start && end) return key > start && key < end;
  // Previsualización: con el inicio elegido, el cursor dibuja el rango.
  if (start && hoverDate.value) {
    const hover = hoverDate.value;
    if (hover > start) return key > start && key < hover;
    if (hover < start) return key > hover && key < start;
  }
  return false;
}

const isHoverEnd = (key: string) => props.range && rangeValue.value.length === 1 && key === hoverDate.value;

function cellClass(cell: CalendarCell): string[] {
  const cls: string[] = [];
  if (isSelected(cell.dateKey)) cls.push('z-10', 'bg-primary', 'font-black', 'text-primary-foreground', 'shadow-sm');
  else if (isHoverEnd(cell.dateKey)) cls.push('bg-primary/70', 'font-black', 'text-primary-foreground');
  else if (isInRange(cell.dateKey)) cls.push('bg-primary-subtle', 'font-bold', 'text-foreground');
  else if (cell.isToday) cls.push('border', 'border-primary', 'font-bold', 'text-primary', 'hover:bg-surface-hover');
  else if (cell.isCurrentMonth) cls.push('text-foreground', 'hover:bg-surface-hover');
  else cls.push('text-dim-foreground', 'opacity-40', 'hover:bg-surface-hover', 'hover:opacity-90');
  if (cell.isDisabled) cls.push('pointer-events-none', 'cursor-not-allowed', 'opacity-20');
  return cls;
}

function setHoverDate(key: string) {
  if (props.range && rangeValue.value.length === 1) hoverDate.value = key;
}

function commit(value: string | string[]) {
  emit('update:modelValue', value);
  emit('change', value);
}

function selectDate(key: string) {
  if (!props.range) {
    commit(key);
    close();
    return;
  }
  if (selectingFirst.value) {
    commit([key]); // empieza un rango nuevo
    return;
  }
  const start = rangeValue.value[0];
  commit(key < start ? [key, start] : [start, key]);
  hoverDate.value = '';
  close();
}

function selectToday() {
  const today = todayKey();
  if ((props.min && today < props.min) || (props.max && today > props.max)) return;
  const { year, month } = parseYearMonth(today);
  viewYear.value = year;
  viewMonth.value = month;
  selectDate(today);
}

function handleClear() {
  commit(props.range ? [] : '');
}

// ── Posición del calendario ─────────────────────────────────────────────
const popoverStyle = ref<Record<string, string>>({});

function updatePosition() {
  const rect = triggerRef.value?.getBoundingClientRect();
  if (!rect) return;
  const estimatedHeight = 340;
  const openUp = window.innerHeight - rect.bottom < estimatedHeight && rect.top > estimatedHeight;
  const width = props.range ? 616 : 304;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  popoverStyle.value = {
    position: 'fixed',
    left: `${left}px`,
    width: `${width}px`,
    maxWidth: 'calc(100vw - 1rem)',
    zIndex: '9999',
    transformOrigin: openUp ? 'bottom' : 'top',
    ...(openUp ? { bottom: `${window.innerHeight - rect.top + 6}px`, top: 'auto' } : { top: `${rect.bottom + 6}px`, bottom: 'auto' }),
  };
}

function open() {
  if (props.disabled) return;
  updatePosition();
  isOpen.value = true;
}

function close(refocus = true) {
  isOpen.value = false;
  if (refocus) triggerRef.value?.focus();
}

const toggleOpen = () => (isOpen.value ? close() : open());

function handleKeydown(e: KeyboardEvent) {
  if (props.disabled) return;
  if (e.key === 'Escape' && isOpen.value) {
    // Cierra el calendario y no el modal que lo contiene.
    e.stopPropagation();
    e.preventDefault();
    close();
  } else if ((e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') && !isOpen.value) {
    e.preventDefault();
    open();
  }
}

function handlePopoverKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    e.preventDefault();
    close();
  }
}

const handleScrollOrResize = () => isOpen.value && updatePosition();
function handlePointerDownOutside(event: PointerEvent) {
  const target = event.target as Node | null;
  if (target && !triggerRef.value?.contains(target) && !popoverRef.value?.contains(target)) close(false);
}

// Los escuchas de `document` solo existen con el calendario ABIERTO.
watch(isOpen, open => {
  const method = open ? 'addEventListener' : 'removeEventListener';
  if (open) {
    viewMode.value = 'days';
    hoverDate.value = '';
    viewYear.value = anchor.value.year;
    viewMonth.value = anchor.value.month;
  } else hoverDate.value = '';
  document[method]('pointerdown', handlePointerDownOutside as EventListener);
  window[method]('scroll', handleScrollOrResize, true);
  window[method]('resize', handleScrollOrResize);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', handlePointerDownOutside as EventListener);
  window.removeEventListener('scroll', handleScrollOrResize, true);
  window.removeEventListener('resize', handleScrollOrResize);
});

defineExpose({ focus: () => triggerRef.value?.focus() });
</script>
