import { test } from 'node:test';
import assert from 'node:assert/strict';
import { highlightSegments, rankEntries, scoreEntry } from '../src/core/search/nav-search.ts';
import { createRecordSearch } from '../src/core/search/record-search.ts';

const screens = [
  { label: 'Impresión de documentos', trail: ['Configuración'] },
  { label: 'Impuestos', trail: ['Configuración', 'Mi empresa'] },
  { label: 'Notas de Crédito', trail: ['Ventas'], keywords: ['nc'] },
];

test('nav-search: accents folded, every word must match, no scattered letters', () => {
  assert.equal(rankEntries(screens, 'impresion')[0]?.entry.label, 'Impresión de documentos');
  assert.equal(rankEntries(screens, 'impresion').length, 1);
  assert.equal(rankEntries(screens, 'nota credito')[0]?.entry.label, 'Notas de Crédito');
  assert.equal(scoreEntry(screens[2]!, 'facutra'), null);
  assert.ok(rankEntries(screens, 'inpuestos').length >= 1, 'one typo is tolerated');
});

test('nav-search: highlight segments without v-html', () => {
  const hit = scoreEntry(screens[0]!, 'impre')!;
  assert.deepEqual(highlightSegments(screens[0]!.label, hit.ranges)[0], { text: 'Impre', hit: true });
});

test('record-search: debounced, keeps stale results, drops late answers', async () => {
  const calls: string[] = [];
  const s = createRecordSearch<string>({
    debounceMs: 5,
    fetch: async (q, { signal }) => {
      calls.push(q);
      await new Promise(r => setTimeout(r, q === 'fer' ? 30 : 5));
      if (signal.aborted) throw Object.assign(new Error('x'), { name: 'AbortError' });
      return { items: [`${q}-1`], total: 1 };
    },
  });
  s.setQuery('fer');
  await new Promise(r => setTimeout(r, 10));
  s.setQuery('ferre');
  assert.equal(s.getState().loading, true);
  await new Promise(r => setTimeout(r, 60));
  assert.deepEqual(s.getState().items, ['ferre-1']);
  assert.equal(s.getState().hasMore, false);
  assert.equal(s.getState().stale, false);
  s.setQuery('ferreteria');
  assert.equal(s.getState().stale, true, 'previous results stay while the new query is pending');
  s.destroy();
});

test('record-search: an error is a message, not an empty list', async () => {
  const s = createRecordSearch<string>({ debounceMs: 0, fetch: async () => { throw new Error('500'); }, toMessage: () => 'Sin conexión' });
  s.flush();
  await new Promise(r => setTimeout(r, 5));
  assert.equal(s.getState().error, 'Sin conexión');
  assert.equal(s.getState().settled, true);
});
