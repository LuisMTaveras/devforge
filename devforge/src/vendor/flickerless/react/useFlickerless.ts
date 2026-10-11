import { useEffect, useRef, useState } from 'react';
import { FlickerlessController, type FlickerlessOptions, type FlickerlessStatus } from '@flickerless/core';

export interface UseFlickerlessReturn {
  isVisibleLoading: boolean;
  status: FlickerlessStatus;
  surfaceProps: {
    className: string;
    'data-loading': string;
    'data-status': FlickerlessStatus;
  };
  bodyProps: {
    className: string;
  };
}

export function useFlickerless(options: FlickerlessOptions): UseFlickerlessReturn {
  const [isVisibleLoading, setIsVisibleLoading] = useState(false);
  const [status, setStatus] = useState<FlickerlessStatus>('idle');
  const controllerRef = useRef<FlickerlessController | null>(null);

  // Se crea en el render (no en un efecto) para que la primera carga cuente
  // desde el montaje. En StrictMode la limpieza lo destruye y se recrea.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const create = () =>
    new FlickerlessController({
      ...optionsRef.current,
      onStateChange: (state) => {
        setIsVisibleLoading(state.isVisibleLoading);
        setStatus(state.status);
      },
    });
  if (!controllerRef.current) controllerRef.current = create();

  useEffect(() => {
    controllerRef.current?.update({
      loading: options.loading,
      empty: options.empty,
      error: options.error,
      delayMs: options.delayMs,
      minDurationMs: options.minDurationMs,
    });
  }, [options.loading, options.empty, options.error, options.delayMs, options.minDurationMs]);

  useEffect(() => {
    // StrictMode desmonta y vuelve a montar sin otro render: sin esto la primera
    // carga se quedaba sin controlador (y sin barra) hasta el siguiente cambio.
    if (!controllerRef.current) controllerRef.current = create();
    return () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isVisibleLoading,
    status,
    surfaceProps: {
      className: 'flickerless-surface',
      'data-loading': isVisibleLoading ? 'true' : 'false',
      'data-status': status,
    },
    bodyProps: {
      className: 'flickerless-body',
    },
  };
}
