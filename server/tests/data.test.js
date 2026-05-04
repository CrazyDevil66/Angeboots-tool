const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Setup: create temporary directory for testing
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'data-test-'));
process.env.DATA_DIR = tmp;

// Clear require cache and load module with test DATA_DIR
delete require.cache[require.resolve('../data')];
const { readData, writeData, VALID_TYPES } = require('../data');

test('invalid type throws on readData', () => {
  assert.throws(() => readData('xyz'), /Ungültiger/);
});

test('invalid type throws on writeData', () => {
  assert.throws(() => writeData('xyz', []), /Ungültiger/);
});

test('firma default: null', () => {
  assert.strictEqual(readData('firma'), null);
});

test('kunden default: []', () => {
  assert.deepStrictEqual(readData('kunden'), []);
});

test('angebote default: []', () => {
  assert.deepStrictEqual(readData('angebote'), []);
});

test('katalog default: []', () => {
  assert.deepStrictEqual(readData('katalog'), []);
});

test('write and read back firma', () => {
  writeData('firma', { name: 'Test GmbH' });
  assert.deepStrictEqual(readData('firma'), { name: 'Test GmbH' });
});

test('write and read back kunden', () => {
  writeData('kunden', [{ id: '1', name: 'Kunde A' }]);
  assert.deepStrictEqual(readData('kunden'), [{ id: '1', name: 'Kunde A' }]);
});

test('VALID_TYPES has all 4 types', () => {
  assert.ok(VALID_TYPES.has('firma'));
  assert.ok(VALID_TYPES.has('kunden'));
  assert.ok(VALID_TYPES.has('angebote'));
  assert.ok(VALID_TYPES.has('katalog'));
  assert.strictEqual(VALID_TYPES.size, 4);
});

// Cleanup: remove temporary directory
test.after(() => {
  fs.rmSync(tmp, { recursive: true });
});
