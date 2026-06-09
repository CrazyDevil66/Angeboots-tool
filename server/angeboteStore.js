// server/angeboteStore.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const ANGEBOTE_DIR = path.join(DATA_DIR, 'angebote');
const INDEX_FILE = path.join(ANGEBOTE_DIR, 'index.json');

function offerFile(id) {
  return path.join(ANGEBOTE_DIR, `${id}.json`);
}

function ensureDir() {
  fs.mkdirSync(ANGEBOTE_DIR, { recursive: true });
}

function readIndex() {
  try {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

function writeIndex(index) {
  ensureDir();
  const tmp = INDEX_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(index, null, 2));
  fs.renameSync(tmp, INDEX_FILE);
}

function readOffer(id) {
  try {
    return JSON.parse(fs.readFileSync(offerFile(id), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

function writeOffer(id, data) {
  ensureDir();
  const tmp = offerFile(id) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, offerFile(id));
}

function deleteOfferFile(id) {
  try {
    fs.unlinkSync(offerFile(id));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

function stripLogo(snapshot) {
  if (!snapshot?.firma) return snapshot;
  const { logo, ...rest } = snapshot.firma;
  return { ...snapshot, firma: rest };
}

function buildMetadata(id, data, status, extra = {}) {
  const netto = (data.positionen || []).reduce(
    (s, p) => s + Number(p.menge) * Number(p.einzelpreis), 0
  );
  const brutto = netto * (1 + Number(data.mwstSatz) / 100);
  return {
    id,
    savedAt: extra.savedAt || new Date().toISOString(),
    updatedAt: extra.updatedAt || null,
    angebotNr: data.angebotNr,
    datum: data.datum,
    gueltigBis: data.gueltigBis || '',
    betreff: data.betreff,
    kundeDisplay: data.kunde?.firma || data.kunde?.name || '—',
    kundeId: data.kunde?.id || null,
    netto,
    brutto,
    mwstSatz: data.mwstSatz,
    status: status || 'entwurf',
    rechnungsNr:         extra.rechnungsNr         ?? null,
    rechnungsDatum:      extra.rechnungsDatum       ?? null,
    rechnungsBetreff:    extra.rechnungsBetreff     ?? null,
    rechnungsEinleitung: extra.rechnungsEinleitung  ?? null,
    rechnungsHinweise:   extra.rechnungsHinweise    ?? null,
    mahnStufe:           extra.mahnStufe            ?? 0,
    mahnGebuehren:       extra.mahnGebuehren        ?? [],
    mahnungNr:           extra.mahnungNr            ?? null,
    mahndatum:           extra.mahndatum            ?? null,
    bezahltAm:           extra.bezahltAm            ?? null,
  };
}

function createOffer(data) {
  const id = crypto.randomUUID();
  const snapshot = stripLogo(data);
  const meta = buildMetadata(id, data, 'entwurf');
  writeOffer(id, { ...meta, snapshot });
  const index = [meta, ...readIndex()];
  writeIndex(index);
  return { entry: meta, index };
}

function updateOffer(id, data, status) {
  const existing = readOffer(id);
  if (!existing) throw new Error(`Angebot ${id} nicht gefunden`);
  const snapshot = stripLogo(data);
  const meta = buildMetadata(id, data, status, {
    savedAt:             existing.savedAt,
    updatedAt:           new Date().toISOString(),
    rechnungsNr:         existing.rechnungsNr,
    rechnungsDatum:      existing.rechnungsDatum,
    rechnungsBetreff:    existing.rechnungsBetreff,
    rechnungsEinleitung: existing.rechnungsEinleitung,
    rechnungsHinweise:   existing.rechnungsHinweise,
    mahnStufe:           existing.mahnStufe,
    mahnGebuehren:       existing.mahnGebuehren,
    mahnungNr:           existing.mahnungNr,
    mahndatum:           existing.mahndatum,
    bezahltAm:           existing.bezahltAm,
  });
  writeOffer(id, { ...meta, snapshot });
  const index = readIndex().map(e => e.id === id ? meta : e);
  writeIndex(index);
  return index;
}

function patchOffer(id, patch) {
  const existing = readOffer(id);
  if (!existing) throw new Error(`Angebot ${id} nicht gefunden`);
  const { snapshot, ...meta } = existing;
  const { id: _id, savedAt: _savedAt, snapshot: _snap, ...safePatch } = patch;
  const newMeta = { ...meta, ...safePatch, updatedAt: new Date().toISOString() };
  writeOffer(id, { ...newMeta, snapshot });
  const index = readIndex().map(e => e.id === id ? newMeta : e);
  writeIndex(index);
  return index;
}

function removeOffer(id) {
  const index = readIndex().filter(e => e.id !== id);
  writeIndex(index);
  deleteOfferFile(id);
  return index;
}

function migrateIfNeeded() {
  const oldFile = path.join(DATA_DIR, 'angebote.json');
  if (!fs.existsSync(oldFile)) return;
  if (fs.existsSync(INDEX_FILE)) return;

  let oldAngebote = [];
  try {
    oldAngebote = JSON.parse(fs.readFileSync(oldFile, 'utf8'));
    if (!Array.isArray(oldAngebote)) return;
  } catch {
    return;
  }

  ensureDir();
  writeIndex([]); // sentinel — prevents re-run if process crashes mid-migration
  const index = [];
  for (const old of oldAngebote) {
    if (!old.id) continue;
    const snapshot = stripLogo(old.snapshot || {});
    const meta = {
      id:                  old.id,
      savedAt:             old.savedAt             || new Date().toISOString(),
      updatedAt:           old.updatedAt            || null,
      angebotNr:           old.angebotNr            || '',
      datum:               old.datum               || '',
      gueltigBis:          old.snapshot?.gueltigBis || '',
      betreff:             old.betreff             || '',
      kundeDisplay:        old.kundeDisplay         || '—',
      kundeId:             old.kundeId             || null,
      netto:               old.netto               ?? 0,
      brutto:              old.brutto              ?? 0,
      mwstSatz:            old.mwstSatz            ?? 19,
      status:              old.status              || 'entwurf',
      rechnungsNr:         old.rechnungsNr         || null,
      rechnungsDatum:      old.rechnungsDatum      || null,
      rechnungsBetreff:    old.rechnungsBetreff    || null,
      rechnungsEinleitung: old.rechnungsEinleitung || null,
      rechnungsHinweise:   old.rechnungsHinweise   || null,
      mahnStufe:           old.mahnStufe           ?? 0,
      mahnGebuehren:       old.mahnGebuehren       || [],
      mahnungNr:           old.mahnungNr           || null,
      mahndatum:           old.mahndatum           || null,
      bezahltAm:           old.bezahltAm           || null,
    };
    writeOffer(old.id, { ...meta, snapshot });
    index.push(meta);
  }
  writeIndex(index);
  fs.renameSync(oldFile, oldFile + '.migrated');
}

module.exports = {
  readIndex,
  readOffer,
  createOffer,
  updateOffer,
  patchOffer,
  removeOffer,
  migrateIfNeeded,
};
