import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  acceptDialog,
  cancelDialog,
  getDialogState,
  isLongDialogMessage,
  setDialogInput,
  subscribeDialog,
  type DialogType,
} from '../../../core/feedback/dialog.js';
import { useOverlay } from '../hooks/useOverlay.js';
import { Icon, type IconName } from './icons';
import { cx } from './usePopover';

/**
 * ⚡ DEVFORGE ConfirmDialog (React) — el diálogo del sistema. Va UNA vez en la raíz (`App.tsx`).
 * Se abre desde cualquier sitio con `alertDialog`, `confirmDialog` o `promptDialog`
 * (`@/core/feedback/dialog`). `tone: 'danger'` pinta destructivo; Escape cancela, Enter
 * confirma (Ctrl/Cmd+Enter en un campo de varias líneas). El telón no cierra.
 */
const LOOKS: Record<DialogType, { icon: IconName; color: string }> = {
  info: { icon: 'info', color: 'text-muted-foreground' },
  success: { icon: 'success', color: 'text-success' },
  warning: { icon: 'warning', color: 'text-warning' },
  error: { icon: 'error', color: 'text-danger' },
  confirm: { icon: 'help', color: 'text-muted-foreground' },
  prompt: { icon: 'edit', color: 'text-muted-foreground' },
};

export function ConfirmDialog() {
  const state = useSyncExternalStore(subscribeDialog, getDialogState, getDialogState);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useOverlay(state.open, cancelDialog);

  useEffect(() => {
    if (!state.open) return;
    if (state.type === 'prompt') inputRef.current?.focus();
    else if (state.tone === 'danger') cancelRef.current?.focus();
    else confirmRef.current?.focus();
  }, [state.open, state.type, state.tone]);

  if (!state.open) return null;

  const look = state.tone === 'danger' ? { icon: 'warning' as const, color: 'text-danger' } : LOOKS[state.type];
  const hasCancel = state.type === 'confirm' || state.type === 'prompt';
  const isLong = isLongDialogMessage(state.message);
  const confirmClass =
    state.tone === 'danger' || state.type === 'error'
      ? 'bg-danger text-danger-foreground hover:opacity-90'
      : hasCancel
        ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
        : 'border border-border bg-surface-hover text-foreground hover:bg-primary-subtle';

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    if (state.type === 'prompt' && state.inputMultiline && !(e.ctrlKey || e.metaKey)) return;
    if (e.target === cancelRef.current) return;
    e.preventDefault();
    acceptDialog();
  };

  const inputClass = cx(
    'mt-4 w-full rounded-control border bg-surface px-3.5 py-2.5 text-small text-foreground outline-none transition focus:ring-2 focus:ring-ring',
    state.inputError ? 'border-danger' : 'border-input focus:border-primary-border',
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-overlay p-6 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="df-dialog-title"
      aria-describedby={state.message ? 'df-dialog-message' : undefined}
      onKeyDown={onKeyDown}
    >
      <div className={cx('w-full overflow-hidden rounded-card border border-border bg-surface-raised shadow-popover', isLong ? 'max-w-lg' : 'max-w-sm')}>
        <div className={cx('flex flex-col p-6', isLong ? 'items-start text-left' : 'items-center text-center')}>
          <Icon name={look.icon} className={cx('mb-3 size-9', look.color)} />
          <h3 id="df-dialog-title" className="mb-2 text-title font-bold tracking-tight text-foreground">{state.title}</h3>
          {state.message && (
            <p id="df-dialog-message" className="whitespace-pre-line text-small leading-relaxed text-muted-foreground">{state.message}</p>
          )}
          {state.type === 'prompt' && (
            <>
              {state.inputMultiline ? (
                <textarea ref={inputRef} rows={3} value={state.inputValue} placeholder={state.inputPlaceholder}
                  aria-invalid={Boolean(state.inputError)} className={inputClass} onChange={e => setDialogInput(e.target.value)} />
              ) : (
                <input ref={inputRef} type="text" value={state.inputValue} placeholder={state.inputPlaceholder}
                  aria-invalid={Boolean(state.inputError)} className={inputClass} onChange={e => setDialogInput(e.target.value)} />
              )}
              {state.inputError && <p className="mt-2 text-caption font-semibold text-danger">{state.inputError}</p>}
            </>
          )}
        </div>
        <div className="flex gap-3 border-t border-border bg-surface px-6 py-4">
          {hasCancel && (
            <button ref={cancelRef} type="button" onClick={cancelDialog}
              className="h-9 flex-1 cursor-pointer rounded-control border border-border px-4 text-small font-semibold text-muted-foreground transition hover:bg-surface-hover hover:text-foreground">
              {state.cancelText}
            </button>
          )}
          <button ref={confirmRef} type="button" onClick={acceptDialog}
            className={cx('h-9 flex-1 cursor-pointer rounded-control px-4 text-small font-semibold transition', confirmClass)}>
            {state.confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
