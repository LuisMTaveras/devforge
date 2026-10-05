import type { App, DirectiveBinding } from 'vue';
import { globalAbility, type Action } from '../../core/permissions/ability.js';

export const canDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const action = (binding.arg || 'read') as Action;
    const subject = binding.value || 'all';

    const allowed = globalAbility.can(action, subject);
    if (!allowed) {
      el.parentNode?.removeChild(el);
    }
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    const action = (binding.arg || 'read') as Action;
    const subject = binding.value || 'all';

    const allowed = globalAbility.can(action, subject);
    if (!allowed && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }
};

export function installPermissions(app: App) {
  app.directive('can', canDirective);
}
