import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExcelReportPayload, toExcelCell } from '../src/core/export/excel-report.ts';

type Row = { nombre: string; saldo: number | string; moneda: string; vence: string | null };
const rows: Row[] = [
  { nombre: 'Ferretería Ozama', saldo: 1500.5, moneda: 'DOP', vence: '2026-10-05' },
  { nombre: 'Colmado Juan', saldo: '2,000', moneda: 'USD', vence: null },
];

test('excel: cells keep their type; empty values are null, never 0', () => {
  assert.equal(toExcelCell('1,234.5', 'money'), 1234.5);
  assert.equal(toExcelCell('', 'money'), null);
  assert.equal(toExcelCell(undefined, 'text'), null);
  assert.equal(toExcelCell('abc', 'number'), 'abc');
  assert.equal(toExcelCell(new Date('2026-10-05T12:00:00Z'), 'datetime'), '2026-10-05T12:00:00.000Z');
});

test('excel: money with total carries each row currency in a hidden column', () => {
  const p = buildExcelReportPayload<Row>({
    title: 'CxC',
    fileName: 'cxc',
    filters: [['Al corte', '05/10/2026'], ['Vendedor', null]],
    columns: [
      { header: 'Cliente', value: r => r.nombre },
      { header: 'Saldo', value: r => r.saldo, type: 'money', total: true, currency: r => r.moneda },
      { header: 'Vence', value: r => r.vence, type: 'date' },
    ],
    rows,
  });
  assert.deepEqual(p.filters, [['Al corte', '05/10/2026']]);
  assert.equal(p.hiddenColumns, 1);
  assert.deepEqual(p.columns[1], { header: 'Saldo', type: 'money', total: true, currencyColumn: 3 });
  assert.deepEqual(p.rows[1], ['Colmado Juan', 2000, null, 'USD']);
  assert.equal(JSON.stringify(p).includes('function'), false);
});
