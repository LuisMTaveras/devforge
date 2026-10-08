import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCalendar,
  dayKeyOf,
  formatDayKey,
  isSingleDay,
  makeRange,
  normalizeRange,
  resolveRange,
  shiftDayKey,
  stepRangeDay,
  todayKey,
} from '../src/core/dates/date-range.ts';
import { pageState, pageSummary, totalPages } from '../src/core/pagination/pagination.ts';

test('dates: day key in business time zone, not UTC', () => {
  // 2026-10-06 01:00 UTC is still Oct 5 at 21:00 in Santo Domingo (UTC-4).
  assert.equal(dayKeyOf(new Date('2026-10-06T01:00:00Z')), '2026-10-05');
  assert.equal(dayKeyOf(new Date('2026-10-06T01:00:00Z'), 'UTC'), '2026-10-06');
});

test('dates: shift and format', () => {
  assert.equal(shiftDayKey('2026-03-01', -1), '2026-02-28');
  assert.equal(shiftDayKey('2026-12-31', 1), '2027-01-01');
  assert.equal(formatDayKey('2026-10-05'), '05/10/2026');
  assert.equal(formatDayKey(''), '—');
});

test('dates: calendar grid', () => {
  const oct = buildCalendar(2026, 9); // Oct 2026 starts on Thursday
  assert.equal(oct.length, 35);
  assert.equal(oct[0].dateKey, '2026-09-27');
  assert.equal(oct.filter(c => c.isCurrentMonth).length, 31);
  const limited = buildCalendar(2026, 9, { min: '2026-10-10' });
  assert.equal(limited.find(c => c.dateKey === '2026-10-09')?.isDisabled, true);
  assert.equal(limited.find(c => c.dateKey === '2026-10-10')?.isDisabled, false);
});

test('dates: presets and ranges', () => {
  const today = todayKey();
  assert.deepEqual(makeRange('today'), { preset: 'today', from: today, to: today });
  assert.equal(makeRange('month').from, `${today.slice(0, 7)}-01`);
  assert.deepEqual(resolveRange(makeRange('all')), {});
  assert.equal(isSingleDay(makeRange('yesterday')), true);
  assert.equal(stepRangeDay(makeRange('today'), -1).preset, 'yesterday');
  assert.deepEqual(normalizeRange({ preset: 'custom', from: '2026-10-09', to: '2026-10-01' }), {
    preset: 'custom', from: '2026-10-01', to: '2026-10-09',
  });
});

test('pagination: derived state and summary', () => {
  assert.equal(totalPages(0, 10), 1);
  assert.equal(totalPages(57, 10), 6);
  assert.deepEqual(pageState({ page: 2, pageSize: 10, total: 57 }), {
    page: 2, pages: 6, hasPrev: true, hasNext: true, from: 11, to: 20,
  });
  assert.equal(pageState({ page: 6, pageSize: 10, total: 57 }).to, 57);
  assert.equal(pageState({ page: 1, pageSize: 10, total: 57, hasMore: false }).hasNext, false);
  assert.equal(
    pageSummary({ page: 2, pageSize: 10, total: 57 }, { singular: 'factura', plural: 'facturas' }),
    'Mostrando 11–20 de 57 facturas',
  );
  assert.equal(pageSummary({ page: 1, pageSize: 10, total: 0 }, { plural: 'facturas' }), 'Sin facturas');
});
