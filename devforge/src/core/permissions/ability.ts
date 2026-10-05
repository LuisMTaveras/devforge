/**
 * ⚡ DEVFORGE Ability & Permission Evaluator
 * Zero-dependency, pure TypeScript declarative RBAC / ABAC engine.
 */

export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';
export type Subject = string | Record<string, unknown>;

export interface Rule<TUser = Record<string, unknown>, TData = Record<string, unknown>> {
  action: Action | Action[];
  subject: string;
  conditions?: (subjectData: TData, user: TUser) => boolean;
}

export class Ability<TUser = Record<string, unknown>> {
  private rules: Rule<TUser, any>[] = [];
  private user: TUser | null = null;

  constructor(user?: TUser, initialRules: Rule<TUser, any>[] = []) {
    if (user) this.user = user;
    this.rules = initialRules;
  }

  setUser(user: TUser | null): void {
    this.user = user;
  }

  getUser(): TUser | null {
    return this.user;
  }

  updateRules(rules: Rule<TUser, any>[]): void {
    this.rules = rules;
  }

  getRules(): Rule<TUser, any>[] {
    return [...this.rules];
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

  cannot(action: Action, subject: Subject, subjectData?: Record<string, unknown>): boolean {
    return !this.can(action, subject, subjectData);
  }
}

export const globalAbility = new Ability();
