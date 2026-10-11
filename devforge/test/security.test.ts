import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../src/core/security/escape-html.ts';
import { safeLinkUrl } from '../src/core/security/safe-url.ts';
import { sanitizeTenantCss } from '../src/core/security/sanitize-css.ts';
import { isChunkLoadError } from '../src/core/app-update/app-update.ts';

test('escapeHtml: markup and quotes', () => {
  assert.equal(escapeHtml('<img src=x onerror="a()">'), '&lt;img src=x onerror=&quot;a()&quot;&gt;');
  assert.equal(escapeHtml(null), '');
});

test('safeLinkUrl: only https or own uploads', () => {
  const own = { ownOrigins: ['http://localhost:3000'] };
  assert.equal(safeLinkUrl('javascript:alert(1)', own), null);
  assert.equal(safeLinkUrl('data:text/html,hi', own), null);
  assert.equal(safeLinkUrl('//evil.com/uploads/a.pdf', own), null);
  assert.equal(safeLinkUrl('/uploads/a.pdf', own), '/uploads/a.pdf');
  assert.equal(safeLinkUrl('/admin', own), null);
  assert.equal(safeLinkUrl('https://cdn.x.com/a.pdf', own), 'https://cdn.x.com/a.pdf');
  assert.equal(safeLinkUrl('http://localhost:3000/uploads/a.pdf', own), 'http://localhost:3000/uploads/a.pdf');
  assert.equal(safeLinkUrl('http://other.com/uploads/a.pdf', own), null);
});

test('sanitizeTenantCss: breakouts, imports, remote urls and escapes', () => {
  assert.equal(sanitizeTenantCss('a{color:red}</style><script>x()</script>').includes('<'), false);
  assert.equal(sanitizeTenantCss('@import url(https://x.com/a.css); b{}').includes('@import'), false);
  assert.match(sanitizeTenantCss('a{background:url(http://x.com/a.png)}'), /url\(none\)|none/);
  assert.equal(sanitizeTenantCss('a{background:url(https://x.com/a.png)}'), 'a{background:url(https://x.com/a.png)}');
  assert.equal(/expression\(/i.test(sanitizeTenantCss('a{width:\\65 xpression(alert(1))}')), false);
  assert.equal(sanitizeTenantCss('@imp@importort url(x);').includes('@import'), false);
});

test('app-update: recognizes stale chunk errors', () => {
  assert.equal(isChunkLoadError(new Error('Failed to fetch dynamically imported module: /assets/A-1.js')), true);
  assert.equal(isChunkLoadError(new Error('Network Error')), false);
});
