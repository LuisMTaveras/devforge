<template>
  <div class="flex items-center gap-3 border-b border-warning/20 bg-warning/10 px-4 py-2.5 text-small" role="status">
    <DfIcon name="refresh" class="size-4 shrink-0 text-warning" />
    <span class="font-semibold text-foreground">{{ message }}</span>
    <button
      type="button"
      class="ml-auto shrink-0 cursor-pointer rounded-control border border-warning/30 bg-surface-raised px-3 py-1 text-caption font-bold text-foreground transition hover:bg-warning/10"
      @click="emit('refresh')"
    >
      {{ actionText }}
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE ListStaleNotice — «hay cambios nuevos», sin recargar la lista sola.
 * Crear o eliminar registros desde otra pantalla (o que lo haga otro usuario) cambia QUÉ
 * filas hay y en qué página cae cada una: eso no se parchea, se avisa y decide quien mira.
 * Recargar sola le movería la fila que estaba leyendo.
 *
 *   <ListStaleNotice v-if="hayCambios" @refresh="recargar" />
 */
import { DfIcon } from './DfIcon.js';

withDefaults(defineProps<{ message?: string; actionText?: string }>(), {
  message: 'Hay cambios nuevos en esta lista.',
  actionText: 'Actualizar lista',
});
const emit = defineEmits<{ refresh: [] }>();
</script>
