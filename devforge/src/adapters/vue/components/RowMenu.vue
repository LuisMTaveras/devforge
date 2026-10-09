<template>
  <button
    ref="triggerRef"
    type="button"
    class="grid size-8 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
    :class="isOpen ? 'bg-surface-hover text-foreground' : ''"
    aria-haspopup="menu"
    :aria-expanded="isOpen"
    :aria-label="label"
    :title="label"
    @click.stop="toggle"
  >
    <DfIcon name="ellipsis" class="size-5" />
  </button>

  <Teleport to="body">
    <div
      v-if="isOpen"
      ref="menuRef"
      role="menu"
      tabindex="-1"
      :aria-label="label"
      :style="{ position: 'fixed', left: `${pos.left}px`, top: `${pos.top}px`, width: `${pos.width}px`, zIndex: 9999 }"
      class="rounded-card border border-border bg-surface-raised p-1.5 shadow-popover focus:outline-none"
      @keydown="onKeydown"
    >
      <template v-for="(action, i) in actions" :key="action.id">
        <div v-if="action.separatorBefore" class="my-1 border-t border-border" role="separator" />
        <button
          :ref="el => (itemRefs[i] = el as HTMLButtonElement)"
          type="button"
          role="menuitem"
          :disabled="Boolean(action.disabled)"
          :title="typeof action.disabled === 'string' ? action.disabled : undefined"
          class="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-small transition focus:outline-none"
          :class="itemClass(action)"
          @click="choose(action)"
        >
          <DfIcon v-if="action.icon" :name="action.icon" class="size-4 shrink-0" />
          <span class="flex min-w-0 flex-col">
            <span class="truncate">{{ action.label }}</span>
            <!-- Por qué está apagada: una opción que desaparece no explica nada. -->
            <span v-if="typeof action.disabled === 'string'" class="truncate text-caption text-dim-foreground">{{ action.disabled }}</span>
          </span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE RowMenu — el menú ⋮ de una fila. Vive en `body` (la tabla no lo recorta),
 * abre hacia arriba si no cabe, se cierra con clic afuera / Escape y solo hay UNO abierto.
 * Una acción no disponible se muestra apagada con su motivo (`disabled: 'Ya está anulada'`).
 *
 *   <RowMenu :actions="[
 *     { id: 'ver', label: 'Ver detalle', icon: 'info' },
 *     { id: 'anular', label: 'Anular', tone: 'danger', separatorBefore: true, disabled: !row?.anulable && 'Ya está anulada' },
 *   ]" @select="id => onAccion(id, row)" />
 */
import { nextTick, onScopeDispose, ref, watch } from 'vue';
import { pushEscapeLayer } from '../../../core/overlay/escape-layer.js';
import { menuPosition } from '../../../core/overlay/menu-position.js';
import type { IconName } from '../../shared/icon-paths.js';
import { DfIcon } from './DfIcon.js';

export interface RowAction {
  id: string;
  label: string;
  icon?: IconName;
  tone?: 'neutral' | 'danger';
  /** `true` la apaga; un texto la apaga y explica por qué. */
  disabled?: boolean | string;
  separatorBefore?: boolean;
}

const props = withDefaults(defineProps<{ actions: RowAction[]; label?: string }>(), { label: 'Acciones' });
const emit = defineEmits<{ select: [id: string] }>();

const triggerRef = ref<HTMLButtonElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const itemRefs = ref<HTMLButtonElement[]>([]);
const isOpen = ref(false);
const pos = ref({ left: 0, top: 0, width: 224 });

// Solo un menú abierto en toda la app.
let closeOther: (() => void) | null = null;
const registry = (globalThis as { __dfRowMenuClose?: (() => void) | null });

function close(refocus = false) {
  isOpen.value = false;
  if (refocus) triggerRef.value?.focus();
}

async function open() {
  registry.__dfRowMenuClose?.();
  const rect = triggerRef.value!.getBoundingClientRect();
  pos.value = menuPosition(rect, { entries: props.actions.length });
  isOpen.value = true;
  registry.__dfRowMenuClose = closeOther = () => close();
  await nextTick();
  focusItem(0, 1);
}

const toggle = () => (isOpen.value ? close() : open());
const closeQuiet = () => close();

function choose(action: RowAction) {
  if (action.disabled) return;
  close(true);
  emit('select', action.id);
}

function itemClass(action: RowAction) {
  if (action.disabled) return 'cursor-not-allowed text-dim-foreground opacity-60';
  if (action.tone === 'danger') return 'cursor-pointer text-danger hover:bg-danger/10 focus:bg-danger/10';
  return 'cursor-pointer text-foreground hover:bg-surface-hover focus:bg-surface-hover';
}

function focusItem(from: number, step: 1 | -1) {
  const n = props.actions.length;
  for (let k = 0; k < n; k++) {
    const i = (((from + k * step) % n) + n) % n;
    if (!props.actions[i]?.disabled) return itemRefs.value[i]?.focus();
  }
  menuRef.value?.focus();
}

function onKeydown(e: KeyboardEvent) {
  const current = itemRefs.value.findIndex(el => el === document.activeElement);
  if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(current + 1, 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(current - 1, -1); }
  else if (e.key === 'Home') { e.preventDefault(); focusItem(0, 1); }
  else if (e.key === 'End') { e.preventDefault(); focusItem(props.actions.length - 1, -1); }
  else if (e.key === 'Tab') close();
}

function onPointerDown(e: PointerEvent) {
  const t = e.target as Node;
  if (!menuRef.value?.contains(t) && !triggerRef.value?.contains(t)) close();
}

let releaseEscape: (() => void) | null = null;
watch(isOpen, on => {
  releaseEscape?.();
  releaseEscape = null;
  const method = on ? 'addEventListener' : 'removeEventListener';
  document[method]('pointerdown', onPointerDown as EventListener);
  window[method]('scroll', closeQuiet, true);
  window[method]('resize', closeQuiet);
  if (on) releaseEscape = pushEscapeLayer(() => close(true));
  else if (registry.__dfRowMenuClose === closeOther) registry.__dfRowMenuClose = null;
});

onScopeDispose(() => {
  if (isOpen.value) close();
  releaseEscape?.();
  document.removeEventListener('pointerdown', onPointerDown as EventListener);
  window.removeEventListener('scroll', closeQuiet, true);
  window.removeEventListener('resize', closeQuiet);
});
</script>
