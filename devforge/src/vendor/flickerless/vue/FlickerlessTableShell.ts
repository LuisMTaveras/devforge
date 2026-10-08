import { defineComponent, h } from 'vue';
import { FlickerlessValue } from './FlickerlessValue';

/**
 * Carcasa de una tabla que aún no tiene respuesta: filas reales con «—» en cada
 * celda, dentro del `<tbody>` de verdad. No imita contenido como un skeleton:
 * dice «todavía no se sabe» con las columnas y la altura reales, así que nada
 * salta al llegar los datos.
 *
 * Solo cuando no hay nada que conservar; si ya había filas, se quedan,
 * atenuadas por la `FlickerlessSurface` que envuelve la tabla:
 *
 *   <tbody>
 *     <FlickerlessTableShell v-if="loading && !filas.length" :cols="8" />
 *     <tr v-else-if="!filas.length">…sin resultados…</tr>
 *     <tr v-else v-for="fila in filas" …>
 *   </tbody>
 */
export const FlickerlessTableShell = defineComponent({
  name: 'FlickerlessTableShell',
  props: {
    /** Columnas de la tabla. Tiene que coincidir con el número de `<th>`. */
    cols: { type: Number, required: true },
    rows: { type: Number, default: 4 },
    /** Clase de la fila; la misma de las filas reales de esa tabla. */
    rowClass: { type: String, default: undefined },
    /** Clase de la celda; la misma de las filas reales de esa tabla. */
    cellClass: { type: String, default: undefined },
  },
  setup(props) {
    return () =>
      Array.from({ length: props.rows }, (_, r) =>
        h(
          'tr',
          { key: r, 'aria-hidden': 'true', class: props.rowClass },
          Array.from({ length: props.cols }, (_, c) => h('td', { key: c, class: props.cellClass }, [h(FlickerlessValue)])),
        ),
      );
  },
});
