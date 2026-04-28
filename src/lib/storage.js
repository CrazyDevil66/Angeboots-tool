const FIRMA_KEY = 'objektrausch_firma';
const KUNDEN_KEY = 'objektrausch_kunden';
const ANGEBOTE_KEY = 'objektrausch_angebote';

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
    kundeId: data.kunde.id || null,
    netto,
    brutto,
    mwstSatz: data.mwstSatz,
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
          netto,
          brutto,
          mwstSatz: data.mwstSatz,
          snapshot: data,
        }
      : a
  );
  localStorage.setItem(ANGEBOTE_KEY, JSON.stringify(aktuell));
}

export function deleteAngebot(id) {
  const aktuell = loadAngebote().filter(a => a.id !== id);
  localStorage.setItem(ANGEBOTE_KEY, JSON.stringify(aktuell));
}
