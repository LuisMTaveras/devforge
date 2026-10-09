<template>
  <label class="block w-full">
    <span v-if="label" class="mb-1.5 block text-caption font-bold uppercase tracking-wider text-muted-foreground">{{ label }}</span>
    <span
      class="flex h-11 w-full items-center gap-2 rounded-control border bg-surface px-3.5 transition focus-within:ring-2 focus-within:ring-ring"
      :class="[invalid ? 'border-danger' : 'border-input focus-within:border-primary-border', disabled ? 'opacity-60' : '', compact ? 'h-9' : '']"
    >
      <span class="shrink-0 text-small font-semibold text-dim-foreground">{{ symbol }}</span>
      <input
        v-bind="$attrs"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        class="min-w-0 flex-1 bg-transparent text-right text-body font-semibold tabular-nums text-foreground outline-none placeholder:text-dim-foreground"
        :value="focused ? draft : display"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
        @focus="onFocus"
        @blur="onBlur"
        @input="onInput"
      />
    </span>
  </label>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE MoneyInput — campo de monto. El v-model es un NÚMERO (o `null` si está vacío,
 * nunca `0`: un monto vacío no es cero).
 *
 *   <MoneyInput v-model="form.monto" label="Monto" />             // RD$ 1,500.00
 *   <MoneyInput v-model="form.montoUsd" currency="USD" />          // US$ 250.00
 *
 * Sin foco muestra el monto formateado con los separadores del país; al enfocarlo, el
 * número limpio para editar. La moneda la trae el documento: no la escribas a mano si
 * el registro ya la tiene (`:currency="factura?.moneda"`).
 */
import { computed, ref } from 'vue';
import { formatConfig, formatNumber } from '../../../core/formatters/formatters.js';
import { amountToEditable, parseAmount, sanitizeAmountInput } from '../../../core/formatters/input-masks.js';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue: number | null | undefined;
    currency?: string;
    label?: string;
    placeholder?: string;
    decimals?: number;
    disabled?: boolean;
    invalid?: boolean;
    compact?: boolean;
  }>(),
  { placeholder: '0.00', decimals: 2, disabled: false, invalid: false, compact: false },
);

const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>();

const focused = ref(false);
const draft = ref('');

const currencyCode = computed(() => props.currency || formatConfig.defaultCurrency);
const symbol = computed(
  () =>
    new Intl.NumberFormat(formatConfig.defaultLocale, { style: 'currency', currency: currencyCode.value })
      .formatToParts(0)
      .find(p => p.type === 'currency')?.value ?? currencyCode.value,
);
const display = computed(() =>
  props.modelValue === null || props.modelValue === undefined
    ? ''
    : formatNumber(props.modelValue, { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals }),
);

function onFocus() {
  draft.value = amountToEditable(props.modelValue);
  focused.value = true;
}

function onInput(e: Event) {
  const input = e.target as HTMLInputElement;
  draft.value = sanitizeAmountInput(input.value, undefined, props.decimals);
  if (input.value !== draft.value) input.value = draft.value;
  emit('update:modelValue', parseAmount(draft.value));
}

function onBlur() {
  focused.value = false;
  const value = parseAmount(draft.value);
  emit('update:modelValue', value === null ? null : Number(value.toFixed(props.decimals)));
}
</script>
