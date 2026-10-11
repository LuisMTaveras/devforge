/**
 * ⚡ DEVFORGE Notifications — la bandeja de la campana. Framework-agnostic; la pinta <NotificationCenter />.
 *
 * Cuatro cosas distintas, cada una con su pieza (ui-components.md §12):
 *   · lo que INTERRUMPE y pide decidir      → confirmDialog()        (core/feedback/dialog)
 *   · lo que pasó y no interrumpe            → notify()               (core/feedback/toast)
 *   · lo PERSISTENTE y accionable            → la bandeja (esto): sobrevive al refresco, se cuenta
 *                                              en el servidor y lleva a un documento.
 *   · alguien ESPERA tu firma ahora mismo    → <AuthorizationAlerts /> (core/authorizations)
 * Y NUNCA `new Notification()` a mano: el aviso de escritorio sale de aquí
 * (`showDesktopNotification`), solo con permiso pedido con un clic y solo con la pestaña oculta.
 */
import { formatConfig } from '../formatters/formatters.ts';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  /** CATEGORÍA del dominio (`ORDER_STATUS`, `INVOICE_DUE`…), no una severidad. */
  type: string;
  /** Destino dentro de la app, SIN prefijo de portal (`/facturas/123`). */
  link: string | null;
  createdAt: string;
  isRead: boolean;
}

export interface NotificationSummary {
  unread: number;
  total: number;
  types: Array<{ type: string; total: number; unread: number }>;
}

export type NotificationStatusFilter = 'all' | 'unread';
export type NotificationTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface NotificationKind {
  type: string;
  label: string;
  tone: NotificationTone;
  /** Nombre del icono de `icon-paths.ts`. */
  icon: string;
}

/** Catálogo por defecto. Cada proyecto añade las suyas con `registerNotificationKinds`. */
const KINDS = new Map<string, NotificationKind>(
  (
    [
      { type: 'INFO', label: 'Avisos', tone: 'neutral', icon: 'info' },
      { type: 'SYSTEM', label: 'Sistema', tone: 'danger', icon: 'shield' },
      { type: 'AUTHORIZATION', label: 'Autorizaciones', tone: 'warning', icon: 'lock' },
      { type: 'PAYMENT', label: 'Pagos', tone: 'success', icon: 'success' },
      { type: 'DUE', label: 'Por vencer', tone: 'warning', icon: 'clock' },
      { type: 'TASK', label: 'Tareas', tone: 'accent', icon: 'check' },
    ] satisfies NotificationKind[]
  ).map(k => [k.type, k]),
);

/** `registerNotificationKinds([{ type: 'ORDER_STATUS', label: 'Pedidos', tone: 'accent', icon: 'inbox' }])` */
export function registerNotificationKinds(kinds: NotificationKind[]): void {
  kinds.forEach(k => KINDS.set(k.type.toUpperCase(), { ...k, type: k.type.toUpperCase() }));
}

/** Una categoría desconocida NO es un error: el servidor puede estrenarla antes que el cliente. */
export function notificationKind(type: string | null | undefined): NotificationKind {
  const code = String(type ?? 'INFO').toUpperCase();
  return KINDS.get(code) ?? { type: code, label: code, tone: 'neutral', icon: 'info' };
}

export const notificationKindOrder = (): string[] => [...KINDS.keys()];

/** Normaliza lo que llega de la API y del socket (`body` o `message`) a una sola forma. */
export function toNotification(raw: Record<string, any>): AppNotification {
  return {
    id: String(raw.id),
    title: raw.title ?? 'Aviso',
    body: raw.body ?? raw.message ?? '',
    type: String(raw.type ?? 'INFO').toUpperCase(),
    link: raw.link ?? null,
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
    isRead: raw.isRead === true,
  };
}

/** Antepone la raíz del portal (`/admin`) a un enlace sin prefijo. Uno ya absoluto se respeta. */
export function resolveNotificationLink(link: string | null, rootPrefix = ''): string | null {
  if (!link) return null;
  if (/^https?:\/\//.test(link) || !rootPrefix || link.startsWith(rootPrefix + '/')) return link;
  return `${rootPrefix.replace(/\/$/, '')}${link.startsWith('/') ? '' : '/'}${link}`;
}

// ── Agrupación por día, en la zona del NEGOCIO ─────────────────────────────

const dayKey = (date: Date | string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: formatConfig.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));

