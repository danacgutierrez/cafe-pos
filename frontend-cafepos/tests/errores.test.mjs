import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mensajeDeError,
  erroresDelServicio
} from '../src/compartido/api/errores.ts';

function errorApi(status, error, message, url = '/ordenes') {
  return {
    response: {
      status,
      data: { error, message }
    },
    config: { url }
  };
}

test('409: inventario insuficiente', () => {
  const e = errorApi(409, 'InsufficientStockError',
    "No hay existencia suficiente de 'Leche' (RN-27).");

  assert.match(mensajeDeError(e, 'Error'),
    /No hay suficientes ingredientes/);
});

test('409: producto inactivo', () => {
  const e = errorApi(409, 'InactiveProductError', '');

  assert.match(mensajeDeError(e, 'Error'),
    /ya no está disponible/);
});

test('409: opcion desactivada', () => {
  const e = errorApi(409, 'DisabledOptionError', '');

  assert.match(mensajeDeError(e, 'Error'),
    /Elige otra opción/);
});

test('409: puntos insuficientes', () => {
  const e = errorApi(409, 'InsufficientPointsError', '');

  assert.match(mensajeDeError(e, 'Error'),
    /No tienes suficientes puntos/);
});

test('409: correo duplicado', () => {
  const e = errorApi(409, 'Conflict',
    'Ese correo ya esta registrado');

  assert.equal(mensajeDeError(e, 'Error'),
    'Este correo ya está registrado.');
});

test('409: telefono duplicado', () => {
  const e = errorApi(409, 'DuplicatePhoneError', '');

  assert.equal(mensajeDeError(e, 'Error'),
    'Este teléfono ya está registrado.');
});

test('409: conflicto desconocido', () => {
  const e = errorApi(409, 'OtroError', 'Detalle interno');

  assert.match(mensajeDeError(e, 'Error'),
    /debido a un conflicto/);

  assert.doesNotMatch(mensajeDeError(e, 'Error'),
    /Detalle interno/);
});

test('401: sesion expirada', () => {
  const e = errorApi(401, 'Unauthorized', '');

  assert.equal(mensajeDeError(e, 'Error'),
    'Tu sesión terminó. Vuelve a entrar.');
});

test('401: credenciales incorrectas', () => {
  const e = errorApi(401, 'Unauthorized',
    'Credenciales invalidas', '/auth/login');

  assert.equal(mensajeDeError(e, 'Error'),
    'Correo o contraseña incorrectos.');
});

test('400: validacion de correo', () => {
  const e = errorApi(400, 'Bad Request',
    'correo must be an email');

  assert.equal(mensajeDeError(e, 'Error'),
    'Escribe un correo electrónico válido.');

  assert.equal(erroresDelServicio(e, ['correo']).correo,
    'Escribe un correo electrónico válido.');
});

test('Error de conexion sin respuesta HTTP', () => {
  assert.equal(
    mensajeDeError(new Error('Network Error'), 'Sin conexión.'),
    'Sin conexión.'
  );
});