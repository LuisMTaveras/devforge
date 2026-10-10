import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acceptDialog, cancelDialog, confirmDialog, getDialogState, promptDialog, setDialogInput } from '../src/core/feedback/dialog.ts';
import { dismissToast, getToasts, notify } from '../src/core/feedback/toast.ts';
import { escapeLayerCount, pushEscapeLayer } from '../src/core/overlay/escape-layer.ts';
import { menuPosition } from '../src/core/overlay/menu-position.ts';
import { formatCedula, formatPhoneInput, formatRnc, formatTaxId, onlyDigits, parseAmount, sanitizeAmountInput } from '../src/core/formatters/input-masks.ts';
import { formatDate, formatTime, setFormatCountry } from '../src/core/formatters/formatters.ts';
import { createBatchTracker } from '../src/core/batch/batch-progress.ts';

test('dialog: confirm resolves true / false', async () => {
  const yes = confirmDialog('Eliminar', 'No se puede deshacer.', 'Eliminar', { tone: 'danger' });
  assert.equal(getDialogState().open, true);
  assert.equal(getDialogState().tone, 'danger');
  acceptDialog();
  assert.equal(await yes, true);
  const no = confirmDialog('Eliminar');
  cancelDialog();
  assert.equal(await no, false);
});

test('dialog: required prompt blocks empty, new dialog cancels the previous one', async () => {
  const motivo = promptDialog('Anular', '', '', { required: true });
  acceptDialog();
  assert.equal(getDialogState().open, true);
  assert.ok(getDialogState().inputError);
  setDialogInput('Cliente duplicado');
  acceptDialog();
  assert.equal(await motivo, 'Cliente duplicado');

  const first = promptDialog('Primero');
  const second = confirmDialog('Segundo');
  assert.equal(await first, null);
  acceptDialog();
  assert.equal(await second, true);
});

test('toast: stacks at most 4 and dismisses', () => {
  getToasts().forEach(t => dismissToast(t.id));
  const ids = [1, 2, 3, 4, 5].map(n => notify(`Aviso ${n}`, 'info', 0));
  assert.deepEqual(getToasts().map(t => t.message), ['Aviso 2', 'Aviso 3', 'Aviso 4', 'Aviso 5']);
  dismissToast(ids[4]);
  assert.equal(getToasts().length, 3);
  getToasts().forEach(t => dismissToast(t.id));
});

test('escape layers: a stack, release is idempotent', () => {
  const a = pushEscapeLayer(() => {});
  const b = pushEscapeLayer(() => {});
  assert.equal(escapeLayerCount(), 2);
  b();
  b();
  assert.equal(escapeLayerCount(), 1);
  a();
  assert.equal(escapeLayerCount(), 0);
});

test('menu position: opens above near the bottom edge', () => {
  const viewport = { width: 1000, height: 800 };
  assert.equal(menuPosition({ top: 100, bottom: 130, right: 900 }, { viewport }).opensAbove, false);
  const low = menuPosition({ top: 740, bottom: 770, right: 900 }, { viewport, entries: 4 });
  assert.equal(low.opensAbove, true);
  assert.ok(low.top < 740);
});

test('input masks: cédula, RNC, tax id and phone while typing', () => {
  assert.equal(formatCedula('001'), '001');
  assert.equal(formatCedula('0011234'), '001-1234');
  assert.equal(formatCedula('00112345678999'), '001-1234567-8');
  assert.equal(formatRnc('101234567'), '1-01-23456-7');
  assert.equal(formatTaxId('101234567'), '1-01-23456-7');
  assert.equal(formatTaxId('00112345678'), '001-1234567-8');
  assert.equal(formatTaxId('AB123456'), 'AB123456');
  assert.equal(formatPhoneInput('809'), '(809');
  assert.equal(formatPhoneInput('18095781234'), '(809) 578-1234');
  assert.equal(onlyDigits('001-1234567-8'), '00112345678');
});

test('amount parsing follows the country decimal separator', () => {
  setFormatCountry('DO');
  assert.equal(parseAmount('RD$1,500.50'), 1500.5);
  assert.equal(parseAmount(''), null);
  assert.equal(sanitizeAmountInput('12a3.456'), '123.45');
  assert.equal(parseAmount('1.500,50', 'es-CO'), 1500.5);
});

test('dates are formatted in the business time zone', () => {
  setFormatCountry('DO');
  // 01:00 UTC on Oct 6 is still Oct 5 (9:00 p. m.) in Santo Domingo.
  assert.equal(formatDate('2026-10-06T01:00:00Z', 'short'), '05/10/2026');
  assert.match(formatTime('2026-10-06T01:00:00Z'), /^9:00/);
  setFormatCountry('ES');
  assert.equal(formatDate('2026-10-06T01:00:00Z', 'short'), '06/10/2026');
  setFormatCountry('DO');
});

test('batch: client-side run counts outcomes and keeps going after a failure', async () => {
  const batch = createBatchTracker();
  const seen: string[] = [];
  batch.subscribe(s => s.currentId && seen.push(s.currentId));
  const final = await batch.run({
    title: 'Enviando',
    items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
    worker: async item => {
      if (item.id === 'b') throw new Error('Sin correo');
      if (item.id === 'c') return { status: 'SKIPPED' as const, detail: 'Ya enviada' };
      return true;
    },
  });
  assert.equal(final.state, 'FINISHED');
  assert.deepEqual(final.counts, { done: 1, skipped: 1, failed: 1 });
  assert.equal(final.items[1].detail, 'Sin correo');
  assert.ok(seen.includes('b') && seen.includes('c'));
});

test('batch: server events update rows until the response settles', async () => {
  const batch = createBatchTracker();
  let key = '';
  const pending = batch.track({
    title: 'Facturando',
    items: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }],
    request: async k => {
      key = k;
      batch.apply({ key, item: { id: 'x', label: 'X', status: 'DONE' } });
      assert.equal(batch.getState().processed, 1);
      return [{ id: 'y', ok: false }];
    },
    settle: res => res.map(r => ({ id: r.id, status: r.ok ? 'DONE' : 'FAILED', detail: r.ok ? null : 'Rechazada' })),
  });
  await pending;
  const s = batch.getState();
  assert.deepEqual(s.counts, { done: 1, skipped: 0, failed: 1 });
  batch.apply({ key, item: { id: 'y', label: 'Y', status: 'DONE' } }); // late event is ignored
  assert.equal(batch.getState().counts.failed, 1);
});
