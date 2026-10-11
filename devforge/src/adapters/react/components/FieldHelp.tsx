import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';

/**
 * ⚡ DEVFORGE FieldHelp (React) — «qué es este campo y en qué afecta», junto a la etiqueta.
 * Funciona en táctil (abre al tocar), con teclado (foco) y con cursor fino; Escape, tocar fuera o
 * desplazar la cierran. No repite la etiqueta: dice qué hace el campo y qué cambia en el resultado.
 *
 *   <label htmlFor="tope">Tope de descuento <FieldHelp label="Tope de descuento" text="Lo máximo que un vendedor puede rebajar sin pedir autorización." /></label>
 */
export interface FieldHelpProps {
  label: string;
  text?: string;
  children?: ReactNode;
}

const GUTTER = 12;
const WIDTH = 320;

export function FieldHelp({ label, text, children }: FieldHelpProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const trigger = useRef<HTMLButtonElement>(null);
  /** El foco (o el cursor) abre justo antes del clic del mismo gesto: ese clic no debe cerrarla. */
  const openedAt = useRef(0);

  const show = () => {
    const el = trigger.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const width = Math.min(WIDTH, window.innerWidth - GUTTER * 2);
      const left = Math.min(Math.max(GUTTER, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - GUTTER);
      const top = window.innerHeight - rect.bottom < 160 ? Math.max(GUTTER, rect.top - 160) : rect.bottom + 8;
      setPos({ top, left });
    }
    setOpen(was => {
      if (!was) openedAt.current = Date.now();
      return true;
    });
  };
  const hide = () => setOpen(false);
  const fine = () => !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        hide();
      }
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    document.addEventListener('click', hide);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      document.removeEventListener('click', hide);
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full align-middle transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${open ? 'text-foreground' : 'text-dim-foreground'}`}
        aria-label={`Qué es ${label}`}
        aria-expanded={open}
        onClick={e => {
          e.stopPropagation();
          e.preventDefault();
          if (open && Date.now() - openedAt.current > 300) hide();
          else show();
        }}
        onMouseEnter={() => fine() && show()}
        onMouseLeave={() => fine() && hide()}
        onFocus={show}
        onBlur={hide}
      >
        <Icon name="help" className="size-4" />
      </button>
      {open &&
        createPortal(
          <div
            role="tooltip"
            className="fixed z-250 w-[min(20rem,calc(100vw-1.5rem))] rounded-card border border-border bg-surface-raised px-3.5 py-3 text-caption leading-relaxed text-muted-foreground shadow-popover"
            style={{ top: pos.top, left: pos.left }}
            onClick={e => e.stopPropagation()}
          >
            <p className="mb-1 text-caption font-bold text-foreground">{label}</p>
            {children ?? <span className="whitespace-pre-line">{text}</span>}
          </div>,
          document.body,
        )}
    </>
  );
}
