import React from 'react';
import { FlickerlessValue } from './FlickerlessValue';

export interface FlickerlessTableShellProps {
  /** Columnas de la tabla. Tiene que coincidir con el número de `<th>`. */
  cols: number;
  rows?: number;
  /** Clase de la fila; la misma de las filas reales de esa tabla. */
  rowClassName?: string;
  /** Clase de la celda; la misma de las filas reales de esa tabla. */
  cellClassName?: string;
}

/**
 * Carcasa de una tabla que aún no tiene respuesta: filas reales con «—» en cada
 * celda, dentro del `<tbody>` de verdad. No imita contenido como un skeleton:
 * dice «todavía no se sabe» con las columnas y la altura reales.
 *
 * Solo cuando no hay nada que conservar; si ya había filas, se quedan,
 * atenuadas por la superficie:
 *
 *   <tbody>
 *     {loading && !rows.length ? <FlickerlessTableShell cols={6} /> : rows.map(…)}
 *   </tbody>
 */
export function FlickerlessTableShell({ cols, rows = 4, rowClassName, cellClassName }: FlickerlessTableShellProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden="true" className={rowClassName}>
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} className={cellClassName}>
              <FlickerlessValue />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
