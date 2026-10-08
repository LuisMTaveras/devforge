import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * ⚡ DEVFORGE: estado compartido de los menús flotantes (SelectField, DatePicker).
 * Posición fija junto al disparador (se pinta en un portal en `body`, así un modal con
 * `overflow` no lo recorta), se abre hacia arriba si no cabe, y cierra con clic afuera.
 * Los manejadores de `document` solo existen mientras está ABIERTO.
 */
export function usePopover(opts: { width: (triggerWidth: number) => number; height: number }) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { width: widthOf, height } = optsRef.current;
    const width = widthOf(rect.width);
    const openUp = window.innerHeight - rect.bottom < height && rect.top > height;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    setStyle({
      position: 'fixed',
      left,
      width,
      maxWidth: 'calc(100vw - 1rem)',
      zIndex: 9999,
      transformOrigin: openUp ? 'bottom' : 'top',
      ...(openUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    });
  }, []);

  const open = useCallback(() => {
    updatePosition();
    setIsOpen(true);
  }, [updatePosition]);

  const close = useCallback((refocus = true) => {
    setIsOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    popoverRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, close, updatePosition]);

  return { triggerRef, popoverRef, isOpen, style, open, close };
}

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');