/** Hoy / Ayer / «11 oct 2026», cortando el día en la zona del negocio (nunca la del navegador). */
export function groupNotificationsByDay(items: AppNotification[], now = new Date()): Array<{ key: string; label: string; items: AppNotification[] }> {
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000));
  const groups: Array<{ key: string; label: string; items: AppNotification[] }> = [];
  for (const n of items) {
    const key = dayKey(n.createdAt);
    let group = groups.find(g => g.key === key);
    if (!group) {
      const label =
        key === today
          ? 'Hoy'
          : key === yesterday
            ? 'Ayer'
            : new Intl.DateTimeFormat(formatConfig.defaultLocale, { timeZone: formatConfig.timeZone, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(n.createdAt));
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(n);
  }
  return groups;
}

// ── Transporte ─────────────────────────────────────────────────────────────

export interface NotificationTransport {
  list(params: { page: number; pageSize: number; status: NotificationStatusFilter; type?: string }): Promise<{ items: AppNotification[]; hasMore: boolean }>;
  summary(): Promise<NotificationSummary>;
  markRead(id: string): Promise<void>;
  markUnread(id: string): Promise<void>;
  markAllRead(type?: string): Promise<void>;
  remove(id: string): Promise<void>;
  /** Borra lo LEÍDO. Vaciar también lo no leído es otra acción. */
  clearRead(): Promise<void>;
}

/** Transporte por `fetch` contra `/api/notifications` (blueprint 09). */
export function createNotificationFetchTransport(opts: { baseUrl?: string; headers?: () => Record<string, string>; credentials?: RequestCredentials } = {}): NotificationTransport {
  const base = (opts.baseUrl ?? '/api/notifications').replace(/\/$/, '');
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      method,
      credentials: opts.credentials ?? 'include',
      headers: { 'Content-Type': 'application/json', ...(opts.headers?.() ?? {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || json?.error || 'No se pudieron cargar las notificaciones.');
    return json;
  }
  const unwrap = (json: any) => (json && typeof json === 'object' && 'data' in json ? json.data : json);
  return {
    async list({ page, pageSize, status, type }) {
      const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize), status, ...(type ? { type } : {}) });
      const json = await call<any>('GET', `?${q}`);
      const rows: any[] = Array.isArray(json?.items) ? json.items : Array.isArray(unwrap(json)) ? unwrap(json) : unwrap(json)?.items ?? [];
      const meta = json?.meta ?? unwrap(json)?.meta ?? {};
      return { items: rows.map(toNotification), hasMore: Boolean(meta.hasMore ?? rows.length === pageSize) };
    },
    summary: async () => unwrap(await call('GET', '/summary')),
    markRead: async id => void (await call('PATCH', `/${encodeURIComponent(id)}/read`)),
    markUnread: async id => void (await call('PATCH', `/${encodeURIComponent(id)}/unread`)),
    markAllRead: async type => void (await call('POST', '/read-all', type ? { type } : {})),
    remove: async id => void (await call('DELETE', `/${encodeURIComponent(id)}`)),
    clearRead: async () => void (await call('POST', '/clear', {})),
  };
}

export const notificationConfig: { transport: NotificationTransport; pageSize: number; rootPrefix: string } = {
  transport: createNotificationFetchTransport(),
  pageSize: 20,
  /** Raíz del portal que se antepone a los enlaces (`/admin`). */
  rootPrefix: '',
};

export function configureNotifications(config: Partial<typeof notificationConfig>): void {
  Object.assign(notificationConfig, config);
}

// ── Store ──────────────────────────────────────────────────────────────────

export interface NotificationState {
  items: AppNotification[];
  summary: NotificationSummary;
  status: NotificationStatusFilter;
  type: string | null;
  loading: boolean;
  /** Ya hubo UNA respuesta: antes de eso no se dice «no hay nada» ni «0». */
  settled: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
}

const INITIAL: NotificationState = {
  items: [],
  summary: { unread: 0, total: 0, types: [] },
  status: 'all',
  type: null,
  loading: false,
  settled: false,
  error: null,
  page: 1,
  hasMore: false,
};

let state: NotificationState = { ...INITIAL };
const listeners = new Set<(state: NotificationState) => void>();
let loadToken = 0;

function set(patch: Partial<NotificationState>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l(state));
}

export const getNotificationState = (): NotificationState => state;

