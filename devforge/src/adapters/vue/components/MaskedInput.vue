<template>
  <label class="block w-full">
    <span v-if="label" class="mb-1.5 block text-caption font-bold uppercase tracking-wider text-muted-foreground">{{ label }}</span>
    <input
      v-bind="$attrs"
      type="text"
      :inputmode="mask === 'taxId' ? 'text' : 'numeric'"
      :autocomplete="mask === 'phone' ? 'tel' : 'off'"
      :value="formatted"
      :placeholder="placeholder ?? PLACEHOLDERS[mask]"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      class="w-full rounded-control border bg-surface px-3.5 text-body tabular-nums text-foreground outline-none transition placeholder:text-dim-foreground focus:ring-2 focus:ring-ring disabled:opacity-60"
      :class="[invalid ? 'border-danger' : 'border-input focus:border-primary-border', compact ? 'h-9' : 'h-11']"
      @input="onInput"
    />
  </label>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE MaskedInput — cédula, RNC, «RNC / Cédula» y teléfono enmascarados MIENTRAS se
 * escribe (core/formatters/input-masks.ts). Al abrir un formulario en edición, el valor
 * crudo de la BD se normaliza solo.
 *
 *   <MaskedInput v-model="form.cedula" mask="cedula" label="Cédula" />      // 001-1234567-8
 *   <MaskedInput v-model="form.telefono" mask="phone" label="Teléfono" />   // (809) 578-1234
 *
 * El v-model recibe el texto FORMATEADO. Para guardar: `onlyDigits(form.cedula)`.
 * La cédula solo se enmascara si el documento es cédula: un pasaporte usa un input normal.
 */
import { computed } from 'vue';
import { INPUT_MASKS, type InputMask } from '../../../core/formatters/input-masks.js';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue: string | null | undefined;
    mask: InputMask;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    compact?: boolean;
  }>(),
  { disabled: false, invalid: false, compact: false },
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const PLACEHOLDERS: Record<InputMask, string> = {
  cedula: '000-0000000-0',
  rnc: '0-00-00000-0',
  taxId: 'RNC o cédula',
  phone: '(000) 000-0000',
};

const formatted = computed(() => INPUT_MASKS[props.mask](props.modelValue ?? ''));

function onInput(e: Event) {
  const input = e.target as HTMLInputElement;
  const next = INPUT_MASKS[props.mask](input.value);
  // Reescribe el campo aunque el v-model no cambie (una letra en una cédula no entra).
  if (input.value !== next) input.value = next;
  emit('update:modelValue', next);
}
</script>
