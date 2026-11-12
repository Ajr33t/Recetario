/**
 * Tests unitarios del sistema de notificaciones — Fase 6 (Sprint 8 IEEE).
 * Ejecutar con: npm test  (node --test app/src)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_HISTORIAL,
  notificar,
  quitarToast,
  vaciarToasts,
  marcarLeidos,
  vaciarHistorial,
  obtenerToasts,
  obtenerHistorial,
  contarNoLeidas,
  suscribir,
  exito,
  fracaso,
  informar,
  tiempoRelativo,
} from './toast.js';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

test('notificar añade un toast con id incremental y tipo', () => {
  vaciarToasts();
  vaciarHistorial();
  const id = notificar('Primera', { duracion: 0 });
  assert.equal(obtenerToasts().length, 1);
  assert.equal(obtenerToasts()[0].id, id);
  assert.equal(obtenerToasts()[0].tipo, 'info');
  assert.equal(obtenerToasts()[0].mensaje, 'Primera');
});

test('exito / fracaso / informar asignan el tipo correcto', () => {
  vaciarToasts();
  vaciarHistorial();
  exito('Guardada', { duracion: 0 });
  fracaso('Falló', { duracion: 0 });
  informar('Quitada', { duracion: 0 });
  const tipos = obtenerToasts().map((t) => t.tipo);
  assert.deepEqual(tipos, ['success', 'error', 'info']);
});

test('quitarToast cierra solo el indicado y es idempotente', () => {
  vaciarToasts();
  vaciarHistorial();
  const a = notificar('A', { duracion: 0 });
  notificar('B', { duracion: 0 });
  quitarToast(a);
  assert.equal(obtenerToasts().length, 1);
  assert.equal(obtenerToasts()[0].mensaje, 'B');
  quitarToast(a); // segunda llamada no rompe nada
  assert.equal(obtenerToasts().length, 1);
});

test('el toast se cierra solo al vencer su duración', async () => {
  vaciarToasts();
  vaciarHistorial();
  notificar('Efímero', { duracion: 30 });
  assert.equal(obtenerToasts().length, 1);
  await esperar(80);
  assert.equal(obtenerToasts().length, 0);
});

test('el historial guarda máximo MAX_HISTORIAL y va del más reciente al más antiguo', () => {
  vaciarToasts();
  vaciarHistorial();
  for (let i = 1; i <= MAX_HISTORIAL + 5; i++) {
    notificar(`N${i}`, { duracion: 0 });
  }
  const hist = obtenerHistorial();
  assert.equal(hist.length, MAX_HISTORIAL);
  assert.equal(hist[0].mensaje, `N${MAX_HISTORIAL + 5}`); // más reciente primero
  assert.equal(hist[hist.length - 1].mensaje, 'N6'); // se descartan las más antiguas
});

test('marcarLeidos pone todo el historial como leído', () => {
  vaciarToasts();
  vaciarHistorial();
  notificar('Uno', { duracion: 0 });
  notificar('Dos', { duracion: 0 });
  assert.equal(contarNoLeidas(), 2);
  marcarLeidos();
  assert.equal(contarNoLeidas(), 0);
  assert.equal(obtenerHistorial().length, 2); // no borra, solo marca
});

test('vaciarHistorial limpia la campana y vaciarToasts solo los visibles', () => {
  vaciarToasts();
  vaciarHistorial();
  notificar('Visible', { duracion: 0 });
  vaciarToasts();
  assert.equal(obtenerToasts().length, 0);
  assert.equal(obtenerHistorial().length, 1); // el historial se conserva
  vaciarHistorial();
  assert.equal(obtenerHistorial().length, 0);
  assert.equal(contarNoLeidas(), 0);
});

test('suscribir avisa a los oyentes y la baja deja de avisar', () => {
  vaciarToasts();
  vaciarHistorial();
  let avisos = 0;
  const baja = suscribir(() => {
    avisos++;
  });
  notificar('Con oyente', { duracion: 0 });
  assert.ok(avisos >= 1);
  const antes = avisos;
  baja();
  notificar('Sin oyente', { duracion: 0 });
  assert.equal(avisos, antes);
});

test('tiempoRelativo devuelve textos en español', () => {
  assert.equal(tiempoRelativo(0), 'ahora');
  assert.equal(tiempoRelativo(10_000), 'ahora');
  assert.equal(tiempoRelativo(45_000), 'hace 45 s');
  assert.equal(tiempoRelativo(120_000), 'hace 2 min');
  assert.equal(tiempoRelativo(3 * 3600_000), 'hace 3 h');
  assert.equal(tiempoRelativo(48 * 3600_000), 'hace 2 d');
});
