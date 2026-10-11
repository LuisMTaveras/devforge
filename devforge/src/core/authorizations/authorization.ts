/**
 * ⚡ DEVFORGE Authorizations — el cliente del sistema de autorizaciones (blueprint 08).
 * Zero-dependency, framework-agnostic. Lo pintan <AuthorizationDialog /> y <AuthorizationAlerts />.
 *
 * Un PERMISO dice qué puede tocar una persona y se comprueba al ENTRAR. Una AUTORIZACIÓN
 * dice si ESTE acto, con ESTE importe y sobre ESTE cliente, puede consumarse, y se
 * comprueba al CONSUMAR. Nunca se resuelve inventando un permiso de excepción
 * (`descuentos:override_tope`): eso es un sí permanente, sin importe y sin rastro.
 *
 * El ciclo, visto desde el cliente:
 *   1. La pantalla guarda (`POST /notas-credito`). No sabe nada de autorizaciones.
 *   2. El servidor calcula el acto y, si hace falta aval, responde
 *      `403 { code: 'AUTHORIZATION_REQUIRED', message, details: AuthorizationChallenge }`.
 *   3. El interceptor abre el modal y ESPERA. Alguien teclea su contraseña aquí mismo,
 *      o se pide a distancia y se espera la firma.
 *   4. Con la llave, el interceptor reintenta la MISMA petición con la cabecera
 *      `X-Authorization-Grant`. Para la pantalla, su `await` tardó un poco y devolvió 201.
 *
 * El cliente NUNCA describe el acto: solo devuelve la `pendingKey` opaca del servidor.
 * Si pudiera mandar «autoriza 50.000», el importe lo elegiría el cliente.
 */

export const AUTHORIZATION_GRANT_HEADER = 'X-Authorization-Grant';
export const AUTHORIZATION_REQUIRED = 'AUTHORIZATION_REQUIRED';
export const AUTHORIZATION_INVALID = 'AUTHORIZATION_INVALID';

export type AuthorizationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Lo que el servidor manda en `details` del 403 para que el modal se pinte sin adivinar. */
export interface AuthorizationChallenge {
  actionCode: string;
  /** Nombre legible del acto: «Emitir nota de crédito». */
  actionName: string;
  /** El hecho y la salida: «… Pídesela a Ana Reyes o Luis Taveras.» Lo redacta el servidor. */
  message: string;
  reason: 'ALWAYS' | 'OVER_THRESHOLD';
  severity: AuthorizationSeverity;
  amount: number | null;
  currency: string | null;
  baseCurrency: string;
  thresholdAmount: number | null;
  canSelfAuthorize: boolean;
  allowInlineCredentials: boolean;
  allowRemoteRequest: boolean;
  requiresReason: boolean;
  requiredApprovals: number;
  requireMfa: boolean;
  /** Quién puede avalar ESTE acto por ESTE importe (lo filtró el servidor). */
  authorizers: Array<{ id: string; name: string; roleName?: string | null }>;
  /** Referencia opaca al acto que el servidor guardó. */
  pendingKey: string;
  /** Si ya existe una solicitud a distancia para este acto, el modal abre esperando. */
  pendingRequestId?: string | null;
}

export type AuthorizationOutcome = { status: 'GRANTED'; grant: string } | { status: 'CANCELLED' };

// ── Transporte: los endpoints del blueprint 08 ─────────────────────────────

