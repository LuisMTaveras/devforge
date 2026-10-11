import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  authorizationConfig,
  cancelAuthorization,
  getAuthorizationState,
  grantAuthorization,
  onAuthorizationResolved,
  subscribeAuthorization,
} from '../../../core/authorizations/authorization.js';
import { formatCurrency } from '../../../core/formatters/formatters.js';
import { useOverlay } from '../hooks/useOverlay.js';
import { Icon, type IconName } from './icons';
import { cx } from './usePopover';

/**
 * ⚡ DEVFORGE AuthorizationDialog (React) — el modal de quien PIDE el aval (blueprint 08).
 * Va UNA vez en la raíz. Lo abre el interceptor con el 403 del servidor; la pantalla que guardó
 * no sabe que existe. NO describe el acto: solo devuelve la `pendingKey` del servidor.
 */
type Mode = 'CREDENTIALS' | 'REMOTE';
const labelClass = 'mb-1 block text-caption font-black uppercase tracking-wider text-muted-foreground';
const inputClass = 'w-full rounded-control border border-input bg-surface px-3 py-2 text-small text-foreground outline-none transition focus:border-primary-border focus:ring-2 focus:ring-ring';
const primaryBtn = 'w-full cursor-pointer rounded-control bg-primary py-2.5 text-small font-bold text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50';
const errorText = (err: unknown, fallback: string) => (err as { message?: string })?.message || fallback;