export function subscribeNotifications(listener: (state: NotificationState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Contador REAL, del servidor (no contar la primera página). */
export async function refreshNotificationSummary(): Promise<void> {
  try {
    set({ summary: await notificationConfig.transport.summary() });
  } catch {
    // El contador se queda como estaba: un fallo al contar no borra lo que se sabe.
  }
}

/** Primera página (o la siguiente con `{ more: true }`). Lo que ya estaba se queda mientras carga. */
export async function loadNotifications(opts: { more?: boolean } = {}): Promise<void> {
  const token = ++loadToken;
  const page = opts.more ? state.page + 1 : 1;
  set({ loading: true, error: null });
  try {
    const { items, hasMore } = await notificationConfig.transport.list({
      page,
      pageSize: notificationConfig.pageSize,
      status: state.status,
      type: state.type ?? undefined,
    });
    if (token !== loadToken) return; // llegó tarde: otro filtro ya pidió otra cosa
    set({ items: opts.more ? [...state.items, ...items] : items, page, hasMore, loading: false, settled: true });
  } catch (err) {
    if (token !== loadToken) return;
    set({ loading: false, settled: true, error: (err as Error)?.message || 'No se pudieron cargar las notificaciones.' });
  }
}

export function setNotificationFilter(filter: { status?: NotificationStatusFilter; type?: string | null }): Promise<void> {
  set({ ...filter });
  return loadNotifications();
}

function adjustUnread(id: string, delta: number) {
  const n = state.items.find(i => i.id === id);
  const types = state.summary.types.map(t => (n && t.type === n.type ? { ...t, unread: Math.max(0, t.unread + delta) } : t));
  return { ...state.summary, unread: Math.max(0, state.summary.unread + delta), types };
}

/** Acuse reversible. Bajo «Sin leer» la fila se retira al marcarla. */
export async function toggleNotificationRead(id: string): Promise<void> {
  const n = state.items.find(i => i.id === id);
  if (!n) return;
  const read = !n.isRead;
  const previous = state;
  set({
    summary: adjustUnread(id, read ? -1 : 1),
    items: read && state.status === 'unread' ? state.items.filter(i => i.id !== id) : state.items.map(i => (i.id === id ? { ...i, isRead: read } : i)),
  });
  try {
    await (read ? notificationConfig.transport.markRead(id) : notificationConfig.transport.markUnread(id));
  } catch {
    set({ items: previous.items, summary: previous.summary });
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  if (state.items.find(i => i.id === id && !i.isRead)) await toggleNotificationRead(id);
}

export async function markAllNotificationsRead(): Promise<void> {
  await notificationConfig.transport.markAllRead(state.type ?? undefined);
  await Promise.all([loadNotifications(), refreshNotificationSummary()]);
}

export async function removeNotification(id: string): Promise<void> {
  const n = state.items.find(i => i.id === id);
  set({ items: state.items.filter(i => i.id !== id), summary: n && !n.isRead ? adjustUnread(id, -1) : state.summary });
  try {
    await notificationConfig.transport.remove(id);
  } finally {
    void refreshNotificationSummary();
  }
}

export async function clearReadNotifications(): Promise<void> {
  await notificationConfig.transport.clearRead();
  await Promise.all([loadNotifications(), refreshNotificationSummary()]);
}

/**
 * Entrega aquí el evento `notification` de tu socket. Se inserta arriba sin recargar,
 * suma al contador y, si la pestaña está oculta y hay permiso, sale al escritorio.
 *   socket.on('notification', receiveNotification)
 */
export function receiveNotification(raw: Record<string, any>): void {
  const n = toNotification(raw);
  if (state.items.some(i => i.id === n.id)) return;
  const matches = (!state.type || state.type === n.type) && (state.status === 'all' || !n.isRead);
  const types = state.summary.types.some(t => t.type === n.type)
    ? state.summary.types.map(t => (t.type === n.type ? { ...t, total: t.total + 1, unread: t.unread + (n.isRead ? 0 : 1) } : t))
    : [...state.summary.types, { type: n.type, total: 1, unread: n.isRead ? 0 : 1 }];
  set({
    items: matches ? [n, ...state.items] : state.items,
    summary: { total: state.summary.total + 1, unread: state.summary.unread + (n.isRead ? 0 : 1), types },
  });
  showDesktopNotification(n);
}

/** Al cerrar sesión: la bandeja de la siguiente persona empieza vacía. */
export function resetNotifications(): void {
  loadToken++;
  set({ ...INITIAL });
}

// ── Escritorio: la ÚNICA puerta a `Notification` del navegador ─────────────

export type DesktopPermission = 'unsupported' | 'default' | 'granted' | 'denied';

export function desktopNotificationPermission(): DesktopPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return window.Notification.permission as DesktopPermission;
}

/**
 * Pide el permiso. **Solo desde un clic** («Activar avisos de escritorio»): pedirlo al
 * cargar la página lo rechazan Firefox y Safari en silencio y Chrome acaba bloqueándolo.
 */
export async function enableDesktopNotifications(): Promise<DesktopPermission> {
  if (desktopNotificationPermission() === 'unsupported') return 'unsupported';
  return (await window.Notification.requestPermission()) as DesktopPermission;
}

/**
 * Muestra la notificación en el escritorio solo si hay permiso y la pestaña está OCULTA
 * (con la app delante ya se ve la campana). Todo lo que sale al escritorio está también en
 * la bandeja. Para avisos con la pestaña cerrada hace falta web push (blueprint 09 §5).
 */
export function showDesktopNotification(n: AppNotification, opts: { onClick?: (link: string | null) => void } = {}): boolean {
  if (desktopNotificationPermission() !== 'granted' || typeof document === 'undefined' || !document.hidden) return false;
  const desktop = new window.Notification(n.title, { body: n.body, tag: n.id });
  desktop.onclick = () => {
    window.focus();
    opts.onClick?.(resolveNotificationLink(n.link, notificationConfig.rootPrefix));
    desktop.close();
  };
  return true;
}
