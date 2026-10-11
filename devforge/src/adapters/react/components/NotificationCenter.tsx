import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  clearReadNotifications,
  desktopNotificationPermission,
  enableDesktopNotifications,
  getNotificationState,
  groupNotificationsByDay,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationConfig,
  notificationKind,
  notificationKindOrder,
  refreshNotificationSummary,
  removeNotification,
  resolveNotificationLink,
  setNotificationFilter,
  subscribeNotifications,
  toggleNotificationRead,
  type AppNotification,
  type NotificationStatusFilter,
  type NotificationTone,
} from '../../../core/notifications/notifications.js';
import { formatDate, formatRelativeTime } from '../../../core/formatters/formatters.js';
import { pushEscapeLayer } from '../../../core/overlay/escape-layer.js';
import { confirmDialog } from '../../../core/feedback/dialog.js';
import { FlickerlessSurface } from '../../../vendor/flickerless/react/index.js';
import { Icon, type IconName } from './icons';
import { cx } from './usePopover';

/**
 * ⚡ DEVFORGE NotificationCenter (React) — la campana y su bandeja (blueprint 09).
 *   <NotificationCenter onNavigate={link => navigate(link)} />
 *   socket.on('notification', receiveNotification)
 */
const TABS: { id: NotificationStatusFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'unread', label: 'Sin leer' },
];
const TONES: Record<NotificationTone, string> = {
  neutral: 'border-border bg-surface text-muted-foreground',
  accent: 'border-primary-border bg-primary-subtle text-foreground',
  success: 'border-success/20 bg-success/10 text-success',
  warning: 'border-warning/20 bg-warning/10 text-warning',
  danger: 'border-danger/20 bg-danger/10 text-danger',
};
const linkBtn = 'cursor-pointer rounded-control px-2 py-1 text-caption font-bold text-muted-foreground transition hover:bg-surface-hover hover:text-foreground disabled:opacity-50';
const iconBtn = 'grid size-7 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-surface hover:text-foreground';

