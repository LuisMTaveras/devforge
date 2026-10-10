<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed inset-x-4 top-4 z-[10001] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:top-6" aria-live="polite" role="status">
      <TransitionGroup
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-[-0.5rem] opacity-0 sm:translate-x-4 sm:translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-border bg-surface-raised px-4 py-3 shadow-popover"
        >
          <DfIcon :name="LOOKS[toast.type].icon" class="mt-0.5 size-5 shrink-0" :class="LOOKS[toast.type].color" />
          <p class="min-w-0 flex-1 text-small font-medium text-foreground">{{ toast.message }}</p>
          <button
            type="button"
            class="grid size-6 shrink-0 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
            aria-label="Cerrar aviso"
            @click="dismissToast(toast.id)"
          >
            <DfIcon name="close" class="size-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE ToastHost — los avisos que no interrumpen. Va UNA vez en `App.vue`.
 * Se disparan desde cualquier sitio: `notify('Cliente guardado')`, `notify('No se pudo guardar', 'error')`.
 */
import { onScopeDispose, ref } from 'vue';
import { dismissToast, getToasts, subscribeToasts, type ToastType } from '../../../core/feedback/toast.js';
import { DfIcon } from './DfIcon.js';
import type { IconName } from '../../shared/icon-paths.js';

const toasts = ref(getToasts());
onScopeDispose(subscribeToasts(next => (toasts.value = next)));

const LOOKS: Record<ToastType, { icon: IconName; color: string }> = {
  success: { icon: 'success', color: 'text-success' },
  error: { icon: 'error', color: 'text-danger' },
  warning: { icon: 'warning', color: 'text-warning' },
  info: { icon: 'info', color: 'text-muted-foreground' },
};
</script>
