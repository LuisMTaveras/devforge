/** ⚡ DEVFORGE: icono SVG en línea (sin dependencia de iconos). Pasa siempre su tamaño: `<DfIcon name="close" class="size-4" />`. */
import { defineComponent, h, type PropType } from 'vue';
import { ICON_PATHS, type IconName } from '../../shared/icon-paths.js';

export const DfIcon = defineComponent({
  name: 'DfIcon',
  props: { name: { type: String as PropType<IconName>, required: true } },
  setup(props) {
    return () =>
      h('svg', { viewBox: '0 0 20 20', fill: 'currentColor', 'aria-hidden': 'true' }, [
        h('path', { 'fill-rule': 'evenodd', 'clip-rule': 'evenodd', d: ICON_PATHS[props.name] }),
      ]);
  },
});