export function NotificationCenter({ onNavigate }: { onNavigate: (link: string) => void }) {
  const state = useSyncExternalStore(subscribeNotifications, getNotificationState, getNotificationState);
  const [isOpen, setIsOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const [desktop, setDesktop] = useState(desktopNotificationPermission);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => void refreshNotificationSummary(), []);

  const close = (refocus: boolean) => {
    setIsOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    const position = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(400, window.innerWidth - 16);
      setStyle({ position: 'fixed', top: rect.bottom + 8, left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)), width, zIndex: 9999 });
    };
    position();
    void Promise.all([loadNotifications(), refreshNotificationSummary()]);
    requestAnimationFrame(() => panelRef.current?.focus());
    const releaseEscape = pushEscapeLayer(() => close(true));
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', position);
    return () => {
      releaseEscape();
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', position);
    };
  }, [isOpen]);

  const order = notificationKindOrder();
  const kinds = state.summary.types
    .filter(t => t.total > 0)
    .map(t => notificationKind(t.type))
    .sort((a, b) => (order.indexOf(a.type) + 1 || 999) - (order.indexOf(b.type) + 1 || 999));
  const groups = groupNotificationsByDay(state.items);
  const empty = state.type
    ? { title: `Nada en «${notificationKind(state.type).label}»`, text: 'No hay avisos de esta categoría.' }
    : state.status === 'unread'
      ? { title: 'Todo al día', text: 'No tienes avisos sin leer.' }
      : { title: 'Sin notificaciones', text: 'Aquí aparecerán los avisos que requieran tu atención.' };

  const open = async (n: AppNotification) => {
    await markNotificationRead(n.id);
    const link = resolveNotificationLink(n.link, notificationConfig.rootPrefix);
    if (link) {
      close(false);
      onNavigate(link);
    }
  };

  const clearRead = async () => {
    if (await confirmDialog('Limpiar notificaciones leídas', 'Se eliminarán las notificaciones que ya leíste. Las no leídas se conservan.', 'Limpiar')) await clearReadNotifications();
  };

  const unread = state.summary.unread;

  return (
    <div className="relative">
      <button ref={triggerRef} type="button" aria-haspopup="dialog" aria-expanded={isOpen}
        aria-label={unread ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'}
        onClick={() => (isOpen ? close(true) : setIsOpen(true))}
        className={cx('relative grid size-10 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground', isOpen && 'bg-surface-hover text-foreground')}>
        <Icon name="bell" className="size-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-danger px-1 text-caption font-black leading-none text-danger-foreground tabular-nums">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {isOpen &&
        createPortal(
          <section ref={panelRef} role="dialog" aria-label="Notificaciones" tabIndex={-1} style={style}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close(true);
              }
            }}
            className="flex max-h-[min(36rem,calc(100vh-5rem))] flex-col overflow-hidden rounded-card border border-border bg-surface-raised shadow-popover focus:outline-none">
            <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h2 className="text-body font-bold text-foreground">Notificaciones</h2>
              {unread > 0 && <button type="button" className={linkBtn} onClick={markAllNotificationsRead}>Marcar todo como leído</button>}
            </header>

            <div className="space-y-2 border-b border-border px-4 py-2.5">
              <div className="flex gap-1 rounded-control bg-surface-hover p-1" role="tablist">
                {TABS.map(tab => (
                  <button key={tab.id} type="button" role="tab" aria-selected={state.status === tab.id} onClick={() => setNotificationFilter({ status: tab.id })}
                    className={cx('flex-1 cursor-pointer rounded-control px-3 py-1.5 text-caption font-bold transition', state.status === tab.id ? 'bg-surface text-foreground shadow-sm' : 'text-dim-foreground hover:text-foreground')}>
                    {tab.label}
                    {tab.id === 'unread' && unread > 0 && ` (${unread})`}
                  </button>
                ))}
              </div>
              {kinds.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {[{ type: null as string | null, label: 'Todas' }, ...kinds].map(k => (
                    <button key={k.type ?? 'all'} type="button" onClick={() => setNotificationFilter({ type: k.type })}
                      className={cx('cursor-pointer rounded-full border px-2.5 py-0.5 text-caption font-semibold transition', state.type === k.type ? 'border-primary-border bg-primary-subtle text-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>
                      {k.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <FlickerlessSurface loading={state.loading} settled={state.settled} className="min-h-0 flex-1 overflow-y-auto">
              {state.error ? (
                <p className="flex items-center justify-between gap-2 px-4 py-6 text-small text-danger" role="alert">
                  {state.error} <button type="button" className={linkBtn} onClick={() => loadNotifications()}>Reintentar</button>
                </p>
              ) : state.settled && !state.items.length ? (
                <div className="px-6 py-10 text-center">
                  <Icon name="bell" className="mx-auto size-8 text-dim-foreground" />
                  <p className="mt-3 text-small font-bold text-foreground">{empty.title}</p>
                  <p className="mt-1 text-caption text-muted-foreground">{empty.text}</p>
                  {(state.status === 'unread' || state.type) && (
                    <button type="button" className={cx(linkBtn, 'mt-3')} onClick={() => setNotificationFilter({ status: 'all', type: null })}>Ver todas</button>
                  )}
                </div>
              ) : (
                <>
                  {groups.map(group => (
                    <div key={group.key}>
                      <p className="sticky top-0 z-10 bg-surface-raised px-4 pb-1 pt-3 text-caption font-black uppercase tracking-wider text-dim-foreground">{group.label}</p>
                      {group.items.map(n => {
                        const kind = notificationKind(n.type);
                        return (
                          <article key={n.id} className={cx('group relative flex gap-3 px-4 py-3 transition hover:bg-surface-hover', !n.isRead && 'bg-primary-subtle/50')}>
                            <span className={cx('mt-0.5 grid size-8 shrink-0 place-items-center rounded-control border', TONES[kind.tone])}>
                              <Icon name={kind.icon as IconName} className="size-4" />
                            </span>
                            <button type="button" className="min-w-0 flex-1 cursor-pointer text-left" onClick={() => open(n)}>
                              <p className={cx('text-small text-foreground', n.isRead ? 'font-medium' : 'font-bold')}>{n.title}</p>
                              {n.body && <p className="mt-0.5 line-clamp-2 text-caption text-muted-foreground">{n.body}</p>}
                              <p className="mt-1 text-caption text-dim-foreground" title={formatDate(n.createdAt, 'datetime')}>
                                {kind.label} · {formatRelativeTime(n.createdAt)}
                              </p>
                            </button>
                            <div className="flex shrink-0 flex-col items-center gap-1">
                              <button type="button" className={iconBtn} onClick={() => toggleNotificationRead(n.id)}
                                aria-label={n.isRead ? 'Marcar como no leída' : 'Marcar como leída'} title={n.isRead ? 'Marcar como no leída' : 'Marcar como leída'}>
                                {n.isRead ? <Icon name="check" className="size-4" /> : <span className="size-2 rounded-full bg-primary" />}
                              </button>
                              <button type="button" className={cx(iconBtn, 'opacity-0 group-hover:opacity-100 focus:opacity-100')} aria-label="Eliminar" title="Eliminar" onClick={() => removeNotification(n.id)}>
                                <Icon name="trash" className="size-4" />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ))}
                  {state.hasMore && (
                    <div className="p-3 text-center">
                      <button type="button" className={linkBtn} disabled={state.loading} onClick={() => loadNotifications({ more: true })}>Ver más</button>
                    </div>
                  )}
                </>
              )}
            </FlickerlessSurface>

            <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
              {desktop === 'default' ? (
                <button type="button" className={linkBtn} onClick={async () => setDesktop(await enableDesktopNotifications())}>Activar avisos de escritorio</button>
              ) : desktop === 'denied' ? (
                <span className="text-caption text-dim-foreground" title="Desbloquéalos desde el candado de la barra de direcciones">Avisos de escritorio bloqueados</span>
              ) : (
                <span />
              )}
              <button type="button" className={linkBtn} onClick={clearRead}>Limpiar leídas</button>
            </footer>
          </section>,
          document.body,
        )}
    </div>
  );
}