export type RequestStatus = 'PENDING' | 'APPROVED' | 'CONSUMED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export interface AuthorizationTransport {
  /** Vía A: alguien teclea sus credenciales aquí. Devuelve la llave. */
  challenge(input: { pendingKey: string; email: string; password: string; mfaToken?: string; note?: string }): Promise<{ grant: string }>;
  /** Vía B: pedirlo a distancia. Devuelve la solicitud. */
  requestRemote(input: { pendingKey: string; note?: string }): Promise<{ requestId: string }>;
  /** Recoge la llave de una solicitud ya aprobada. */
  collectGrant(requestId: string): Promise<{ grant?: string | null; status: RequestStatus }>;
  /** Retira la solicitud pendiente. */
  cancelRequest(requestId: string): Promise<void>;
  /** Registra un intento abandonado (para el historial: «se intentó y se dejó»). */
  cancelAttempt(input: { pendingKey: string; channel: 'INLINE' | 'REMOTE'; note?: string }): Promise<void>;
  /** Quien firma decide desde la tarjeta en vivo. */
  decide(requestId: string, decision: 'APPROVED' | 'REJECTED', note?: string): Promise<void>;
}

/** Error con el mensaje que mandó el servidor (pensado para leerse tal cual). */
export class AuthorizationTransportError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Transporte por `fetch` contra `/api/authorizations` (blueprint 08 §8).
 * Respuestas `{ data: … }` o el objeto a secas; errores `{ message | error, code? }`.
 */
