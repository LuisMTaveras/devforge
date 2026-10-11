import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTHORIZATION_GRANT_HEADER,
  cancelAuthorization,
  closeAuthorizationAlert,
  dismissAuthorizationAlert,
  getAuthorizationAlerts,
  getAuthorizationState,
  grantAuthorization,
  installAuthorizationInterceptor,
  isAuthorizationChallenge,
  pushAuthorizationAlert,
  requestAuthorization,
  subscribeAuthorization,
  timeLeftLabel,
  withAuthorization,
  type AuthorizationChallenge,
} from '../src/core/authorizations/authorization.ts';
import {
  configureNotifications,
  getNotificationState,
  groupNotificationsByDay,
  loadNotifications,
  notificationKind,
  receiveNotification,
  resetNotifications,
  resolveNotificationLink,
  setNotificationFilter,
  toggleNotificationRead,
  type AppNotification,
} from '../src/core/notifications/notifications.ts';
import { normalizeApiError } from '../src/core/errors/api-error.ts';

const challenge = { pendingKey: 'pk-1', actionName: 'Emitir nota', authorizers: [] } as unknown as AuthorizationChallenge;
const challengeError = { response: { status: 403, data: { code: 'AUTHORIZATION_REQUIRED', message: 'Necesita autorización', details: challenge } } };

/** Resuelve el próximo reto que se abra con `fn` (lo que haría el modal). */
function answerNextChallenge(fn: () => void) {
  const stop = subscribeAuthorization(s => {
    if (s.open) {
      stop();
      queueMicrotask(fn);
    }
  });
}

test('authorizations: a challenge is recognized only with code + pendingKey', () => {
  assert.equal(isAuthorizationChallenge(challengeError), true);
  assert.equal(isAuthorizationChallenge({ response: { status: 403, data: { message: 'Necesita autorización' } } }), false);
  assert.equal(isAuthorizationChallenge({ response: { status: 400, data: { code: 'AUTHORIZATION_REQUIRED', details: challenge } } }), false);
});

test('authorizations: normalizeApiError keeps code and details (never flattened)', () => {
  const n = normalizeApiError(challengeError);
  assert.equal(n.code, 'AUTHORIZATION_REQUIRED');
  assert.deepEqual(n.details, challenge);
  assert.equal(normalizeApiError({ response: { status: 400, data: { message: 'x', details: { leak: 1 } } } }).details, undefined);
});

test('authorizations: withAuthorization retries ONCE with the grant header', async () => {
  const calls: Record<string, string>[] = [];
  answerNextChallenge(() => grantAuthorization('g-1'));
  const result = await withAuthorization(async headers => {
    calls.push(headers);
    if (headers[AUTHORIZATION_GRANT_HEADER] !== 'g-1') throw challengeError;
    return 'created';
  });
  assert.equal(result, 'created');
  assert.deepEqual(calls, [{}, { [AUTHORIZATION_GRANT_HEADER]: 'g-1' }]);
  assert.equal(getAuthorizationState().open, false);
});

test('authorizations: cancelling rethrows the original error', async () => {
  answerNextChallenge(() => cancelAuthorization());
  await assert.rejects(withAuthorization(async () => Promise.reject(challengeError)), (e: unknown) => e === challengeError);
});

test('authorizations: only one challenge at a time', async () => {
  const first = requestAuthorization(challenge);
  assert.deepEqual(await requestAuthorization(challenge), { status: 'CANCELLED' });
  grantAuthorization('g-2');
  assert.deepEqual(await first, { status: 'GRANTED', grant: 'g-2' });
});

test('authorizations: axios-like interceptor retries with the grant and stops after one retry', async () => {
  let onRejected: (e: any) => any = () => undefined;
  const sent: any[] = [];
  const instance = {
    interceptors: { response: { use: (_ok: any, bad: any) => ((onRejected = bad), 1) } },
    request: async (config: any) => (sent.push(config), { data: 'ok' }),
  };
  installAuthorizationInterceptor(instance);
  answerNextChallenge(() => grantAuthorization('g-3'));
  const res = await onRejected({ ...challengeError, config: { url: '/notas', headers: {} } });
  assert.equal(res.data, 'ok');
  assert.equal(sent[0].headers[AUTHORIZATION_GRANT_HEADER], 'g-3');
  // With the retry flag already set, the 403 goes up instead of reopening the modal forever.
  await assert.rejects(onRejected({ ...challengeError, config: { url: '/notas', _authorizationRetry: true } }));
  assert.equal(getAuthorizationState().open, false);
});

