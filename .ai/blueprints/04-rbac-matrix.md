# ⚡ BLUEPRINT 04: Declarative RBAC / ABAC Permissions Engine

## 🎯 Goal

Eliminate messy `if (user.role === 'admin' || user.permissions.includes('edit'))` checks littered throughout templates. Implement a clean, declarative permission system inspired by **CASL**:

- React: `<Can I="update" an="Invoice">`
- Vue: `v-can:update="invoice"` or `<Can I="update" :an="invoice">`
- Router: Navigation guards based on defined abilities.

---

## 🛠️ Core Engine (`src/core/permissions/ability.ts`)

A zero-dependency, pure TypeScript permission evaluator.

```typescript
export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';
export type Subject = string | Record<string, unknown>;

export interface Rule {
  action: Action | Action[];
  subject: string;
  conditions?: (subjectData: Record<string, unknown>, user: Record<string, unknown>) => boolean;
}

export class Ability {
  private rules: Rule[] = [];
  private user: Record<string, unknown> | null = null;

  setUser(user: Record<string, unknown> | null) {
    this.user = user;
  }

  updateRules(rules: Rule[]) {
    this.rules = rules;
  }

  can(action: Action, subject: Subject, subjectData?: Record<string, unknown>): boolean {
    const subjectName = typeof subject === 'string' ? subject : (subject.constructor?.name || 'Object');
    const data = typeof subject === 'object' ? subject : subjectData;

    for (const rule of this.rules) {
      const actionMatches = Array.isArray(rule.action) 
        ? rule.action.includes(action) || rule.action.includes('manage')
        : rule.action === action || rule.action === 'manage';

      const subjectMatches = rule.subject === subjectName || rule.subject === 'all';

      if (actionMatches && subjectMatches) {
        if (!rule.conditions) return true;
        if (data && this.user && rule.conditions(data, this.user)) return true;
      }
    }

    return false;
  }
}

export const globalAbility = new Ability();
```

---

## 📋 Framework Adapters

### React `<Can />` Component (`src/shared/components/Can.tsx`)

```tsx
import React, { ReactNode } from 'react';
import { Action, Subject, globalAbility } from '@/core/permissions/ability';

interface CanProps {
  I: Action;
  an?: Subject;
  this?: Subject;
  data?: Record<string, unknown>;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Can({ I, an, this: thisSubject, data, children, fallback = null }: CanProps) {
  const subject = an || thisSubject || 'all';
  const allowed = globalAbility.can(I, subject, data);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
```

### Vue 3 `v-can` Directive & `<Can>` Component (`src/shared/directives/v-can.ts`)

```typescript
import { App, DirectiveBinding } from 'vue';
import { globalAbility, Action } from '@/core/permissions/ability';

export const canDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const action = binding.arg as Action;
    const subject = binding.value;

    const allowed = globalAbility.can(action, subject);
    if (!allowed) {
      el.parentNode?.removeChild(el);
    }
  }
};

export function registerPermissions(app: App) {
  app.directive('can', canDirective);
}
```

---

## 🚦 Router Guard Example (Vue / React)

```typescript
// Protect routes seamlessly
router.beforeEach((to, from, next) => {
  const requiredAction = to.meta.action as Action | undefined;
  const requiredSubject = to.meta.subject as string | undefined;

  if (requiredAction && requiredSubject) {
    if (!globalAbility.can(requiredAction, requiredSubject)) {
      return next({ name: 'Unauthorized' });
    }
  }
  next();
});
```

---

## 🤖 Instructions for AI Agents

1. Never check user role strings (`user.role === 'admin'`) inside buttons or UI components.
2. Always map user permissions at login into `Rule[]` and load them into `globalAbility.updateRules()`.
3. Wrap protected actions with `<Can />` or `v-can`.
