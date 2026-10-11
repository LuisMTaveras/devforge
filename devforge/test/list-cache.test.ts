import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  drainDocumentChanges,
  markListShifted,
  patchRows,
  recordDocumentChange,
  resetDocumentChanges,
  takeListShifted,
} from '../src/core/list-cache/document-changes.ts';
import { createTabCache, tabCacheKey } from '../src/core/list-cache/tab-cache.ts';

test('document changes: the last snapshot wins and draining consumes it', () => {
  resetDocumentChanges();
  recordDocumentChange('factura', '1', { id: '1', estado: 'ANULADA', total: 10 });
  recordDocumentChange('factura', '1', { id: '1', estado: 'EMITIDA', total: 12, lineas: [1, 2] });
  const changes = drainDocumentChanges('factura');
  assert.equal(changes.length, 1);
  assert.equal(changes[0]?.snapshot.estado, 'EMITIDA');
  assert.deepEqual(drainDocumentChanges('factura'), []);
});

test('document changes: rows get only the keys they already had', () => {
  const rows = [{ id: '1', estado: 'BORRADOR', total: 10 }, { id: '2', estado: 'EMITIDA', total: 5 }];
  const n = patchRows(rows, [{ id: '1', snapshot: { id: '1', estado: 'EMITIDA', total: 12, lineas: [1] } }, { id: '9', snapshot: {} }]);
  assert.equal(n, 1);
  assert.deepEqual(rows[0], { id: '1', estado: 'EMITIDA', total: 12 });
  assert.equal('lineas' in rows[0]!, false);
});

test('document changes: a shifted list is reported once', () => {
  resetDocumentChanges();
  markListShifted('pedido');
  assert.equal(takeListShifted('pedido'), true);
  assert.equal(takeListShifted('pedido'), false);
});

test('tab cache: key ignores order and empty params', () => {
  assert.equal(tabCacheKey({ b: 2, a: 1, c: '', d: null }), tabCacheKey({ a: 1, b: 2 }));
});

test('tab cache: remember clears, add keeps, max evicts the oldest', () => {
  const c = createTabCache<string>({ max: 2 });
  c.add({ tab: 'a' }, 'A');
  c.add({ tab: 'b' }, 'B');
  assert.equal(c.recall({ tab: 'a' }), 'A');
  c.add({ tab: 'c' }, 'C');
  assert.equal(c.recall({ tab: 'a' }), undefined);
  assert.equal(c.size, 2);
  c.remember({ tab: 'x' }, 'X');
  assert.equal(c.size, 1);
  assert.equal(c.recall({ tab: 'b' }), undefined);
});
