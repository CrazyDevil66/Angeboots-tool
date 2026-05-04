const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/data';
const VALID_TYPES = new Set(['firma', 'kunden', 'angebote', 'katalog']);

function dataFile(type) {
  return path.join(DATA_DIR, `${type}.json`);
}

function readData(type) {
  if (!VALID_TYPES.has(type)) throw new Error('Ungültiger Datentyp');
  try {
    return JSON.parse(fs.readFileSync(dataFile(type), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return type === 'firma' ? null : [];
    throw e;
  }
}

function writeData(type, data) {
  if (!VALID_TYPES.has(type)) throw new Error('Ungültiger Datentyp');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = dataFile(type) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, dataFile(type));
}

module.exports = { readData, writeData, VALID_TYPES };
