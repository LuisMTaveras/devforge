import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatPhoneNumber,
  setFormatCountry,
} from '../src/core/formatters/formatters.ts';

test('phone: República Dominicana national and international', () => {
  assert.equal(formatPhoneNumber('8095781234', 'DO'), '(809) 578-1234');
  assert.equal(formatPhoneNumber('829-578-1234', 'DO'), '(829) 578-1234');
  assert.equal(formatPhoneNumber('+1 849 578 1234', 'DO'), '(849) 578-1234');
  assert.equal(formatPhoneNumber('8095781234', 'DO', 'international'), '+1 (809) 578-1234');
});

test('phone: other countries', () => {
  assert.equal(formatPhoneNumber('3001234567', 'CO'), '(300) 123-4567');
  assert.equal(formatPhoneNumber('573001234567', 'CO', 'international'), '+57 (300) 123-4567');
  assert.equal(formatPhoneNumber('5512345678', 'MX', 'international'), '+52 (55) 1234-5678');
  assert.equal(formatPhoneNumber('612345678', 'ES', 'international'), '+34 612 34 56 78');
  assert.equal(formatPhoneNumber('912345678', 'CL'), '9 1234 5678');
  assert.equal(formatPhoneNumber('912345678', 'PE'), '912 345 678');
});

test('phone: null fallback', () => {
  assert.equal(formatPhoneNumber(null, 'DO'), '—');
  assert.equal(formatPhoneNumber('', 'DO'), '—');
});

test('numbers use the country separators', () => {
  assert.equal(formatNumber(1234567.891, { locale: 'es-DO' }), '1,234,567.89');
  assert.equal(formatNumber(1234567.891, { locale: 'es-CO' }), '1.234.567,89');
  assert.equal(formatPercent(0.125, { locale: 'es-DO' }), '12.5%');
  assert.equal(formatPercent(12.5, { locale: 'es-CO', isRatio: false }), '12,5%');
  assert.equal(formatNumber(undefined), '—');
  assert.equal(formatNumber('abc'), '—');
});

test('defaults to República Dominicana', () => {
  assert.equal(formatCurrency(17870000), 'RD$17,870,000.00');
  assert.equal(formatNumber(1500.5), '1,500.5');
  assert.equal(formatPhoneNumber('8095781234'), '(809) 578-1234');
});

test('setFormatCountry switches the whole project', () => {
  setFormatCountry('CO');
  // es-CO separates the symbol with a non-breaking space (U+00A0)
  assert.equal(formatCurrency(17870000), '$\u00a017.870.000,00');
  assert.equal(formatNumber(1500.5), '1.500,5');
  assert.equal(formatPhoneNumber('3001234567'), '(300) 123-4567');
  setFormatCountry('DO');
  assert.equal(formatCurrency(17870000), 'RD$17,870,000.00');
  assert.equal(formatNumber(1500.5), '1,500.5');
  assert.equal(formatPhoneNumber('8095781234'), '(809) 578-1234');
});
