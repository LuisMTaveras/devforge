<template>
  <button
    ref="trigger"
    type="button"
    class="inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full align-middle text-dim-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    :class="{ 'text-foreground': open }"
    :aria-label="`Qué es ${label}`"
    :aria-expanded="open"
    @click.stop.prevent="toggle"
    @mouseenter="onHover(true)"
    @mouseleave="onHover(false)"
    @focus="show"
    @blur="hide"
  >
    <DfIcon name="help" class="size-4" />
  </button>
  <!-- Teleportada a body y fija: dentro de un modal con overflow la burbuja se recortaría. -->
  <Teleport to="body">
    <div
      v-if="open"
      role="tooltip"
      class="fixed z-250 w-[min(20rem,calc(100vw-1.5rem))] rounded-card border border-border bg-surface-raised px-3.5 py-3 text-caption leading-relaxed text-muted-foreground shadow-popover"
      :style="{ top: pos.top === undefined ? undefined : `${pos.top}px`, bottom: pos.bottom === undefined ? undefined : `${pos.bottom}px`, left: `${pos.left}px` }"
      @click.stop
    >
      <p class="mb-1 text-caption font-bold text-foreground">{{ label }}</p>
      <slot><span class="whitespace-pre-line">{{ text }}</span></slot>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE FieldHelp — «qué es este campo y en qué afecta», junto a la etiqueta.
 * No el `title=""` del navegador: ignora el tema, tarda en salir y en una pantalla táctil NO EXISTE.
 * Se abre al tocar y al pasar el cursor (solo con puntero fino), con foco de teclado; se cierra con
 * Escape, al tocar fuera, al desplazar y al perder el foco.
 *
 * Una ayuda no repite la etiqueta («Margen: el margen»): responde qué hace el campo y qué cambia
 * en el resultado. Si no hay nada que decir, el campo necesita mejor nombre, no ayuda.
 *
 *   <label for="tope">Tope de descuento <FieldHelp label="Tope de descuento" text="Lo máximo que un vendedor puede rebajar sin pedir autorización." /></label>
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { DfIcon } from './DfIcon.js';

const props = defineProps<{ label: string; text?: string }>();
const open = ref(false);
const trigger = ref<HTMLElement | null>(null);
const pos = ref<{ top?: number; bottom?: number; left: number }>({ top: 0, left: 0 });
/** El foco (o el cursor) abre justo antes del clic del mismo gesto: ese clic no debe cerrarla. */
let openedAt = 0;
const GUTTER = 12;
const WIDTH = 320;

function place() {
  const el = trigger.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const width = Math.min(WIDTH, window.innerWidth - GUTTER * 2);
  const left = Math.min(Math.max(GUTTER, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - GUTTER);
  // Si no cabe debajo (teclado del teléfono), va encima, PEGADA al icono: se ancla por abajo,
  // así no depende de la altura de la burbuja.
  pos.value = window.innerHeight - rect.bottom < 160 ? { bottom: window.innerHeight - rect.top + 8, left } : { top: rect.bottom + 8, left };
}
function show() {
  place();
  if (!open.value) openedAt = Date.now();
  open.value = true;
}
function hide() {
  open.value = false;
}
function toggle() {
  if (open.value && Date.now() - openedAt > 300) hide();
  else show();
}
/** En táctil el navegador simula un `mouseenter` justo antes del toque: solo puntero fino abre al pasar. */
function onHover(entering: boolean) {
  if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
  if (entering) show();
  else hide();
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    e.stopPropagation();
    hide();
  }
}
onMounted(() => {
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
  document.addEventListener('click', hide);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey, true);
  window.removeEventListener('scroll', hide, true);
  window.removeEventListener('resize', hide);
  document.removeEventListener('click', hide);
});
defineExpose({ label: props.label });
</script>
