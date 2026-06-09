// ── HTTP-Helfer ───────────────────────────────────────────────────────────────

async function apiGet(token, endpoint) {
  const res = await fetch(`/api${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${endpoint} fehlgeschlagen (${res.status})`);
  return res.json();
}

async function apiPost(token, endpoint, body) {
  const res = await fetch(`/api${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${endpoint} fehlgeschlagen (${res.status})`);
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

async function apiPatch(token, endpoint, body) {
  const res = await fetch(`/api${endpoint}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${endpoint} fehlgeschlagen (${res.status})`);
  return res.json();
}

async function apiDelete(token, endpoint) {
  const res = await fetch(`/api${endpoint}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`DELETE ${endpoint} fehlgeschlagen (${res.status})`);
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
  return apiGet(token, '/angebote');
}

export async function loadAngebotFull(token, id) {
  return apiGet(token, `/angebote/${id}`);
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

// ── Angebot-Mutations ─────────────────────────────────────────────────────────

export async function saveAngebot(token, data) {
  const result = await apiPost(token, '/angebote', data);
  return { eintrag: result.entry, updated: result.index };
}

export async function updateAngebot(token, id, data, status) {
  const result = await apiPut(token, `/angebote/${id}`, { snapshot: data, status });
  return result.index;
}

export async function setAngebotStatus(token, id, status) {
  const result = await apiPatch(token, `/angebote/${id}`, { status });
  return result.index;
}

export async function deleteAngebot(token, id) {
  const result = await apiDelete(token, `/angebote/${id}`);
  return result.index;
}

export async function setMahnung(token, id, mahnStufe, mahnungNr, mahndatum, mahnGebuehren) {
  const result = await apiPatch(token, `/angebote/${id}`, {
    mahnStufe, mahnungNr, mahndatum, mahnGebuehren, status: 'gemahnt',
  });
  return result.index;
}

export async function setBezahlt(token, id) {
  const result = await apiPatch(token, `/angebote/${id}`, {
    status: 'bezahlt',
    bezahltAm: new Date().toISOString(),
  });
  return result.index;
}

export async function setAngebotRechnung(token, id, rechnungsNr, rechnungsDatum, rechnungsBetreff, rechnungsEinleitung, rechnungsHinweise) {
  const result = await apiPatch(token, `/angebote/${id}`, {
    rechnungsNr, rechnungsDatum, rechnungsBetreff, rechnungsEinleitung, rechnungsHinweise,
  });
  return result.index;
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
    const datum = parseDEDate(a.gueltigBis);
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
