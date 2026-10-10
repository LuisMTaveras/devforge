<template>
  <div class="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
    <span class="flex size-14 items-center justify-center rounded-card bg-surface text-muted-foreground">
      <slot name="icon"><DfIcon :name="icon" class="size-7" /></slot>
    </span>
    <h3 class="mt-4 text-body font-bold text-foreground">{{ title }}</h3>
    <p v-if="text" class="mt-1 max-w-sm text-small text-muted-foreground">{{ text }}</p>
    <div v-if="$slots.default" class="mt-5 flex flex-wrap items-center justify-center gap-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE EmptyState — lo que se ve cuando una lista RESPONDIÓ vacía.
 * Icono + titular + explicación + acción directa (ui-ux-principles.md §7).
 * Solo con una respuesta en la mano: va en el `#empty` de `<FlickerlessSurface>`.
 *
 *   <EmptyState title="Aún no hay facturas" text="Las facturas que emitas aparecerán aquí.">
 *     <button class="…" @click="nueva">Nueva factura</button>
 *   </EmptyState>
 *
 * Con filtros activos el texto cambia: «Ninguna factura coincide con los filtros» + «Limpiar filtros».
 */
import type { IconName } from '../../shared/icon-paths.js';
import { DfIcon } from './DfIcon.js';

withDefaults(defineProps<{ title: string; text?: string; icon?: IconName }>(), { icon: 'inbox' });
</script>
