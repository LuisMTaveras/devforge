# ⚡ BLUEPRINT 02: Schema-Driven Dynamic Form Engine (Zod)

## 🎯 Goal

Eliminate boilerplate in form creation. Define a single **Zod Schema**, and automatically render responsive, accessible inputs, selects, switches, labels, and error messages with full type inference.

---

## 🛠️ Core Concept

A form field specification is derived directly from a Zod object schema. The engine accepts:

1. `schema`: The Zod validation object.
2. `fieldConfig`: Optional UI overrides (placeholder, field type, label, order).
3. `onSubmit`: Typed submission handler receiving `z.infer<typeof schema>`.

---

## 📋 Step-by-Step Implementation

### 1. Zod Definition Example

```typescript
import { z } from 'zod';

export const CreateUserSchema = z.object({
  fullName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  role: z.enum(['admin', 'editor', 'viewer'], { message: 'Selecciona un rol válido' }),
  notificationsEnabled: z.boolean().default(true),
  bio: z.string().max(200).optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
```

> Check the `zod` major version in `package.json` before writing schemas. `{ message: '...' }` works in Zod 3 and 4; `errorMap` is Zod 3 only and `error` is Zod 4 only.

---

### 2. Field type ➔ component (never native controls)

| Field `type` | Component (module) | Value |
|---|---|---|
| `text`, `email`, `password`, `textarea` | `<input>` / `<textarea>` with the token classes below | `string` |
| `select` | `<SelectField>` (`select`) — native `<select>` is banned | `string \| number \| null` |
| `date` | `<DateField>` (`dates`) — `<input type="date">` is banned | day key `'2026-10-05'` or `''` |
| `money` | `<MoneyInput>` (`inputs`) — never `type="number"` | `number \| null` |
| `cedula`, `rnc`, `taxId`, `phone` | `<MaskedInput :mask>` (`inputs`) | formatted `string` |
| `checkbox` | `<input type="checkbox">` with `accent-primary` | `boolean` |

Install what the form uses before writing it (`devforge add select dates inputs`); check the files exist in `src/shared/components/`.

---

### 3. React Implementation (React Hook Form + @hookform/resolvers/zod)

```bash
npm install react-hook-form @hookform/resolvers zod
```

```tsx
// src/shared/components/DynamicForm.tsx
import { useForm, Controller, type FieldValues, type Path, type SubmitHandler, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodObject, ZodRawShape } from 'zod';
import { SelectField, type SelectOption } from '@/shared/components/SelectField';
import { DateField } from '@/shared/components/DateField';
import { MoneyInput } from '@/shared/components/MoneyInput';
import { MaskedInput } from '@/shared/components/MaskedInput';
import type { InputMask } from '@/core/formatters/input-masks';

export interface FieldConfig {
  label: string;
  type?: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'date' | 'money' | 'checkbox' | InputMask;
  options?: SelectOption[];
  placeholder?: string;
  currency?: string; // money: comes from the document, never hardcoded
}

interface DynamicFormProps<T extends FieldValues> {
  schema: ZodObject<ZodRawShape>;
  fields: Record<keyof T, FieldConfig>;
  defaultValues?: DefaultValues<T>;
  onSubmit: SubmitHandler<T>;
  submitLabel?: string;
  onCancel?: () => void;
}

const MASKS: readonly string[] = ['cedula', 'rnc', 'taxId', 'phone'];
const inputClass =
  'h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-dim-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-danger';

export function DynamicForm<T extends FieldValues>({ schema, fields, defaultValues, onSubmit, submitLabel = 'Guardar', onCancel }: DynamicFormProps<T>) {
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {(Object.keys(fields) as Array<Path<T>>).map(name => {
        const config = fields[name as keyof T];
        const type = config.type ?? 'text';
        const error = errors[name]?.message as string | undefined;
        const a11y = { id: name, 'aria-invalid': !!error, 'aria-describedby': error ? `${name}-error` : undefined };

        const control_ =
          type === 'select' || type === 'date' || type === 'money' || MASKS.includes(type) ? (
            <Controller
              control={control}
              name={name}
              render={({ field }) =>
                type === 'select' ? (
                  <SelectField {...a11y} value={field.value ?? null} onChange={field.onChange} options={config.options ?? []} placeholder={config.placeholder} />
                ) : type === 'date' ? (
                  <DateField value={field.value ?? ''} onChange={field.onChange} placeholder={config.placeholder} />
                ) : type === 'money' ? (
                  <MoneyInput {...a11y} value={field.value ?? null} onChange={field.onChange} currency={config.currency} invalid={!!error} />
                ) : (
                  <MaskedInput {...a11y} mask={type as InputMask} value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} invalid={!!error} />
                )
              }
            />
          ) : type === 'textarea' ? (
            <textarea {...a11y} {...register(name)} placeholder={config.placeholder} className={`${inputClass} h-auto min-h-20 py-2`} />
          ) : type === 'checkbox' ? (
            <input {...a11y} type="checkbox" {...register(name)} className="size-4 accent-primary" />
          ) : (
            <input {...a11y} type={type} {...register(name)} placeholder={config.placeholder} className={inputClass} />
          );

        return (
          <div key={name} className="flex flex-col gap-1.5">
            <label htmlFor={name} className="text-sm font-medium text-foreground">{config.label}</label>
            {control_}
            {error && <span id={`${name}-error`} className="text-xs text-danger">{error}</span>}
          </div>
        );
      })}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-9 rounded-lg border border-border px-4 text-sm text-foreground hover:bg-surface-raised">
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
```

