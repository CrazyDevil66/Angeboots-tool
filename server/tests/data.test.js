const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'data-test-'));
process.env.DATA_DIR = tmp;

delete require.cache[require.resolve('../data')];
const { readData, writeData, VALID_TYPES } = require('../data');

// Invalid type throws
assert.throws(() => readData('xyz'), /Ungültiger/);
assert.throws(() => writeData('xyz', []), /Ungültiger/);

// firma default: null, others default: []
assert.strictEqual(readData('firma'), null);
assert.deepStrictEqual(readData('kunden'), []);
assert.deepStrictEqual(readData('angebote'), []);
assert.deepStrictEqual(readData('katalog'), []);

// write and read back
writeData('firma', { name: 'Test GmbH' });
assert.deepStrictEqual(readData('firma'), { name: 'Test GmbH' });

writeData('kunden', [{ id: '1', name: 'Kunde A' }]);
assert.deepStrictEqual(readData('kunden'), [{ id: '1', name: 'Kunde A' }]);

// VALID_TYPES has all 4
assert.ok(VALID_TYPES.has('firma'));
assert.ok(VALID_TYPES.has('kunden'));
assert.ok(VALID_TYPES.has('angebote'));
assert.ok(VALID_TYPES.has('katalog'));
assert.strictEqual(VALID_TYPES.size, 4);

fs.rmSync(tmp, { recursive: true });
console.log('✓ data.js: alle Tests bestanden');
