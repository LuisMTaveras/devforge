import type { Directive, DirectiveBinding } from 'vue';

/**
 * Directiva para estados de mutación/guardado en línea (filas de tabla, cards, botones).
 * Aplica el haz de luz y atenuación suave a nivel individual sin bloquear la pantalla completa.
 *
 * Uso:
 * <tr v-flickerless-saving="guardandoId === item.id">
 * <button v-flickerless-saving="isSaving">Guardar</button>
 */
export const vFlickerlessSaving: Directive<HTMLElement, boolean> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<boolean>) {
    if (binding.value) {
      el.classList.add('flickerless-saving');
      el.setAttribute('aria-busy', 'true');
    }
  },
  updated(el: HTMLElement, binding: DirectiveBinding<boolean>) {
    if (binding.value) {
      el.classList.add('flickerless-saving');
      el.setAttribute('aria-busy', 'true');
    } else {
      el.classList.remove('flickerless-saving');
      el.removeAttribute('aria-busy');
    }
  },
  unmounted(el: HTMLElement) {
    el.classList.remove('flickerless-saving');
    el.removeAttribute('aria-busy');
  },
};
