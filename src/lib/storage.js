// ── HTTP-Helfer ───────────────────────────────────────────────────────────────

async function apiGet(token, endpoint) {
  const res = await fetch(`/api${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${endpoint} fehlgeschlagen (${res.status})`);
  return res.json();
}

async function apiPut(token, endpoint, body) {
  const res = await fetch(`/api${endpoint}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${endpoint} fehlgeschlagen (${res.status})`);
  return res.json();
}

// ── Laden ─────────────────────────────────────────────────────────────────────

export async function loadFirma(token) {
  return apiGet(token, '/data/firma');
}

export async function loadKunden(token) {
  return apiGet(token, '/data/kunden');
}

export async function loadAngebote(token) {
  return apiGet(token, '/data/angebote');
}

export async function loadKatalog(token) {
  return apiGet(token, '/data/katalog');
}

// ── Primitiv-Saves ────────────────────────────────────────────────────────────

export async function saveFirma(token, firma) {
  await apiPut(token, '/data/firma', firma);
}

export async function saveKunden(token, kunden) {
  await apiPut(token, '/data/kunden', kunden);
}

export async function saveKatalog(token, items) {
  await apiPut(token, '/data/katalog', items);
}

export async function saveAngebote(token, angebote) {
  await apiPut(token, '/data/angebote', angebote);
}

// ── Angebot-Mutations ─────────────────────────────────────────────────────────

function buildAngebotEintrag(data) {
  const netto = data.positionen.reduce((s, p) => s + Number(p.menge) * Number(p.einzelpreis), 0);
  const brutto = netto * (1 + Number(data.mwstSatz) / 100);
  return {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    angebotNr: data.angebotNr,
    datum: data.datum,
    betreff: data.betreff,
    kundeDisplay: data.kunde.firma || data.kunde.name || '—',
    kundeId: data.kunde?.id || null,
    netto,
    brutto,
    mwstSatz: data.mwstSatz,
    status: 'entwurf',
    snapshot: data,
  };
}

function applyPatch(angebote, id, updates) {
  return angebote.map(a => a.id === id ? { ...a, ...updates } : a);
}

async function mutateAngebote(token, fn) {
  const current = await loadAngebote(token);
  const updated = fn(current);
  await saveAngebote(token, updated);
  return updated;
}

export async function saveAngebot(token, data) {
  const eintrag = buildAngebotEintrag(data);
  const updated = await mutateAngebote(token, arr => [eintrag, ...arr]);
  return { eintrag, updated };
}

export async function updateAngebot(token, id, data, status) {
  const netto = data.positionen.reduce((s, p) => s + Number(p.menge) * Number(p.einzelpreis), 0);
  const brutto = netto * (1 + Number(data.mwstSatz) / 100);
  return mutateAngebote(token, arr => applyPatch(arr, id, {
    updatedAt: new Date().toISOString(),
    angebotNr: data.angebotNr,
    datum: data.datum,
    betreff: data.betreff,
    kundeDisplay: data.kunde.firma || data.kunde.name || '—',
    kundeId: data.kunde?.id || null,
    netto,
    brutto,
    mwstSatz: data.mwstSatz,
    status,
    snapshot: data,
  }));
}

export async function setAngebotStatus(token, id, status) {
  return mutateAngebote(token, arr =>
    applyPatch(arr, id, { status, updatedAt: new Date().toISOString() })
  );
}

export async function deleteAngebot(token, id) {
  return mutateAngebote(token, arr => arr.filter(a => a.id !== id));
}

export async function setMahnung(token, id, mahnStufe, mahnungNr, mahndatum, mahnGebuehren) {
  return mutateAngebote(token, arr => applyPatch(arr, id, {
    mahnStufe, mahnungNr, mahndatum, mahnGebuehren,
    status: 'gemahnt',
    updatedAt: new Date().toISOString(),
  }));
}

export async function setBezahlt(token, id) {
  return mutateAngebote(token, arr => applyPatch(arr, id, {
    status: 'bezahlt',
    bezahltAm: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

export async function setAngebotRechnung(token, id, rechnungsNr, rechnungsDatum, rechnungsBetreff, rechnungsEinleitung, rechnungsHinweise) {
  return mutateAngebote(token, arr => applyPatch(arr, id, {
    rechnungsNr, rechnungsDatum, rechnungsBetreff, rechnungsEinleitung, rechnungsHinweise,
    updatedAt: new Date().toISOString(),
  }));
}

// ── Pure Helper-Funktionen ────────────────────────────────────────────────────

export function nextAngebotNr(angebote) {
  const year = new Date().getFullYear();
  const prefix = `A-${year}-`;
  let max = 0;
  for (const a of angebote) {
    if (a.angebotNr?.startsWith(prefix)) {
      const n = parseInt(a.angebotNr.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export function nextRechnungsNr(angebote) {
  const year = new Date().getFullYear();
  const prefix = `R-${year}-`;
  let max = 0;
  for (const a of angebote) {
    if (a.rechnungsNr?.startsWith(prefix)) {
      const n = parseInt(a.rechnungsNr.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

function parseDEDate(str) {
  if (!str) return null;
  const [d, m, y] = str.split('.');
  if (!d || !m || !y) return null;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

export function autoMarkAbgelaufen(angebote) {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  let changed = false;
  const updated = angebote.map(a => {
    if (a.status !== 'entwurf' && a.status !== 'gesendet') return a;
    const datum = parseDEDate(a.snapshot?.gueltigBis);
    if (!datum) return a;
    datum.setHours(0, 0, 0, 0);
    if (datum < heute) {
      changed = true;
      return { ...a, status: 'abgelaufen', updatedAt: new Date().toISOString() };
    }
    return a;
  });
  return { updated, changed };
}

export function getAngeboteByKunde(angebote, kundeId, kundeDisplay) {
  return angebote.filter(a =>
    (kundeId && a.kundeId === kundeId) ||
    (kundeDisplay && a.kundeDisplay === kundeDisplay)
  );
}
