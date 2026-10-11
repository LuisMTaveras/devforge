'use client';
import React, { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { readQueryState, type FlickerlessOptions, type QuerySnapshot } from '@flickerless/core';
import { useFlickerless } from './useFlickerless.js';
import { SettledContext } from './settled.js';

// useLayoutEffect avisa en el servidor; allí no hay altura que medir.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface FlickerlessSurfaceProps extends Omit<FlickerlessOptions, 'loading' | 'error'> {
  /** Hay una petición en vuelo. Con `query` se deduce de ella. */
  loading?: boolean;
  error?: boolean | Error | string | null;
  /**
   * El resultado de una query (TanStack Query, SWR, Apollo…): la superficie lee `isFetching`,
   * `isPending`, `error` y `data`. Una página `{ items: [] }` / `{ edges: [] }` cuenta como vacía.
   * Las props sueltas (`loading`, `empty`, `error`) ganan si también se pasan.
   */
  query?: QuerySnapshot | null;
  /**
   * Si los datos ya respondieron alguna vez. Sin respuesta no se sabe nada:
   * ni «vacío» ni «cero» son verdad todavía. Sin la prop se deduce: la
   * superficie queda resuelta cuando una carga termina sin error.
   */
  settled?: boolean;
  /** Congela la altura mientras el indicador está visible (cero saltos de layout al recargar). */
  preserveHeight?: boolean;
  children?: ReactNode | ((state: { settled: boolean }) => ReactNode);
  /** Lo que se pinta con una respuesta vacía. Nunca durante la carga. */
  emptyState?: ReactNode;
  errorState?: ReactNode | ((err: unknown) => ReactNode);
  /** Texto para el lector de pantalla mientras el indicador está visible. */
  announceText?: string;
  /** Texto cuando la carga falla y no hay `errorState`: el error nunca se traga en silencio. `''` si la pantalla ya lo avisa. */
  errorText?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Carga sin skeleton: lo que ya estaba se queda, atenuado, con una barra de
 * 2 px arriba. Una respuesta más rápida que `delayMs` no enseña ningún indicador.
 */
export const FlickerlessSurface: React.FC<FlickerlessSurfaceProps> = ({
  children,
  query,
  settled: settledProp,
  preserveHeight = false,
  emptyState,
  errorState,
  announceText = 'Actualizando…',
  errorText = 'No se pudo cargar la información.',
  className = '',
  style,
  streamHeight,
  streamColor,
  loading: loadingProp,
  empty: emptyProp,
  error: errorProp,
  ...options
}) => {
  const fromQuery = query ? readQueryState(query) : null;
  const loading = loadingProp ?? fromQuery?.loading ?? false;
  const empty = emptyProp ?? fromQuery?.isEmpty ?? false;
  const error = errorProp ?? (fromQuery?.error as FlickerlessSurfaceProps['error']) ?? null;

  const { isVisibleLoading, surfaceProps, bodyProps } = useFlickerless({ ...options, loading, empty, error });

  // Resuelta = hubo una respuesta. Montar con loading=false y la lista vacía NO es una
  // respuesta (la petición aún no salió): seguir así sería pintar «vacío» y «0» falsos.
  const sawLoading = useRef(loading);
  // Con datos en la mano (aunque la última recarga fallara) lo que hay es verdad.
  const [loadFinished, setLoadFinished] = useState(!loading && !empty);
  useEffect(() => {
    if (loading) sawLoading.current = true;
    else if (!empty || (!error && sawLoading.current)) setLoadFinished(true);
  }, [loading, error, empty]);
  const settled = settledProp ?? (fromQuery ? fromQuery.settled : loadFinished);

  // Zero-CLS: al aparecer el indicador se fija la altura actual; se suelta 220 ms después de terminar.
  const rootRef = useRef<HTMLDivElement>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);
  useIsoLayoutEffect(() => {
    if (!preserveHeight) return;
    if (isVisibleLoading) {
      const h = rootRef.current?.getBoundingClientRect().height ?? 0;
      if (h > 0) setLockedHeight(Math.round(h));
      return;
    }
    const t = setTimeout(() => setLockedHeight(null), 220);
    return () => clearTimeout(t);
  }, [isVisibleLoading, preserveHeight]);

  const customStyles: React.CSSProperties = {
    ...style,
    ...(streamHeight ? { ['--flickerless-stream-height' as string]: streamHeight } : {}),
    ...(streamColor ? { ['--flickerless-stream-color' as string]: streamColor } : {}),
    ...(preserveHeight && lockedHeight ? { minHeight: lockedHeight } : {}),
  };

  // «Vacío» solo con una respuesta en la mano: durante la carga es una afirmación falsa.
  const showEmpty = settled && !loading && empty && emptyState;
  const body = <div {...bodyProps}>{typeof children === 'function' ? children({ settled }) : children}</div>;

  return (
    <SettledContext.Provider value={settled}>
      <div
        {...surfaceProps}
        ref={rootRef}
        className={[surfaceProps.className, preserveHeight ? 'flickerless-preserve-height' : '', className].filter(Boolean).join(' ')}
        style={customStyles}
        aria-busy={isVisibleLoading}
      >
        <div className="flickerless-sr-only" role="status" aria-live="polite" aria-atomic="true">
          {isVisibleLoading ? announceText : ''}
        </div>
        <div className="flickerless-stream" aria-hidden="true" />

        {error && errorState ? (
          <div className="flickerless-error-state">{typeof errorState === 'function' ? errorState(error) : errorState}</div>
        ) : error ? (
          // Sin errorState: se avisa y se conserva lo que había.
          <>
            {errorText ? <div className="flickerless-error-inline" role="alert">{errorText}</div> : null}
            {body}
          </>
        ) : showEmpty ? (
          <div className="flickerless-empty-state">{emptyState}</div>
        ) : (
          body
        )}
      </div>
    </SettledContext.Provider>
  );
};
