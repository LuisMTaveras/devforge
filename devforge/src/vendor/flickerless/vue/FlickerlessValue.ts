import { defineComponent, h, inject, type PropType } from 'vue';
import { FLICKERLESS_SETTLED } from './settled';

/**
 * Un dato que puede no existir todavía. Sin respuesta pinta «—» atenuado en vez
 * de un cero: «RD$0.00» antes de cargar es una cifra falsa, no un hueco.
 * Desconocido = la superficie que lo envuelve aún no responde, o `value` es
 * null/undefined. El slot por defecto formatea el valor cuando sí existe.
 */
export const FlickerlessValue = defineComponent({
  name: 'FlickerlessValue',
  props: {
    value: { type: [String, Number] as PropType<string | number | null | undefined>, default: undefined },
    placeholder: { type: String, default: '—' },
    unknownLabel: { type: String, default: 'Sin dato todavía' },
  },
  setup(props, { slots }) {
    const settled = inject(FLICKERLESS_SETTLED, null);
    return () => {
      const unknown = props.value === null || props.value === undefined || settled?.value === false;
      if (unknown) {
        return h('span', { class: 'flickerless-unknown' }, [
          h('span', { 'aria-hidden': 'true' }, props.placeholder),
          h('span', { class: 'flickerless-sr-only' }, props.unknownLabel),
        ]);
      }
      return slots.default ? slots.default({ value: props.value }) : String(props.value);
    };
  },
});
