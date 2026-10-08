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

### 2. React Implementation (with React Hook Form + @hookform/resolvers/zod)

```bash
npm install react-hook-form @hookform/resolvers zod
```

```tsx
// src/shared/components/DynamicForm.tsx
import React from 'react';
import { useForm, FieldValues, Path, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodObject, ZodRawShape } from 'zod';

interface FieldConfig {
  label: string;
  type?: 'text' | 'email' | 'password' | 'select' | 'checkbox' | 'textarea';
  options?: { label: string; value: string }[];
  placeholder?: string;
}

interface DynamicFormProps<T extends FieldValues> {
  schema: ZodObject<ZodRawShape>;
  fields: Record<keyof T, FieldConfig>;
  onSubmit: SubmitHandler<T>;
  submitLabel?: string;
}

export function DynamicForm<T extends FieldValues>({
  schema,
  fields,
  onSubmit,
  submitLabel = 'Guardar'
}: DynamicFormProps<T>) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<T>({
    resolver: zodResolver(schema)
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {(Object.keys(fields) as Array<keyof T>).map((fieldName) => {
        const config = fields[fieldName];
        const error = errors[fieldName as Path<T>]?.message as string | undefined;

        return (
          <div key={String(fieldName)} className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">{config.label}</label>

            {config.type === 'select' ? (
              <select
                {...register(fieldName as Path<T>)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {config.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : config.type === 'textarea' ? (
              <textarea
                {...register(fieldName as Path<T>)}
                placeholder={config.placeholder}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            ) : (
              <input
                type={config.type || 'text'}
                {...register(fieldName as Path<T>)}
                placeholder={config.placeholder}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            )}

            {error && <span className="text-xs text-danger">{error}</span>}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
      >
        {isSubmitting ? 'Enviando...' : submitLabel}
      </button>
    </form>
  );
}
```

---

### 3. Vue 3 Implementation (with VeeValidate + @vee-validate/zod)

```bash
npm install vee-validate @vee-validate/zod zod
```

```vue
<!-- src/shared/components/DynamicForm.vue -->
<script setup lang="ts" generic="T extends Record<string, unknown>">
import { Field, useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import type { ZodObject, ZodRawShape } from 'zod';

const props = defineProps<{
  schema: ZodObject<ZodRawShape>;
  fields: Record<string, {
    label: string;
    type?: 'text' | 'email' | 'password' | 'select' | 'textarea';
    options?: { label: string; value: string }[];
    placeholder?: string;
  }>;
  submitLabel?: string;
}>();

const emit = defineEmits<{
  (e: 'submit', values: T): void;
}>();

const { handleSubmit, errors, isSubmitting } = useForm({
  validationSchema: toTypedSchema(props.schema),
});

const onSubmit = handleSubmit((values) => {
  emit('submit', values as T);
});

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
</script>

<template>
  <form class="space-y-4" @submit="onSubmit">
    <div v-for="(config, fieldKey) in fields" :key="fieldKey" class="flex flex-col gap-1">
      <label :for="String(fieldKey)" class="text-sm font-medium text-foreground">{{ config.label }}</label>

      <!-- <Field> binds each control to VeeValidate (value, blur, validation) -->
      <Field v-if="config.type === 'select'" :id="String(fieldKey)" :name="String(fieldKey)" as="select" :class="inputClass">
        <option v-for="opt in config.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </Field>
      <Field
        v-else-if="config.type === 'textarea'"
        :id="String(fieldKey)"
        :name="String(fieldKey)"
        as="textarea"
        :placeholder="config.placeholder"
        :class="inputClass"
      />
      <Field
        v-else
        :id="String(fieldKey)"
        :name="String(fieldKey)"
        :type="config.type || 'text'"
        :placeholder="config.placeholder"
        :class="inputClass"
      />

      <span v-if="errors[fieldKey]" class="text-xs text-danger">
        {{ errors[fieldKey] }}
      </span>
    </div>

    <button
      type="submit"
      :disabled="isSubmitting"
      class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
    >
      {{ isSubmitting ? 'Enviando...' : (submitLabel || 'Guardar') }}
    </button>
  </form>
</template>
```

---

## 🤖 Instructions for AI Agents

1. Whenever building any form with more than 3 fields, use the `DynamicForm` pattern.
2. Define the Zod schema first in `types.ts` of the feature module.
3. Infer the submit type with `z.infer<typeof Schema>`.
4. Keep validation client-side and server-side synced with the same schema.
5. Colors come from the theme tokens (`text-foreground`, `border-input`, `bg-primary`, `text-danger`) so the form works in light and dark themes. Never `text-gray-700`, `bg-blue-600` or `text-red-500`.
6. All labels, placeholders, buttons and error messages in Spanish when the project is in Spanish.
7. Use the libraries in this blueprint only if they are in `package.json` or the user approves installing them.
