import React, { type ReactNode } from 'react';
import { useSettled } from './settled';

export interface FlickerlessValueProps<T> {
  value?: T | null;
  /** Cómo se pinta el valor cuando existe. Sin él, `String(value)`. */
  children?: (value: T) => ReactNode;
  placeholder?: string;
  unknownLabel?: string;
}

/**
 * Un dato que puede no existir todavía. Sin respuesta pinta «—» atenuado en vez
 * de un cero: «$0.00» antes de cargar es una cifra falsa, no un hueco.
 * Desconocido = la superficie que lo envuelve aún no responde, o `value` es
 * null/undefined.
 */
export function FlickerlessValue<T>({ value, children, placeholder = '—', unknownLabel = 'Sin dato todavía' }: FlickerlessValueProps<T>) {
  const settled = useSettled();
  if (value === null || value === undefined || settled === false) {
    return (
      <span className="flickerless-unknown">
        <span aria-hidden="true">{placeholder}</span>
        <span className="flickerless-sr-only">{unknownLabel}</span>
      </span>
    );
  }
  if (children) return <>{children(value)}</>;
  return <>{String(value)}</>;
}