test('authorizations: live alerts skip own and dismissed requests, and count down', () => {
  const expiresAt = new Date(Date.now() + 125_000).toISOString();
  pushAuthorizationAlert({ requestId: 'r1', actionName: 'Anular', requestedBy: 'Pedro', expiresAt });
  pushAuthorizationAlert({ requestId: 'r2', actionName: 'Anular', requestedBy: 'Yo', requestedById: 'me', expiresAt }, { currentUserId: 'me' });
  assert.deepEqual(getAuthorizationAlerts().map(a => a.requestId), ['r1']);
  dismissAuthorizationAlert('r1');
  pushAuthorizationAlert({ requestId: 'r1', actionName: 'Anular', requestedBy: 'Pedro', expiresAt }); // socket reconnects
  assert.equal(getAuthorizationAlerts().length, 0);
  pushAuthorizationAlert({ requestId: 'r3', actionName: 'Anular', requestedBy: 'Pedro', expiresAt });
  closeAuthorizationAlert('r3');
  assert.equal(getAuthorizationAlerts().length, 0);
  assert.equal(timeLeftLabel(new Date(1_000_000 + 252_000).toISOString(), 1_000_000), '4:12');
  assert.equal(timeLeftLabel(new Date(0).toISOString()), null);
});

const row = (id: string, createdAt: string, isRead = false, type = 'INFO'): AppNotification => ({ id, title: id, body: '', type, link: null, createdAt, isRead });

test('notifications: days are cut in the business time zone', () => {
  // 01:00 UTC Oct 11 is still Oct 10 (9 p. m.) in Santo Domingo.
  const now = new Date('2026-10-11T01:30:00Z');
  const groups = groupNotificationsByDay([row('a', '2026-10-11T01:00:00Z'), row('b', '2026-10-09T23:00:00Z'), row('c', '2026-10-01T15:00:00Z')], now);
  assert.deepEqual(groups.map(g => [g.label, g.items.map(i => i.id)]), [['Hoy', ['a']], ['Ayer', ['b']], [groups[2].label, ['c']]]);
  assert.match(groups[2].label, /1 oct/);
});

test('notifications: unknown categories are not errors; links get the portal root', () => {
  assert.equal(notificationKind('NEW_THING').label, 'NEW_THING');
  assert.equal(notificationKind('payment').label, 'Pagos');
  assert.equal(resolveNotificationLink('/facturas/1', '/admin'), '/admin/facturas/1');
  assert.equal(resolveNotificationLink('/admin/facturas/1', '/admin'), '/admin/facturas/1');
  assert.equal(resolveNotificationLink(null, '/admin'), null);
});

test('notifications: store loads, receives from socket and acks optimistically', async () => {
  resetNotifications();
  let rows = [row('n1', new Date().toISOString(), false, 'PAYMENT'), row('n2', new Date().toISOString(), true)];
  configureNotifications({
    transport: {
      list: async ({ status }) => ({ items: rows.filter(r => status === 'all' || !r.isRead), hasMore: false }),
      summary: async () => ({ unread: 1, total: 2, types: [] }),
      markRead: async id => void (rows = rows.map(r => (r.id === id ? { ...r, isRead: true } : r))),
      markUnread: async () => {},
      markAllRead: async () => {},
      remove: async () => {},
      clearRead: async () => {},
    },
  });
  assert.equal(getNotificationState().settled, false); // before the first answer nothing is claimed
  await loadNotifications();
  assert.equal(getNotificationState().items.length, 2);
  receiveNotification({ id: 'n3', title: 'Nuevo', message: 'por socket', type: 'task', createdAt: new Date().toISOString() });
  assert.equal(getNotificationState().items[0].id, 'n3');
  assert.equal(getNotificationState().items[0].body, 'por socket');
  assert.equal(getNotificationState().summary.unread, 1);
  await setNotificationFilter({ status: 'unread' });
  await toggleNotificationRead('n1');
  assert.equal(getNotificationState().items.some(i => i.id === 'n1'), false); // under «Sin leer» it leaves
  resetNotifications();
});