export function AuthorizationDialog() {
  const state = useSyncExternalStore(subscribeAuthorization, getAuthorizationState, getAuthorizationState);
  const challenge = state.challenge;
  const [mode, setMode] = useState<Mode>('CREDENTIALS');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const canUseCredentials = Boolean(challenge && (challenge.canSelfAuthorize || challenge.allowInlineCredentials));
  const noAuthorizers = (challenge?.authorizers.length ?? 0) === 0;
  const reasonMissing = Boolean(challenge?.requiresReason) && !note.trim();
  const waiting = Boolean(pendingRequestId);

  // Al abrir: la vía con menos fricción para quien está delante.
  useEffect(() => {
    if (!state.open || !challenge) return;
    setError(null);
    setPassword('');
    setMfaToken('');
    setNote('');
    setPendingRequestId(challenge.pendingRequestId ?? null);
    setEmail(challenge.canSelfAuthorize ? authorizationConfig.currentUserEmail() ?? '' : '');
    setMode((challenge.canSelfAuthorize || challenge.allowInlineCredentials) && !challenge.pendingRequestId ? 'CREDENTIALS' : 'REMOTE');
    requestAnimationFrame(() => passwordRef.current?.focus());
  }, [state.open, challenge]);

  // Esperando la firma: el socket es el camino normal; el sondeo, el respaldo.
  useEffect(() => {
    if (!pendingRequestId) return;
    const stopWaiting = (message: string) => {
      setError(message);
      setPendingRequestId(null);
    };
    const collect = async () => {
      try {
        const result = await authorizationConfig.transport.collectGrant(pendingRequestId);
        if (result.grant) return grantAuthorization(result.grant);
        if (result.status === 'REJECTED') stopWaiting('La solicitud fue rechazada.');
        else if (result.status === 'EXPIRED' || result.status === 'CANCELLED') stopWaiting('La solicitud caducó. Vuelve a intentarlo.');
      } catch {
        // Un fallo de red no cancela la espera.
      }
    };
    const stop = onAuthorizationResolved(event => {
      if (event.requestId !== pendingRequestId) return;
      if (event.status === 'APPROVED') void collect();
      else stopWaiting(event.status === 'REJECTED' ? `${event.decidedBy || 'Quien autoriza'} rechazó la solicitud.` : 'La solicitud caducó. Vuelve a intentarlo.');
    });
    const timer = setInterval(collect, authorizationConfig.pollMs);
    return () => {
      stop();
      clearInterval(timer);
    };
  }, [pendingRequestId]);

  const closeDialog = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (pendingRequestId) await authorizationConfig.transport.cancelRequest(pendingRequestId).catch(() => undefined);
      else if (challenge)
        await authorizationConfig.transport
          .cancelAttempt({ pendingKey: challenge.pendingKey, channel: mode === 'CREDENTIALS' ? 'INLINE' : 'REMOTE', ...(note.trim() ? { note: note.trim() } : {}) })
          .catch(() => undefined);
    } finally {
      setBusy(false);
      setPendingRequestId(null);
      cancelAuthorization();
    }
  };

  useOverlay(state.open, () => void closeDialog());

  if (!state.open || !challenge) return null;

  const submitCredentials = async () => {
    if (busy) return;
    setError(null);
    if (reasonMissing) return setError('Hay que escribir el motivo.');
    setBusy(true);
    try {
      const { grant } = await authorizationConfig.transport.challenge({
        pendingKey: challenge.pendingKey,
        email: email.trim(),
        password,
        ...(mfaToken.trim() ? { mfaToken: mfaToken.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      grantAuthorization(grant);
    } catch (err) {
      setError(errorText(err, 'No se pudo verificar. Intenta de nuevo.'));
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  const requestRemote = async () => {
    if (busy) return;
    setError(null);
    if (reasonMissing) return setError('Hay que escribir el motivo.');
    setBusy(true);
    try {
      const { requestId } = await authorizationConfig.transport.requestRemote({ pendingKey: challenge.pendingKey, ...(note.trim() ? { note: note.trim() } : {}) });
      setPendingRequestId(requestId);
    } catch (err) {
      setError(errorText(err, 'No se pudo enviar la solicitud.'));
    } finally {
      setBusy(false);
    }
  };

  const look: { icon: IconName; color: string } =
    challenge.severity === 'CRITICAL' ? { icon: 'shield', color: 'text-danger' } : challenge.severity === 'HIGH' ? { icon: 'shield', color: 'text-warning' } : { icon: 'lock', color: 'text-muted-foreground' };
  const errorLine = error && <p className="text-small font-bold text-danger" role="alert">{error}</p>;

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-overlay p-6 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="df-authorization-title">
      <div className="w-full max-w-md overflow-hidden rounded-card border border-border bg-surface-raised shadow-popover">
        <div className="border-b border-border p-6 pb-4">
          <div className="flex items-start gap-3">
            <Icon name={look.icon} className={cx('size-8 shrink-0', look.color)} />
            <div className="min-w-0">
              <h3 id="df-authorization-title" className="text-title font-black uppercase tracking-tight text-foreground">Necesita autorización</h3>
              <p className="mt-1 text-small font-bold text-foreground">{challenge.actionName}</p>
              {challenge.amount !== null && (
                <p className="mt-2 text-display font-black tabular-nums text-foreground">{formatCurrency(challenge.amount, { currency: challenge.currency || challenge.baseCurrency })}</p>
              )}
              {challenge.reason === 'OVER_THRESHOLD' && challenge.thresholdAmount !== null && (
                <p className="mt-1 text-caption font-bold text-dim-foreground">Supera el límite libre de {formatCurrency(challenge.thresholdAmount, { currency: challenge.baseCurrency })}</p>
              )}
              {challenge.requiredApprovals > 1 && <p className="mt-1 text-caption font-bold text-warning">Requiere {challenge.requiredApprovals} firmas distintas.</p>}
            </div>
          </div>
        </div>

        {noAuthorizers ? (
          <div className="p-6">
            <p className="mb-2 text-small font-bold text-danger">Nadie puede autorizar esto</p>
            <p className="text-small leading-relaxed text-muted-foreground">{challenge.message}</p>
          </div>
        ) : waiting ? (
          <div className="p-6 text-center">
            <Icon name="clock" className="mx-auto mb-3 size-10 text-muted-foreground" />
            <p className="text-small font-bold text-foreground">Esperando autorización</p>
            <p className="mt-2 text-small leading-relaxed text-muted-foreground">
              Se avisó a {challenge.authorizers.length} {challenge.authorizers.length === 1 ? 'persona' : 'personas'}. En cuanto alguien apruebe, la operación continúa sola:
              puedes dejar esta ventana abierta.
            </p>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            <p className="text-small leading-relaxed text-muted-foreground">{challenge.message}</p>
            {canUseCredentials && challenge.allowRemoteRequest && (
              <div className="flex gap-1 rounded-control bg-surface-hover p-1" role="tablist">
                {(['CREDENTIALS', 'REMOTE'] as Mode[]).map(m => (
                  <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                    className={cx('flex-1 cursor-pointer rounded-control px-3 py-2 text-small font-bold transition', mode === m ? 'bg-surface text-foreground shadow-sm' : 'text-dim-foreground hover:text-foreground')}>
                    {m === 'REMOTE' ? 'Solicitar' : challenge.canSelfAuthorize ? 'Mi contraseña' : 'Credenciales'}
                  </button>
                ))}
              </div>
            )}
            {challenge.requiresReason && (
              <label className="block">
                <span className={labelClass}>Motivo *</span>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className={cx(inputClass, 'resize-none')} placeholder="Por qué se hace esta operación" />
              </label>
            )}
            {mode === 'CREDENTIALS' && canUseCredentials ? (
              <form className="space-y-3" onSubmit={e => { e.preventDefault(); void submitCredentials(); }}>
                {!challenge.canSelfAuthorize && (
                  <>
                    <p className="text-small leading-relaxed text-muted-foreground">Alguien autorizado tiene que teclear sus credenciales en este equipo.</p>
                    <label className="block">
                      <span className={labelClass}>Correo</span>
                      <input type="email" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
                    </label>
                  </>
                )}
                <label className="block">
                  <span className={labelClass}>Contraseña</span>
                  <input ref={passwordRef} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} />
                </label>
                {challenge.requireMfa && (
                  <label className="block">
                    <span className={labelClass}>Código de verificación</span>
                    <input inputMode="numeric" maxLength={6} placeholder="000000" value={mfaToken} onChange={e => setMfaToken(e.target.value)} className={cx(inputClass, 'text-center tracking-widest')} />
                  </label>
                )}
                {errorLine}
                <button type="submit" disabled={busy || !password} className={primaryBtn}>{busy ? 'Verificando…' : 'Autorizar'}</button>
              </form>
            ) : challenge.allowRemoteRequest ? (
              <div className="space-y-3">
                <p className="text-small leading-relaxed text-muted-foreground">Se le pedirá a quien pueda avalarlo. Te avisamos aquí mismo en cuanto responda.</p>
                <div className="space-y-1">
                  <p className={labelClass}>Se le pedirá a</p>
                  {challenge.authorizers.slice(0, 4).map(person => (
                    <p key={person.id} className="text-small font-bold text-foreground">
                      {person.name}
                      {person.roleName && <span className="font-normal text-dim-foreground"> · {person.roleName}</span>}
                    </p>
                  ))}
                  {challenge.authorizers.length > 4 && <p className="text-caption text-dim-foreground">y {challenge.authorizers.length - 4} más</p>}
                </div>
                {errorLine}
                <button type="button" disabled={busy} onClick={requestRemote} className={primaryBtn}>{busy ? 'Enviando…' : 'Solicitar autorización'}</button>
              </div>
            ) : null}
          </div>
        )}

        <div className="border-t border-border bg-surface px-6 py-4">
          <button type="button" disabled={busy} onClick={closeDialog}
            className="w-full cursor-pointer rounded-control py-2 text-small font-bold text-dim-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? 'Cerrando…' : waiting ? 'Cancelar solicitud' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
