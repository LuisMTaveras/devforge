<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <!--
        El TELÓN NO CIERRA. Un formulario a medias no se pierde por un clic al lado:
        aquí es estructural, no hay `@click` en el telón que quitar.
        En móvil la hoja sube desde abajo (donde está el pulgar); desde `sm`, centrada.
      -->
      <div
        v-if="open"
        class="fixed inset-0 z-200 flex items-end justify-center bg-overlay backdrop-blur-sm sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <div
          class="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-panel border border-border bg-surface-raised shadow-popover sm:rounded-panel"
          :class="WIDTHS[size]"
        >
          <header class="flex items-start justify-between gap-3 border-b border-border bg-surface px-5 py-4">
            <div class="min-w-0">
              <h2 :id="titleId" class="text-body font-bold text-foreground">{{ title }}</h2>
              <p v-if="subtitle || $slots.subtitle" class="mt-0.5 text-caption text-muted-foreground">
                <slot name="subtitle">{{ subtitle }}</slot>
              </p>
            </div>
            <button
              type="button"
              class="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
              aria-label="Cerrar"
              title="Cerrar"
              @click="emit('close')"
            >
              <DfIcon name="close" class="size-5" />
            </button>
          </header>

          <div class="min-h-0 flex-1" :class="bodyClass">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="flex items-center justify-end gap-2 border-t border-border bg-surface px-5 py-4">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE ModalShell — el armazón de TODO modal: telón, panel, encabezado y pie.
 * Lo propio de un modal es su contenido; lo demás es siempre igual y vive aquí:
 * Escape cierra solo la capa de arriba, el fondo no se desplaza, el telón no cierra.
 *
 *   <ModalShell :open="abierto" title="Nuevo cliente" @close="abierto = false">
 *     <form id="f" @submit.prevent="guardar">…</form>
 *     <template #footer><button form="f">Guardar</button></template>
 *   </ModalShell>
 */
import { useId } from 'vue';
import { useOverlay } from '../composables/useOverlay.js';
import { DfIcon } from './DfIcon.js';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    subtitle?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
    /** Clases del cuerpo. Por defecto rueda con relleno. */
    bodyClass?: string;
  }>(),
  { size: 'lg', bodyClass: 'space-y-4 overflow-y-auto p-5' },
);

const emit = defineEmits<{ close: [] }>();
const titleId = `df-modal-${useId()}`;

const WIDTHS = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '4xl': 'sm:max-w-4xl',
  '6xl': 'sm:max-w-6xl',
} as const;

useOverlay(() => props.open, () => emit('close'));
</script>
