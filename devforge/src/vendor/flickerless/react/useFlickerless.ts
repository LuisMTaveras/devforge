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
  if (!controllerRef.current) {
    controllerRef.current = new FlickerlessController({
      ...options,
      onStateChange: (state) => {
        setIsVisibleLoading(state.isVisibleLoading);
        setStatus(state.status);
      },
    });
  }

  useEffect(() => {
    controllerRef.current?.update({
      loading: options.loading,
      empty: options.empty,
      error: options.error,
      delayMs: options.delayMs,
      minDurationMs: options.minDurationMs,
    });
  }, [options.loading, options.empty, options.error, options.delayMs, options.minDurationMs]);

  useEffect(
    () => () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    },
    [],
  );

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
