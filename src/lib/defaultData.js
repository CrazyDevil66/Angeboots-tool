export const defaultData = {
  firma: {
    name: '',
    strasse: '',
    plz: '',
    ort: '',
    telefon: '',
    email: '',
    web: '',
    ustId: '',
    steuernr: '',
  },
  kunde: {
    firma: '',
    name: '',
    strasse: '',
    plz: '',
    ort: '',
    email: '',
    telefon: '',
  },
  angebotNr: `A-${new Date().getFullYear()}-001`,
  datum: new Date().toLocaleDateString('de-DE'),
  gueltigBis: '',
  betreff: '',
  einleitung: 'vielen Dank für Ihr Interesse. Gerne unterbreiten wir Ihnen folgendes Angebot:',
  mwstSatz: 19,
  positionen: [
    { bezeichnung: '', beschreibung: '', menge: 1, einheit: 'Stk.', einzelpreis: 0 },
  ],
  hinweise: 'Zahlungsziel: 14 Tage nach Rechnungseingang ohne Abzug.\nAngebot freibleibend.',
};

export const einheiten = ['Stk.', 'Std.', 'm²', 'lfm', 'kg', 'Pauschal', 'Set', 'Monat'];
