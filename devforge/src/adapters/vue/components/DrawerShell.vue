<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 [&>aside]:translate-x-8"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0 [&>aside]:translate-x-8"
    >
      <!-- El gemelo de ModalShell para lo que se CONSULTA de lado sin tapar la lista. Mismas reglas. -->
      <div
        v-if="open"
        class="fixed inset-0 z-200 flex justify-end bg-overlay backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <aside class="flex h-full w-full flex-col border-l border-border bg-surface-raised shadow-popover transition-transform duration-200" :class="WIDTHS[size]">
          <header class="flex items-start justify-between gap-3 border-b border-border bg-surface px-5 py-4">
            <div class="min-w-0">
              <slot name="title">
                <h2 :id="titleId" class="truncate text-body font-bold text-foreground">{{ title }}</h2>
              </slot>
              <p v-if="subtitle || $slots.subtitle" class="mt-0.5 truncate text-caption text-muted-foreground">
                <slot name="subtitle">{{ subtitle }}</slot>
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-1.5">
              <slot name="actions" />
              <button
                type="button"
                class="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
                aria-label="Cerrar"
                title="Cerrar"
                @click="emit('close')"
              >
                <DfIcon name="close" class="size-5" />
              </button>
            </div>
          </header>

          <div class="min-h-0 flex-1" :class="bodyClass">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="flex items-center justify-end gap-2 border-t border-border bg-surface px-5 py-4">
            <slot name="footer" />
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE DrawerShell — panel lateral derecho (bitácora, detalle de un registro).
 *
 *   <DrawerShell :open="Boolean(seleccion)" :title="seleccion?.numero ?? ''" @close="seleccion = null">…</DrawerShell>
 */
import { useId } from 'vue';
import { useOverlay } from '../composables/useOverlay.js';
import { DfIcon } from './DfIcon.js';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    subtitle?: string;
    size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    bodyClass?: string;
  }>(),
  { size: '2xl', bodyClass: 'space-y-4 overflow-y-auto p-5' },
);

const emit = defineEmits<{ close: [] }>();
const titleId = `df-drawer-${useId()}`;

const WIDTHS = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl', '3xl': 'max-w-3xl' } as const;

useOverlay(() => props.open, () => emit('close'));
</script>
