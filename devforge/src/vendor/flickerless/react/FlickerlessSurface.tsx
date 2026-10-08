import React, { useEffect, useState, type ReactNode } from 'react';
import type { FlickerlessOptions } from '@flickerless/core';
import { useFlickerless } from './useFlickerless';
import { SettledContext } from './settled';

export interface FlickerlessSurfaceProps extends FlickerlessOptions {
  /**
   * Si los datos ya respondieron alguna vez. Sin respuesta no se sabe nada:
   * ni «vacío» ni «cero» son verdad todavía. Sin la prop se deduce: la
   * superficie queda resuelta cuando una carga termina sin error.
   */
  settled?: boolean;
  children?: ReactNode | ((state: { settled: boolean }) => ReactNode);
  /** Lo que se pinta con una respuesta vacía. Nunca durante la carga. */
  emptyState?: ReactNode;
  errorState?: ReactNode | ((err: unknown) => ReactNode);
  /** Texto para el lector de pantalla mientras el indicador está visible. */
  announceText?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Carga sin skeleton: lo que ya estaba se queda, atenuado, con una barra de
 * 2 px arriba. Una respuesta más rápida que `delayMs` no enseña ningún indicador.
 */
export const FlickerlessSurface: React.FC<FlickerlessSurfaceProps> = ({
  children,
  settled: settledProp,
  emptyState,
  errorState,
  announceText = 'Actualizando',
  className = '',
  style,
  streamHeight,
  streamColor,
  ...options
}) => {
  const { isVisibleLoading, surfaceProps, bodyProps } = useFlickerless(options);

  const [loadFinished, setLoadFinished] = useState(!options.loading && !options.error);
  useEffect(() => {
    if (!options.loading && !options.error) setLoadFinished(true);
  }, [options.loading, options.error]);
  const settled = settledProp ?? loadFinished;

  const customStyles: React.CSSProperties = {
    ...style,
    ...(streamHeight ? { ['--flickerless-stream-height' as string]: streamHeight } : {}),
    ...(streamColor ? { ['--flickerless-stream-color' as string]: streamColor } : {}),
  };

  // «Vacío» solo con una respuesta en la mano: durante la carga es una afirmación falsa.
  const showEmpty = settled && !options.loading && options.empty && emptyState;

  return (
    <SettledContext.Provider value={settled}>
      <div
        {...surfaceProps}
        className={`${surfaceProps.className} ${className}`.trim()}
        style={customStyles}
        aria-busy={isVisibleLoading}
      >
        <div className="flickerless-sr-only" role="status" aria-live="polite" aria-atomic="true">
          {isVisibleLoading ? announceText : ''}
        </div>
        <div className="flickerless-stream" aria-hidden="true" />

        {options.error && errorState ? (
          <div className="flickerless-error-state">
            {typeof errorState === 'function' ? errorState(options.error) : errorState}
          </div>
        ) : showEmpty ? (
          <div className="flickerless-empty-state">{emptyState}</div>
        ) : (
          <div {...bodyProps}>{typeof children === 'function' ? children({ settled }) : children}</div>
        )}
      </div>
    </SettledContext.Provider>
  );
};
