const { test } = require('node:test');
const assert = require('node:assert/strict');
const auth = require('./auth');

test('neue IP ist nicht gesperrt', () => {
  assert.equal(auth.checkLockout('10.0.0.1'), false);
});

test('IP wird nach 5 Fehlversuchen gesperrt', () => {
  for (let i = 0; i < 5; i++) auth.recordFailure('10.0.0.2');
  assert.equal(auth.checkLockout('10.0.0.2'), true);
});

test('IP ist nach 4 Versuchen noch nicht gesperrt', () => {
  for (let i = 0; i < 4; i++) auth.recordFailure('10.0.0.3');
  assert.equal(auth.checkLockout('10.0.0.3'), false);
});

test('clearLockout hebt Sperre auf', () => {
  for (let i = 0; i < 5; i++) auth.recordFailure('10.0.0.4');
  auth.clearLockout('10.0.0.4');
  assert.equal(auth.checkLockout('10.0.0.4'), false);
});

test('remainingLockoutSeconds > 0 bei gesperrter IP', () => {
  for (let i = 0; i < 5; i++) auth.recordFailure('10.0.0.5');
  assert.ok(auth.remainingLockoutSeconds('10.0.0.5') > 0);
});
