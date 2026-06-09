const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'angebote-test-'));
process.env.DATA_DIR = tmpDir;

const store = require('./angeboteStore');

after(() => fs.rmSync(tmpDir, { recursive: true }));

const sampleData = {
  angebotNr: 'A-2026-001',
  datum: '10.6.2026',
  gueltigBis: '24.6.2026',
  betreff: 'Testangebot',
  mwstSatz: 19,
  positionen: [{ menge: 2, einzelpreis: 100, bezeichnung: 'Pos 1', einheit: 'Stk.', aufschlag: 0 }],
  kunde: { id: null, firma: 'Test GmbH', name: '', strasse: '', plz: '', ort: '', email: '', telefon: '' },
  firma: { name: 'Meine Firma', logo: 'data:image/png;base64,AAAA' },
};

test('readIndex: leer wenn keine Dateien vorhanden', () => {
  assert.deepEqual(store.readIndex(), []);
});

test('createOffer: Angebot wird angelegt und in Index eingetragen', () => {
  const { entry, index } = store.createOffer(sampleData);
  assert.ok(entry.id);
  assert.equal(entry.angebotNr, 'A-2026-001');
  assert.equal(entry.kundeDisplay, 'Test GmbH');
  assert.equal(entry.gueltigBis, '24.6.2026');
  assert.equal(index.length, 1);
  assert.equal(index[0].id, entry.id);
});

test('createOffer: Logo wird nicht im Snapshot gespeichert', () => {
  const { entry } = store.createOffer(sampleData);
  const full = store.readOffer(entry.id);
  assert.equal(full.snapshot.firma.logo, undefined);
});

test('createOffer: Netto/Brutto korrekt berechnet', () => {
  const { entry } = store.createOffer(sampleData);
  assert.equal(entry.netto, 200);
  assert.ok(Math.abs(entry.brutto - 238) < 0.01);
});

test('readOffer: gibt null für unbekannte ID', () => {
  assert.equal(store.readOffer('nicht-vorhanden'), null);
});

test('updateOffer: Snapshot und Metadaten werden aktualisiert', () => {
  const { entry } = store.createOffer(sampleData);
  const updated = { ...sampleData, betreff: 'Geändertes Angebot' };
  const index = store.updateOffer(entry.id, updated, 'gesendet');
  const full = store.readOffer(entry.id);
  assert.equal(full.betreff, 'Geändertes Angebot');
  assert.equal(full.status, 'gesendet');
  assert.ok(full.updatedAt);
  assert.equal(index.find(e => e.id === entry.id).betreff, 'Geändertes Angebot');
});

test('updateOffer: Logo bleibt nach Update rausgestripped', () => {
  const { entry } = store.createOffer(sampleData);
  store.updateOffer(entry.id, { ...sampleData, firma: { ...sampleData.firma, logo: 'data:image/png;base64,BBBB' } }, 'entwurf');
  const full = store.readOffer(entry.id);
  assert.equal(full.snapshot.firma.logo, undefined);
});

test('patchOffer: Status-Patch aktualisiert nur Metadaten', () => {
  const { entry } = store.createOffer(sampleData);
  const index = store.patchOffer(entry.id, { status: 'abgelaufen' });
  const full = store.readOffer(entry.id);
  assert.equal(full.status, 'abgelaufen');
  assert.equal(index.find(e => e.id === entry.id).status, 'abgelaufen');
  assert.equal(full.snapshot.betreff, sampleData.betreff);
});

test('patchOffer: id und savedAt können nicht überschrieben werden', () => {
  const { entry } = store.createOffer(sampleData);
  const originalId = entry.id;
  const originalSavedAt = entry.savedAt;
  store.patchOffer(entry.id, { id: 'gehackt', savedAt: '1970-01-01T00:00:00.000Z', status: 'entwurf' });
  const full = store.readOffer(originalId);
  assert.equal(full.id, originalId);
  assert.equal(full.savedAt, originalSavedAt);
});

test('removeOffer: Datei und Index-Eintrag werden gelöscht', () => {
  const { entry } = store.createOffer(sampleData);
  const index = store.removeOffer(entry.id);
  assert.equal(store.readOffer(entry.id), null);
  assert.equal(index.find(e => e.id === entry.id), undefined);
});

test('migrateIfNeeded: migriert altes angebote.json', () => {
  const oldAngebote = [{
    id: 'alt-id-001',
    savedAt: '2026-01-01T00:00:00.000Z',
    angebotNr: 'A-2026-OLD',
    datum: '1.1.2026',
    betreff: 'Altes Angebot',
    kundeDisplay: 'Alter Kunde',
    netto: 500,
    brutto: 595,
    mwstSatz: 19,
    status: 'entwurf',
    snapshot: {
      angebotNr: 'A-2026-OLD',
      datum: '1.1.2026',
      gueltigBis: '15.1.2026',
      betreff: 'Altes Angebot',
      firma: { name: 'Meine Firma', logo: 'data:image/png;base64,CCCC' },
      kunde: { firma: 'Alter Kunde' },
      positionen: [],
      mwstSatz: 19,
    },
  }];
  const oldFile = path.join(tmpDir, 'angebote.json');
  const indexFile = path.join(tmpDir, 'angebote', 'index.json');
  if (fs.existsSync(indexFile)) fs.unlinkSync(indexFile);
  fs.writeFileSync(oldFile, JSON.stringify(oldAngebote));

  store.migrateIfNeeded();

  assert.ok(fs.existsSync(oldFile + '.migrated'));
  assert.ok(!fs.existsSync(oldFile));

  const full = store.readOffer('alt-id-001');
  assert.ok(full);
  assert.equal(full.angebotNr, 'A-2026-OLD');
  assert.equal(full.gueltigBis, '15.1.2026');
  assert.equal(full.snapshot.firma.logo, undefined);

  const index = store.readIndex();
  assert.ok(index.find(e => e.id === 'alt-id-001'));
});

test('migrateIfNeeded: zweiter Aufruf ist idempotent', () => {
  const indexBefore = store.readIndex();
  store.migrateIfNeeded();
  assert.deepEqual(store.readIndex(), indexBefore);
});
