const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'data-test-'));
process.env.DATA_DIR = tmpDir;

const { readData, writeData, VALID_TYPES } = require('./data');

after(() => fs.rmSync(tmpDir, { recursive: true }));

test('readData wirft bei ungültigem Typ', () => {
  assert.throws(() => readData('xyz'), /Ungültiger/);
});

test('writeData wirft bei ungültigem Typ', () => {
  assert.throws(() => writeData('xyz', []), /Ungültiger/);
});

test('firma: Default null', () => {
  assert.equal(readData('firma'), null);
});

test('kunden: Default []', () => {
  assert.deepEqual(readData('kunden'), []);
});

test('angebote: Default []', () => {
  assert.deepEqual(readData('angebote'), []);
});

test('katalog: Default []', () => {
  assert.deepEqual(readData('katalog'), []);
});

test('writeData und readData runden-trip für firma', () => {
  writeData('firma', { name: 'Test GmbH' });
  assert.deepEqual(readData('firma'), { name: 'Test GmbH' });
});

test('writeData und readData runden-trip für kunden', () => {
  writeData('kunden', [{ id: '1', name: 'Kunde A' }]);
  assert.deepEqual(readData('kunden'), [{ id: '1', name: 'Kunde A' }]);
});

test('VALID_TYPES enthält alle 4 Typen', () => {
  assert.ok(VALID_TYPES.has('firma'));
  assert.ok(VALID_TYPES.has('kunden'));
  assert.ok(VALID_TYPES.has('angebote'));
  assert.ok(VALID_TYPES.has('katalog'));
  assert.equal(VALID_TYPES.size, 4);
});
