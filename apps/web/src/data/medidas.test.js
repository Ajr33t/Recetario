/**
 * Tests unitarios del módulo de medidas — Fase 6 (pruebas unitarias Sprint 8).
 * Ejecutar con: npm test  (node --test app/src)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertir, formatear, filasEquivalencias, VOLUMEN, PESO } from './medidas.js';

test('volumen: 2 tazas = 473,176 ml', () => {
  const r = convertir(2, 'taza', 'ml');
  assert.ok(Math.abs(r - 473.176) < 0.001, `obtuvo ${r}`);
});

test('volumen: 1 litro = 1000 ml y 1 cucharada = 14,7868 ml', () => {
  assert.equal(convertir(1, 'l', 'ml'), 1000);
  assert.ok(Math.abs(convertir(1, 'cucharada', 'ml') - 14.7868) < 1e-6);
});

test('peso: 1 libra = 453,592 g y 2,5 kg = 2500 g', () => {
  assert.equal(convertir(1, 'libra', 'g'), 453.592);
  assert.equal(convertir(2.5, 'kg', 'g'), 2500);
});

test('temperatura: 0 °C = 32 °F y 100 °C = 212 °F', () => {
  assert.equal(convertir(0, 'c', 'f'), 32);
  assert.equal(convertir(100, 'c', 'f'), 212);
  assert.equal(convertir(68, 'f', 'c'), 20);
});

test('convertir rechaza grupos distintos y valores inválidos', () => {
  assert.equal(convertir(1, 'taza', 'g'), null); // volumen ≠ peso
  assert.equal(convertir(Number.NaN, 'taza', 'ml'), null);
  assert.equal(convertir(1, 'inexistente', 'ml'), null);
});

test('formatear usa español y hasta 4 decimales', () => {
  assert.equal(formatear(473.176), '473,176');
  assert.equal(formatear(1.5), '1,5');
  assert.equal(formatear(null), '—');
});

test('filasEquivalencias usa la unidad base del grupo como referencia', () => {
  const filas = filasEquivalencias(VOLUMEN);
  assert.equal(filas.length, VOLUMEN.length);
  assert.equal(filas[0].valor, '1'); // 1 ml = 1 ml
  const taza = filas.find((f) => f.es === 'Taza');
  assert.equal(taza.valor, '236,588');
  const peso = filasEquivalencias(PESO);
  assert.equal(peso[0].valor, '1'); // base = gramo
});
