import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  AUTHORIZATION_ALERTS_VISIBLE,
  authorizationConfig,
  closeAuthorizationAlert,
  dismissAuthorizationAlert,
  getAuthorizationAlerts,
  getAuthorizationState,
  pruneAuthorizationAlerts,
  subscribeAuthorization,
  subscribeAuthorizationAlerts,
  timeLeftLabel,
  type AuthorizationAlert,
} from '../../../core/authorizations/authorization.js';
import { formatCurrency } from '../../../core/formatters/formatters.js';
import { Icon } from './icons';
import { cx } from './usePopover';

/**
 * ⚡ DEVFORGE AuthorizationAlerts (React) — el aviso EN VIVO de quien FIRMA. Va UNA vez en la raíz.
 * No se va solo, se resuelve desde aquí y se retira cuando deja de hacer falta.
 *   socket.on('authorization:requested', a => pushAuthorizationAlert(a, { currentUserId }))
 *   socket.on('authorization:closed', e => closeAuthorizationAlert(e.requestId))
 */
export function AuthorizationAlerts() {
  const alerts = useSyncExternalStore(subscribeAuthorizationAlerts, getAuthorizationAlerts, getAuthorizationAlerts);
  const dialog = useSyncExternalStore(subscribeAuthorization, getAuthorizationState, getAuthorizationState);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Un solo reloj para toda la pila, y solo mientras hay algo que enseñar.
  const hasAlerts = alerts.length > 0;
  useEffect(() => {
    if (!hasAlerts) return;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      pruneAuthorizationAlerts(t);
    }, 1000);
    return () => clearInterval(timer);
  }, [hasAlerts]);

  if (!alerts.length || dialog.open) return null;
  const visible = alerts.slice(0, AUTHORIZATION_ALERTS_VISIBLE);
  const hidden = alerts.length - visible.length;

  const decide = async (alert: AuthorizationAlert, decision: 'APPROVED' | 'REJECTED') => {
    setBusy(b => ({ ...b, [alert.requestId]: true }));
    setErrors(({ [alert.requestId]: _gone, ...rest }) => rest);
    try {
      await authorizationConfig.transport.decide(alert.requestId, decision);
      closeAuthorizationAlert(alert.requestId);
    } catch (err) {
      setErrors(e => ({ ...e, [alert.requestId]: (err as { message?: string })?.message || 'No se pudo registrar la decisión.' }));
    } finally {
      setBusy(b => ({ ...b, [alert.requestId]: false }));
    }
  };

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[10001] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="assertive">
      {visible.map(alert => {
        const left = new Date(alert.expiresAt).getTime() - now;
        return (
          <article key={alert.requestId} role="alertdialog" aria-label={`Autorización solicitada: ${alert.actionName}`}
            className="pointer-events-auto rounded-card border border-border bg-surface-raised p-4 shadow-popover">
            <div className="flex items-start gap-3">
              <Icon name="shield" className="mt-0.5 size-5 shrink-0 text-warning" />
              <div className="min-w-0 flex-1">
                <p className="text-small font-bold text-foreground">{alert.requestedBy} espera tu autorización</p>
                <p className="text-small text-muted-foreground">
                  {alert.actionName}
                  {alert.amount != null && (
                    <>
                      {' · '}
                      <span className="font-bold tabular-nums text-foreground">{formatCurrency(alert.amount, { currency: alert.currency || undefined })}</span>
                    </>
                  )}
                </p>
                {alert.note && <p className="mt-1 line-clamp-2 text-caption text-dim-foreground">«{alert.note}»</p>}
                <p className={cx('mt-1 text-caption font-bold tabular-nums', left < 120_000 ? 'text-danger' : 'text-dim-foreground')}>
                  Caduca en {timeLeftLabel(alert.expiresAt, now) ?? '0:00'}
                </p>
                {errors[alert.requestId] && <p className="mt-1 text-caption font-bold text-danger" role="alert">{errors[alert.requestId]}</p>}
              </div>
              <button type="button" aria-label="Apartar aviso" onClick={() => dismissAuthorizationAlert(alert.requestId)}
                className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-control text-muted-foreground hover:bg-surface-hover hover:text-foreground">
                <Icon name="close" className="size-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={busy[alert.requestId]} onClick={() => decide(alert, 'REJECTED')}
                className="h-9 flex-1 cursor-pointer rounded-control border border-border text-small font-bold text-muted-foreground transition hover:bg-danger/10 hover:text-danger disabled:opacity-50">
                Rechazar
              </button>
              <button type="button" disabled={busy[alert.requestId]} onClick={() => decide(alert, 'APPROVED')}
                className="h-9 flex-1 cursor-pointer rounded-control bg-primary text-small font-bold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50">
                Autorizar
              </button>
            </div>
          </article>
        );
      })}
      {hidden > 0 && (
        <p className="pointer-events-auto self-end rounded-full border border-border bg-surface-raised px-3 py-1 text-caption font-bold text-muted-foreground shadow-popover">y {hidden} más esperando</p>
      )}
    </div>,
    document.body,
  );
}
