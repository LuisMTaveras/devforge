<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <!-- El telón NO cierra: de un diálogo se sale por un botón o con Escape. -->
      <div
        v-if="state.open"
        class="fixed inset-0 z-[10000] flex items-center justify-center bg-overlay p-6 backdrop-blur-sm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="df-dialog-title"
        :aria-describedby="state.message ? 'df-dialog-message' : undefined"
        @keydown.enter="onEnter"
      >
        <div
          class="w-full overflow-hidden rounded-card border border-border bg-surface-raised shadow-popover"
          :class="isLong ? 'max-w-lg' : 'max-w-sm'"
        >
          <div class="flex flex-col p-6" :class="isLong ? 'items-start text-left' : 'items-center text-center'">
            <DfIcon :name="look.icon" class="mb-3 size-9" :class="look.color" />
            <h3 id="df-dialog-title" class="mb-2 text-title font-bold tracking-tight text-foreground">{{ state.title }}</h3>
            <p v-if="state.message" id="df-dialog-message" class="whitespace-pre-line text-small leading-relaxed text-muted-foreground">
              {{ state.message }}
            </p>

            <template v-if="state.type === 'prompt'">
              <component
                :is="state.inputMultiline ? 'textarea' : 'input'"
                ref="inputRef"
                :value="state.inputValue"
                :placeholder="state.inputPlaceholder"
                :rows="state.inputMultiline ? 3 : undefined"
                :type="state.inputMultiline ? undefined : 'text'"
                :aria-invalid="Boolean(state.inputError)"
                class="mt-4 w-full rounded-control border bg-surface px-3.5 py-2.5 text-small text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                :class="state.inputError ? 'border-danger' : 'border-input focus:border-primary-border'"
                @input="setDialogInput(($event.target as HTMLInputElement).value)"
              />
              <p v-if="state.inputError" class="mt-2 text-caption font-semibold text-danger">{{ state.inputError }}</p>
            </template>
          </div>

          <div class="flex gap-3 border-t border-border bg-surface px-6 py-4">
            <button
              v-if="hasCancel"
              ref="cancelRef"
              type="button"
              class="h-9 flex-1 cursor-pointer rounded-control border border-border px-4 text-small font-semibold text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
              @click="cancelDialog"
            >
              {{ state.cancelText }}
            </button>
            <button
              ref="confirmRef"
              type="button"
              class="h-9 flex-1 cursor-pointer rounded-control px-4 text-small font-semibold transition"
              :class="confirmClass"
              @click="acceptDialog"
            >
              {{ state.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE ConfirmDialog — el diálogo del sistema. Va UNA vez en `App.vue`.
 * Se abre desde cualquier sitio con `alertDialog`, `confirmDialog` o `promptDialog`
 * (`@/core/feedback/dialog`). El TIPO decide icono y color; `tone: 'danger'` pinta
 * destructivo; el LARGO del mensaje decide ancho y alineación (se respetan los saltos de
 * línea). Escape cancela, Enter confirma (Ctrl/Cmd+Enter en un campo de varias líneas).
 * En una pregunta destructiva el foco empieza en «Cancelar».
 */
import { computed, nextTick, onScopeDispose, ref, watch } from 'vue';
import {
  acceptDialog,
  cancelDialog,
  getDialogState,
  isLongDialogMessage,
  setDialogInput,
  subscribeDialog,
} from '../../../core/feedback/dialog.js';
import { useOverlay } from '../composables/useOverlay.js';
import { DfIcon } from './DfIcon.js';
import type { IconName } from '../../shared/icon-paths.js';

const state = ref(getDialogState());
onScopeDispose(subscribeDialog(next => (state.value = next)));

const inputRef = ref<HTMLInputElement | null>(null);
const cancelRef = ref<HTMLButtonElement | null>(null);
const confirmRef = ref<HTMLButtonElement | null>(null);

const LOOKS: Record<string, { icon: IconName; color: string }> = {
  info: { icon: 'info', color: 'text-muted-foreground' },
  success: { icon: 'success', color: 'text-success' },
  warning: { icon: 'warning', color: 'text-warning' },
  error: { icon: 'error', color: 'text-danger' },
  confirm: { icon: 'help', color: 'text-muted-foreground' },
  prompt: { icon: 'edit', color: 'text-muted-foreground' },
};

const look = computed(() => (state.value.tone === 'danger' ? { icon: 'warning' as const, color: 'text-danger' } : LOOKS[state.value.type]));
const hasCancel = computed(() => state.value.type === 'confirm' || state.value.type === 'prompt');
const isLong = computed(() => isLongDialogMessage(state.value.message));
const confirmClass = computed(() => {
  if (state.value.tone === 'danger' || state.value.type === 'error') return 'bg-danger text-danger-foreground hover:opacity-90';
  if (hasCancel.value) return 'bg-primary text-primary-foreground hover:bg-primary-hover';
  // Un aviso sin alternativa no necesita un botón que grite.
  return 'border border-border bg-surface-hover text-foreground hover:bg-primary-subtle';
});

function onEnter(e: KeyboardEvent) {
  if (state.value.type === 'prompt' && state.value.inputMultiline && !(e.ctrlKey || e.metaKey)) return;
  if (e.target === cancelRef.value) return; // Enter sobre «Cancelar» cancela (lo hace el propio botón)
  e.preventDefault();
  acceptDialog();
}

watch(
  () => state.value.open,
  async open => {
    if (!open) return;
    await nextTick();
    if (state.value.type === 'prompt') inputRef.value?.focus();
    else if (state.value.tone === 'danger') cancelRef.value?.focus();
    else confirmRef.value?.focus();
  },
);

useOverlay(() => state.value.open, cancelDialog);
</script>
