const FIRMA_KEY    = 'objektrausch_firma';
const KUNDEN_KEY   = 'objektrausch_kunden';
const ANGEBOTE_KEY = 'objektrausch_angebote';
const KATALOG_KEY  = 'objektrausch_katalog';

export function loadFirma() {
  try {
    const raw = localStorage.getItem(FIRMA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveFirma(firma) {
  localStorage.setItem(FIRMA_KEY, JSON.stringify(firma));
}

export function loadKunden() {
  try {
    const raw = localStorage.getItem(KUNDEN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveKunden(kunden) {
  localStorage.setItem(KUNDEN_KEY, JSON.stringify(kunden));
}

export function loadAngebote() {
  try {
    const raw = localStorage.getItem(ANGEBOTE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAngebot(data) {
  const angebote = loadAngebote();
  const netto = data.positionen.reduce((s, p) => s + Number(p.menge) * Number(p.einzelpreis), 0);
  const brutto = netto * (1 + Number(data.mwstSatz) / 100);

  const eintrag = {
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

  const aktuell = [eintrag, ...angebote];
  localStorage.setItem(ANGEBOTE_KEY, JSON.stringify(aktuell));
  return eintrag;
}

export function updateAngebot(id, data) {
  const angebote = loadAngebote();
  const netto = data.positionen.reduce((s, p) => s + Number(p.menge) * Number(p.einzelpreis), 0);
  const brutto = netto * (1 + Number(data.mwstSatz) / 100);

  const aktuell = angebote.map(a =>
    a.id === id
      ? {
          ...a,
          updatedAt: new Date().toISOString(),
          angebotNr: data.angebotNr,
          datum: data.datum,
          betreff: data.betreff,
          kundeDisplay: data.kunde.firma || data.kunde.name || '—',
          kundeId: data.kunde?.id || null,
          netto,
          brutto,
          mwstSatz: data.mwstSatz,
          status: a.status || 'entwurf',
          snapshot: data,
        }
      : a
  );
  localStorage.setItem(ANGEBOTE_KEY, JSON.stringify(aktuell));
}

export function setAngebotStatus(id, status) {
  const aktuell = loadAngebote().map(a =>
    a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a
  );
  localStorage.setItem(ANGEBOTE_KEY, JSON.stringify(aktuell));
}

export function getAngeboteByKunde(kundeId, kundeDisplay) {
  return loadAngebote().filter(a =>
    (kundeId && a.kundeId === kundeId) ||
    (kundeDisplay && a.kundeDisplay === kundeDisplay)
  );
}

export function deleteAngebot(id) {
  const aktuell = loadAngebote().filter(a => a.id !== id);
  localStorage.setItem(ANGEBOTE_KEY, JSON.stringify(aktuell));
}

export function setMahnung(id, mahnStufe, mahnungNr, mahndatum, mahnGebuehren) {
  const aktuell = loadAngebote().map(a =>
    a.id === id
      ? { ...a, mahnStufe, mahnungNr, mahndatum, mahnGebuehren, status: 'gemahnt', updatedAt: new Date().toISOString() }
      : a
  );
  localStorage.setItem(ANGEBOTE_KEY, JSON.stringify(aktuell));
}

export function setBezahlt(id) {
  const aktuell = loadAngebote().map(a =>
    a.id === id
      ? { ...a, status: 'bezahlt', bezahltAm: new Date().toISOString(), updatedAt: new Date().toISOString() }
      : a
  );
  localStorage.setItem(ANGEBOTE_KEY, JSON.stringify(aktuell));
}

export function loadKatalog() {
  try {
    const raw = localStorage.getItem(KATALOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveKatalog(items) {
  localStorage.setItem(KATALOG_KEY, JSON.stringify(items));
}

export function nextAngebotNr() {
  const year   = new Date().getFullYear();
  const prefix = `A-${year}-`;
  let max = 0;
  for (const a of loadAngebote()) {
    if (a.angebotNr?.startsWith(prefix)) {
      const n = parseInt(a.angebotNr.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export function nextRechnungsNr() {
  const year   = new Date().getFullYear();
  const prefix = `R-${year}-`;
  let max = 0;
  for (const a of loadAngebote()) {
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

export function autoMarkAbgelaufen() {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const angebote = loadAngebote();
  let changed = false;
  const aktuell = angebote.map(a => {
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
  if (changed) localStorage.setItem(ANGEBOTE_KEY, JSON.stringify(aktuell));
}

export function setAngebotRechnung(id, rechnungsNr, rechnungsDatum, rechnungsBetreff, rechnungsEinleitung, rechnungsHinweise) {
  const aktuell = loadAngebote().map(a =>
    a.id === id
      ? { ...a, rechnungsNr, rechnungsDatum, rechnungsBetreff, rechnungsEinleitung, rechnungsHinweise, updatedAt: new Date().toISOString() }
      : a
  );
  localStorage.setItem(ANGEBOTE_KEY, JSON.stringify(aktuell));
}
