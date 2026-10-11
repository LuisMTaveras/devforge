<template>
  <DatePicker
    :model-value="modelValue"
    :label="label"
    :placeholder="placeholder"
    :min="min"
    :max="max"
    :compact="compact"
    :disabled="disabled"
    :clearable="clearable"
    v-bind="$attrs"
    @update:model-value="emit('update:modelValue', $event as string)"
    @change="emit('change', $event as string)"
  />
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE DateField — el campo de FECHA de un formulario (una sola fecha).
 * Es el que se usa en formularios y modales; `DatePicker` queda para el rango suelto.
 *
 *   <DateField v-model="form.vencimiento" label="Vencimiento" :min="todayKey()" />
 *   <DateField v-model="form.proximaAccion" placeholder="Sin fecha" />          // opcional, con ✕
 *   <DateField v-model="form.dia" :min="todayKey()" :clearable="false" />       // obligatoria
 *
 * El v-model es la clave `'YYYY-MM-DD'` (o `''` vacío). Se envía tal cual a la API.
 */
import DatePicker from './DatePicker.vue';

withDefaults(
  defineProps<{
    modelValue?: string | Date | null;
    label?: string;
    placeholder?: string;
    min?: string;
    max?: string;
    compact?: boolean;
    disabled?: boolean;
    clearable?: boolean;
  }>(),
  { modelValue: '', compact: false, disabled: false, clearable: true },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  change: [value: string];
}>();
</script>
