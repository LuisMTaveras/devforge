import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { pushEscapeLayer } from '../../../core/overlay/escape-layer.js';
import { menuPosition } from '../../../core/overlay/menu-position.js';
import { Icon, type IconName } from './icons';
import { cx } from './usePopover';

/**
 * ⚡ DEVFORGE RowMenu (React) — el menú ⋮ de una fila. Vive en `body`, abre hacia arriba si no
 * cabe, cierra con clic afuera / Escape y solo hay UNO abierto. Lo no disponible se ve
 * apagado con su motivo (`disabled: 'Ya está anulada'`).
 *
 *   <RowMenu actions={[{ id: 'ver', label: 'Ver detalle', icon: 'info' },
 *                      { id: 'anular', label: 'Anular', tone: 'danger', separatorBefore: true, disabled: !row?.anulable && 'Ya está anulada' }]}
 *            onSelect={id => onAccion(id, row)} />
 */
export interface RowAction {
  id: string;
  label: string;
  icon?: IconName;
  tone?: 'neutral' | 'danger';
  /** `true` la apaga; un texto la apaga y explica por qué. */
  disabled?: boolean | string;
  separatorBefore?: boolean;
}

let closeOpenMenu: (() => void) | null = null;

export function RowMenu({ actions, onSelect, label = 'Acciones' }: { actions: RowAction[]; onSelect: (id: string) => void; label?: string }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const isOpen = pos !== null;

  const close = (refocus = false) => {
    setPos(null);
    if (refocus) triggerRef.current?.focus();
  };

  const focusItem = (from: number, step: 1 | -1) => {
    const n = actions.length;
    for (let k = 0; k < n; k++) {
      const i = (((from + k * step) % n) + n) % n;
      if (!actions[i]?.disabled) return itemRefs.current[i]?.focus();
    }
    menuRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    const mine = () => close();
    closeOpenMenu?.();
    closeOpenMenu = mine;
    focusItem(0, 1);
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) close();
    };
    const quiet = () => close();
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', quiet, true);
    window.addEventListener('resize', quiet);
    const releaseEscape = pushEscapeLayer(() => close(true));
    return () => {
      if (closeOpenMenu === mine) closeOpenMenu = null;
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', quiet, true);
      window.removeEventListener('resize', quiet);
      releaseEscape();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const toggle = () => {
    if (isOpen) return close();
    const rect = triggerRef.current!.getBoundingClientRect();
    setPos(menuPosition(rect, { entries: actions.length }));
  };

  const choose = (action: RowAction) => {
    if (action.disabled) return;
    close(true);
    onSelect(action.id);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const current = itemRefs.current.findIndex(el => el === document.activeElement);
    const moves: Record<string, () => void> = {
      ArrowDown: () => focusItem(current + 1, 1),
      ArrowUp: () => focusItem(current - 1, -1),
      Home: () => focusItem(0, 1),
      End: () => focusItem(actions.length - 1, -1),
    };
    if (moves[e.key]) {
      e.preventDefault();
      moves[e.key]();
    } else if (e.key === 'Tab') close();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={label}
        title={label}
        onClick={e => {
          e.stopPropagation();
          toggle();
        }}
        className={cx('grid size-8 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground', isOpen && 'bg-surface-hover text-foreground')}
      >
        <Icon name="ellipsis" className="size-5" />
      </button>
      {pos &&
        createPortal(
          <div ref={menuRef} role="menu" tabIndex={-1} aria-label={label} onKeyDown={onKeyDown}
            style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width, zIndex: 9999 }}
            className="rounded-card border border-border bg-surface-raised p-1.5 shadow-popover focus:outline-none">
            {actions.map((action, i) => (
              <div key={action.id}>
                {action.separatorBefore && <div className="my-1 border-t border-border" role="separator" />}
                <button
                  ref={el => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  role="menuitem"
                  disabled={Boolean(action.disabled)}
                  title={typeof action.disabled === 'string' ? action.disabled : undefined}
                  onClick={() => choose(action)}
                  className={cx(
                    'flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-small transition focus:outline-none',
                    action.disabled
                      ? 'cursor-not-allowed text-dim-foreground opacity-60'
                      : action.tone === 'danger'
                        ? 'cursor-pointer text-danger hover:bg-danger/10 focus:bg-danger/10'
                        : 'cursor-pointer text-foreground hover:bg-surface-hover focus:bg-surface-hover',
                  )}
                >
                  {action.icon && <Icon name={action.icon} className="size-4 shrink-0" />}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{action.label}</span>
                    {typeof action.disabled === 'string' && <span className="truncate text-caption text-dim-foreground">{action.disabled}</span>}
                  </span>
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