---

### 4. Vue 3 Implementation (VeeValidate + @vee-validate/zod)

```bash
npm install vee-validate @vee-validate/zod zod
```

```vue
<!-- src/shared/components/DynamicForm.vue -->
<script setup lang="ts">
import { Field, useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import type { ZodObject, ZodRawShape } from 'zod';
import SelectField, { type SelectOption } from '@/shared/components/SelectField.vue';
import DateField from '@/shared/components/DateField.vue';
import MoneyInput from '@/shared/components/MoneyInput.vue';
import MaskedInput from '@/shared/components/MaskedInput.vue';
import type { InputMask } from '@/core/formatters/input-masks';

const props = defineProps<{
  schema: ZodObject<ZodRawShape>;
  fields: Record<string, {
    label: string;
    type?: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'date' | 'money' | 'checkbox' | InputMask;
    options?: SelectOption[];
    placeholder?: string;
    currency?: string;
  }>;
  initialValues?: Record<string, unknown>;
  submitLabel?: string;
}>();

const emit = defineEmits<{ submit: [values: Record<string, unknown>]; cancel: [] }>();

const { handleSubmit, errors, isSubmitting } = useForm({
  validationSchema: toTypedSchema(props.schema),
  initialValues: props.initialValues,
});
const onSubmit = handleSubmit(values => emit('submit', values));

const MASKS = ['cedula', 'rnc', 'taxId', 'phone'];
const inputClass =
  'h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-dim-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-danger';
</script>

<template>
  <form class="space-y-4" novalidate @submit="onSubmit">
    <div v-for="(config, key) in fields" :key="key" class="flex flex-col gap-1.5">
      <label :for="String(key)" class="text-sm font-medium text-foreground">{{ config.label }}</label>

      <!-- v-slot gives value + handleChange: the standard components plug in without native controls -->
      <Field v-slot="{ value, handleChange, handleBlur, field }" :name="String(key)">
        <SelectField
          v-if="config.type === 'select'"
          :id="String(key)" :model-value="value ?? null" :options="config.options ?? []" :placeholder="config.placeholder"
          :aria-invalid="!!errors[key]" @update:model-value="handleChange"
        />
        <DateField v-else-if="config.type === 'date'" :model-value="value ?? ''" :placeholder="config.placeholder" @update:model-value="handleChange" />
        <MoneyInput
          v-else-if="config.type === 'money'"
          :id="String(key)" :model-value="value ?? null" :currency="config.currency" :invalid="!!errors[key]" @update:model-value="handleChange"
        />
        <MaskedInput
          v-else-if="config.type && MASKS.includes(config.type)"
          :id="String(key)" :mask="config.type as InputMask" :model-value="value ?? ''" :invalid="!!errors[key]"
          @update:model-value="handleChange" @blur="handleBlur"
        />
        <textarea v-else-if="config.type === 'textarea'" :id="String(key)" v-bind="field" :placeholder="config.placeholder" :class="[inputClass, 'h-auto min-h-20 py-2']" />
        <input v-else-if="config.type === 'checkbox'" :id="String(key)" type="checkbox" :checked="!!value" class="size-4 accent-primary" @change="handleChange(($event.target as HTMLInputElement).checked)" />
        <input
          v-else
          :id="String(key)" v-bind="field" :type="config.type || 'text'" :placeholder="config.placeholder"
          :aria-invalid="!!errors[key]" :aria-describedby="errors[key] ? `${key}-error` : undefined" :class="inputClass"
        />
      </Field>

      <span v-if="errors[key]" :id="`${key}-error`" class="text-xs text-danger">{{ errors[key] }}</span>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <button type="button" class="h-9 rounded-lg border border-border px-4 text-sm text-foreground hover:bg-surface-raised" @click="emit('cancel')">
        Cancelar
      </button>
      <button
        type="submit"
        :disabled="isSubmitting"
        class="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ isSubmitting ? 'Guardando…' : (submitLabel || 'Guardar') }}
      </button>
    </div>
  </form>
</template>
```

---

## 🤖 Instructions for AI Agents

1. Use `DynamicForm` for flat CRUD forms (fields one under another, one submit). Forms with line items, conditional sections or multi-step flows are written by hand with the SAME rules (same components, same Zod schema, same error handling).
2. Define the Zod schema first in `types.ts` of the feature module; infer the submit type with `z.infer<typeof Schema>`. If the backend is TypeScript, share the schema; otherwise mirror its rules and still show the server's field errors.
3. Map every field to the table in §2. A native `<select>`, `<input type="date">` or `type="number"` for money is an audit violation.
4. Submit flow: button disabled with `Guardando…` while pending; success ➔ `notify({ type: 'success', message: '…' })` and close/navigate; error ➔ `normalizeApiError(err)`: if the backend contract returns per-field errors (read it, don't assume a shape) they go to `setError` / `setFieldError`; the rest to `notify({ type: 'error' })`. Never `alert()` or a raw `err.message`.
5. Inside a modal, the form lives in `<ModalShell>` (Escape cancels, backdrop never closes); leaving with unsaved changes asks `confirmDialog()`.
6. Colors only from tokens (`border-border`, `bg-surface`, `bg-primary`, `text-danger`). Never `text-gray-700`, `bg-blue-600` or `text-red-500`.
7. Every label, placeholder, button and error message in the UI language (Zod messages included).
8. Use the libraries in this blueprint only if they are in `package.json` or the user approves installing them.
