/**
 * Tests unitarios de la exportación de recetas — Fase 6 (Sprint 8).
 * Ejecutar con: npm test  (node --test app/src)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escaparHtml } from './exportarReceta.js';

test('escaparHtml neutraliza caracteres peligrosos', () => {
  assert.equal(
    escaparHtml('<b>hola</b> & "mundo"'),
    '&lt;b&gt;hola&lt;/b&gt; &amp; &quot;mundo&quot;',
  );
  assert.equal(escaparHtml("es 'delicioso'"), 'es &#39;delicioso&#39;');
});

test('escaparHtml tolera valores nulos y no string', () => {
  assert.equal(escaparHtml(null), '');
  assert.equal(escaparHtml(undefined), '');
  assert.equal(escaparHtml(42), '42');
});