export function createFetchTransport(opts: {
  baseUrl?: string;
  /** Cabeceras de cada petición (p. ej. `Authorization: Bearer …` de `tokenStorage`). */
  headers?: () => Record<string, string>;
  credentials?: RequestCredentials;
} = {}): AuthorizationTransport {
  const base = (opts.baseUrl ?? '/api/authorizations').replace(/\/$/, '');

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      method,
      credentials: opts.credentials ?? 'include',
      headers: { 'Content-Type': 'application/json', ...(opts.headers?.() ?? {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new AuthorizationTransportError(json?.message || json?.error || 'No se pudo completar la solicitud.', res.status, json?.code);
    }
    return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
  }

  return {
    challenge: input => call('POST', '/challenge', input),
    requestRemote: input => call('POST', '/requests', input),
    collectGrant: id => call('GET', `/requests/${encodeURIComponent(id)}/grant`),
    cancelRequest: id => call('DELETE', `/requests/${encodeURIComponent(id)}`),
    cancelAttempt: input => call('POST', '/attempts/cancel', input),
    decide: (id, decision, note) => call('POST', `/${encodeURIComponent(id)}/decide`, { decision, ...(note ? { note } : {}) }),
  };
}

export const authorizationConfig: {
  transport: AuthorizationTransport;
  /** Correo de quien está delante: si puede autoautorizarse, solo teclea su contraseña. */
  currentUserEmail: () => string | null;
  /** Cada cuánto se pregunta por la firma si el socket calla (ms). */
  pollMs: number;
} = {
  transport: createFetchTransport(),
  currentUserEmail: () => null,
  pollMs: 15_000,
};

/** Llamar una vez en `main.ts`: `configureAuthorizations({ transport: createFetchTransport({ headers }) })`. */
export function configureAuthorizations(config: Partial<typeof authorizationConfig>): void {
  Object.assign(authorizationConfig, config);
}

// ── El reto pendiente: UNO a la vez ────────────────────────────────────────

export interface AuthorizationState {
  open: boolean;
  challenge: AuthorizationChallenge | null;
}

let state: AuthorizationState = { open: false, challenge: null };
let settle: ((outcome: AuthorizationOutcome) => void) | null = null;
const listeners = new Set<(state: AuthorizationState) => void>();
const resolvedListeners = new Set<(event: AuthorizationResolvedEvent) => void>();

function emit(next: AuthorizationState) {
  state = next;
  listeners.forEach(l => l(state));
}

export const getAuthorizationState = (): AuthorizationState => state;

export function subscribeAuthorization(listener: (state: AuthorizationState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Abre el modal y espera. **Uno a la vez**: un segundo reto mientras hay uno abierto se
 * cancela en el acto. Dos modales de autorización superpuestos son imposibles de entender.
 */
export function requestAuthorization(challenge: AuthorizationChallenge): Promise<AuthorizationOutcome> {
  if (state.open) return Promise.resolve({ status: 'CANCELLED' });
  emit({ open: true, challenge });
  return new Promise(resolve => {
    settle = resolve;
  });
}

function finish(outcome: AuthorizationOutcome) {
  const resolve = settle;
  settle = null;
  emit({ open: false, challenge: null });
  resolve?.(outcome);
}

/** El modal consiguió la llave. */
export const grantAuthorization = (grant: string): void => finish({ status: 'GRANTED', grant });
/** El usuario cerró el modal o la solicitud se rechazó: el error original sube a la pantalla. */
export const cancelAuthorization = (): void => finish({ status: 'CANCELLED' });

// ── Decisión a distancia (socket del proyecto) ─────────────────────────────

export interface AuthorizationResolvedEvent {
  requestId: string;
  status: 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  /** Quién decidió, para «Ana Reyes rechazó la solicitud». */
  decidedBy?: string;
}

/**
 * Entrega aquí el evento `authorization:resolved` de tu socket / SSE. El modal que espera
 * esa solicitud recoge la llave al instante (el sondeo es solo el respaldo).
 *   socket.on('authorization:resolved', notifyAuthorizationResolved)
 */
export function notifyAuthorizationResolved(event: AuthorizationResolvedEvent): void {
  resolvedListeners.forEach(l => l(event));
}

export function onAuthorizationResolved(listener: (event: AuthorizationResolvedEvent) => void): () => void {
  resolvedListeners.add(listener);
  return () => resolvedListeners.delete(listener);
}

// ── Interceptor ────────────────────────────────────────────────────────────

/** Saca `{ status, code, details, message }` de un error de axios, de `fetch` o de `normalizeApiError`. */
export function readApiError(error: unknown): { status?: number; code?: string; details?: unknown; message?: string } {
  const e = error as Record<string, any> | null;
  if (!e || typeof e !== 'object') return {};
  const response = e.response ?? e;
  const data = response?.data ?? e.data ?? e;
  return {
    status: response?.status ?? e.status,
    code: data?.code ?? e.code,
    details: data?.details ?? e.details,
    message: data?.message ?? data?.error ?? e.message,
  };
}

export function isAuthorizationChallenge(error: unknown): boolean {
  const { status, code, details } = readApiError(error);
  return status === 403 && code === AUTHORIZATION_REQUIRED && Boolean((details as AuthorizationChallenge | undefined)?.pendingKey);
}

/**
 * Envuelve CUALQUIER petición. `send` recibe las cabeceras extra (vacías la primera vez,
 * con la llave en el reintento). Si el servidor pide aval, abre el modal, espera y
 * reintenta UNA vez; si vuelve a pedirlo con la llave puesta (el documento cambió, la llave
 * caducó), el error sube en vez de reabrir el modal para siempre.
 *
 *   const nota = await withAuthorization(headers => api.post('/notas-credito', body, { headers }))
 */
export async function withAuthorization<T>(send: (headers: Record<string, string>) => Promise<T>): Promise<T> {
  try {
    return await send({});
  } catch (error) {
    if (!isAuthorizationChallenge(error)) throw error;
    const outcome = await requestAuthorization(readApiError(error).details as AuthorizationChallenge);
    if (outcome.status !== 'GRANTED') throw error;
    return send({ [AUTHORIZATION_GRANT_HEADER]: outcome.grant });
  }
}

interface AxiosLike {
  request(config: any): Promise<any>;
  interceptors: { response: { use(onFulfilled: (r: any) => any, onRejected: (e: any) => any): number } };
}

/**
 * Instala el interceptor en una instancia de axios (o compatible). Así TODAS las pantallas
 * heredan el flujo sin escribir una línea: es la pieza que hace que 40 actos funcionen
 * sin tocar 40 pantallas.
 *
 *   installAuthorizationInterceptor(api, { onInvalid: msg => notify(msg, 'warning') })
 */
export function installAuthorizationInterceptor(instance: AxiosLike, opts: { onInvalid?: (message: string) => void } = {}): number {
  return instance.interceptors.response.use(
    r => r,
    async error => {
      const config = error?.config as (Record<string, any> & { _authorizationRetry?: boolean }) | undefined;
      if (config && !config._authorizationRetry && isAuthorizationChallenge(error)) {
        const outcome = await requestAuthorization(readApiError(error).details as AuthorizationChallenge);
        if (outcome.status === 'GRANTED') {
          config._authorizationRetry = true;
          config.headers = { ...(config.headers ?? {}), [AUTHORIZATION_GRANT_HEADER]: outcome.grant };
          return instance.request(config);
        }
      }
      // La llave existía y el servidor la rechazó (caducó, ya se usó, el importe subió):
      // se dice QUÉ pasó en vez de dejar un 403 mudo.
      const info = readApiError(error);
      if (info.status === 403 && info.code === AUTHORIZATION_INVALID) {
        opts.onInvalid?.(info.message || 'La autorización ya no es válida. Vuelve a guardar para pedirla de nuevo.');
      }
      return Promise.reject(error);
    },
  );
}

// ── Avisos en vivo para quien FIRMA ────────────────────────────────────────

export interface AuthorizationAlert {
  requestId: string;
  actionName: string;
  /** Quién espera: «Pedro Gómez». */
  requestedBy: string;
  amount?: number | null;
  currency?: string | null;
  note?: string | null;
  /** ISO: cuándo caduca la solicitud (el reloj de la tarjeta). */
  expiresAt: string;
  /** Si el aviso es de la propia solicitud de quien mira, no se enseña. */
  requestedById?: string;
}

const MAX_ALERTS = 3;
let alerts: AuthorizationAlert[] = [];
const dismissed = new Set<string>();
const alertListeners = new Set<(alerts: AuthorizationAlert[]) => void>();

function emitAlerts(next: AuthorizationAlert[]) {
  alerts = next;
  alertListeners.forEach(l => l(alerts));
}

export const getAuthorizationAlerts = (): AuthorizationAlert[] => alerts;
/** Cuántas hay en cola además de las visibles («y 2 más»). */
export const AUTHORIZATION_ALERTS_VISIBLE = MAX_ALERTS;

export function subscribeAuthorizationAlerts(listener: (alerts: AuthorizationAlert[]) => void): () => void {
  alertListeners.add(listener);
  return () => alertListeners.delete(listener);
}

/**
 * Entrega aquí `authorization:requested` del socket. El servidor ya filtró: solo llega a
 * quien puede avalar ESTE acto por ESTE importe. Apartar una tarjeta se recuerda en la
 * sesión, para que una reconexión del socket no la devuelva.
 */
export function pushAuthorizationAlert(alert: AuthorizationAlert, opts: { currentUserId?: string } = {}): void {
  if (dismissed.has(alert.requestId)) return;
  if (opts.currentUserId && alert.requestedById === opts.currentUserId) return;
  if (new Date(alert.expiresAt).getTime() <= Date.now()) return;
  emitAlerts([...alerts.filter(a => a.requestId !== alert.requestId), alert]);
}

/** `authorization:closed`: otro firmó o el solicitante se rindió. La tarjeta se va sola. */
export function closeAuthorizationAlert(requestId: string): void {
  emitAlerts(alerts.filter(a => a.requestId !== requestId));
}

export function dismissAuthorizationAlert(requestId: string): void {
  dismissed.add(requestId);
  closeAuthorizationAlert(requestId);
}

/** Quita las caducadas (lo llama la tarjeta en su reloj). */
export function pruneAuthorizationAlerts(now = Date.now()): void {
  const live = alerts.filter(a => new Date(a.expiresAt).getTime() > now);
  if (live.length !== alerts.length) emitAlerts(live);
}

/** «4:12» hasta que caduca; `null` si ya caducó. */
export function timeLeftLabel(expiresAt: string, now = Date.now()): string | null {
  const ms = new Date(expiresAt).getTime() - now;
  if (!(ms > 0)) return null;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
