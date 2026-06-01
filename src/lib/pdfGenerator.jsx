import { Document, Page, Text, View, StyleSheet, pdf, Font, Image } from '@react-pdf/renderer';
import orbitron400 from '../assets/fonts/orbitron-400.woff';
import orbitron700 from '../assets/fonts/orbitron-700.woff';

Font.register({
  family: 'Orbitron',
  fonts: [
    { src: orbitron400, fontWeight: 400 },
    { src: orbitron700, fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback(word => [word]);

// Brand-Farben aus Visitenkarte
const C = {
  dark:     '#2D3342',
  yellow:   '#E8B800',
  white:    '#FFFFFF',
  textDark: '#1E2130',
  textMid:  '#4A5568',
  textLight:'#8896A8',
  bgLight:  '#F8FAFC',
  border:   '#E2E8F0',
};

// 1 mm = 2.835 pt
// DIN 5008 Form B: Anschriftfeld ab 45 mm = 127.6 pt von Oberkante
// Header (paddingV 13×2 + logo max 40 + accentBar 3) ≈ 69 pt ≈ 24.3 mm
// → paddingTop body = 127 - 69 = 58 pt ≈ 20.4 mm → Summe ≈ 44.7 mm ✓

const s = StyleSheet.create({
  page: {
    fontFamily: 'Orbitron',
    fontSize: 9,
    color: C.textDark,
    backgroundColor: C.white,
    paddingBottom: 60,
    paddingTop: 69,
  },

  // ── HEADER: nur Logo ──────────────────────────────
  header: {
    backgroundColor: C.dark,
    paddingHorizontal: 40,
    paddingVertical: 13,
  },
  headerLogo: {
    maxHeight: 40,
    maxWidth: 150,
    objectFit: 'contain',
  },
  headerFirmaName: {
    fontSize: 15,
    fontWeight: 700,
    color: C.yellow,
    letterSpacing: 1,
  },

  accentBar: {
    height: 3,
    backgroundColor: C.yellow,
  },

  // ── BODY ─────────────────────────────────────────
  body: {
    paddingHorizontal: 40,
    paddingTop: 58,
  },

  // Zweispaltig: links Adressfenster, rechts Dokument-Info
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  // ── ADRESSFENSTER (links) ─────────────────────────
  addrCol: {
    width: 240,
  },
  absender: {
    fontSize: 6.5,
    color: C.textLight,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    paddingBottom: 3,
    marginBottom: 6,
  },
  addrName: {
    fontSize: 11,
    fontWeight: 700,
    color: C.textDark,
    marginBottom: 3,
  },
  addrLine: {
    fontSize: 9,
    color: C.textMid,
    marginBottom: 2,
  },

  // ── DOKUMENT-INFO (rechts) ─────────────────────────
  docCol: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: C.dark,
    letterSpacing: 3,
    marginBottom: 8,
  },
  docMetaRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 3,
  },
  docMetaLabel: {
    fontSize: 8,
    color: C.textLight,
    textAlign: 'right',
    width: 55,
  },
  docMetaValue: {
    fontSize: 8,
    fontWeight: 700,
    color: C.textDark,
    textAlign: 'right',
  },

  // ── BETREFF / EINLEITUNG ─────────────────────────
  subject: {
    fontSize: 11,
    fontWeight: 700,
    color: C.textDark,
    borderLeftWidth: 3,
    borderLeftColor: C.yellow,
    paddingLeft: 10,
    marginBottom: 8,
  },
  intro: {
    fontSize: 9,
    color: C.textMid,
    lineHeight: 1.6,
    marginBottom: 20,
  },

  // ── TABELLE ──────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.dark,
    paddingVertical: 7,
    borderRadius: 3,
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 6,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 6,
    backgroundColor: C.bgLight,
  },
  colPos:   { width: '5%',  paddingLeft: 10, fontSize: 8 },
  colDesc:  { width: '44%', paddingLeft: 6 },
  colQty:   { width: '10%', textAlign: 'center' },
  colUnit:  { width: '10%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '16%', textAlign: 'right', paddingRight: 10 },
  thText:   { fontSize: 8,   fontWeight: 700, color: C.white },
  tdText:   { fontSize: 9 },
  tdSub:    { fontSize: 7.5, color: C.textLight, marginTop: 1 },

  // ── SUMMEN ───────────────────────────────────────
  totalsBlock: {
    marginTop: 14,
    marginLeft: 'auto',
    width: '36%',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  totalsLabel: { fontSize: 8.5, color: C.textMid },
  totalsValue: { fontSize: 8.5, color: C.textDark },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.yellow,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginTop: 2,
  },
  grandLabel: { fontSize: 10, fontWeight: 700, color: C.dark },
  grandValue: { fontSize: 10, fontWeight: 700, color: C.dark },

  // ── HINWEISE ─────────────────────────────────────
  notes: {
    marginTop: 28,
    padding: 12,
    backgroundColor: C.bgLight,
    borderLeftWidth: 3,
    borderLeftColor: C.dark,
    borderRadius: 2,
  },
  notesLabel: { fontSize: 8, fontWeight: 700, color: C.dark, marginBottom: 4, letterSpacing: 0.5 },
  notesText:  { fontSize: 8.5, color: C.textMid, lineHeight: 1.6 },
  validity:   { marginTop: 12, fontSize: 8, color: C.textLight },

  // ── MAHNUNG ──────────────────────────────────────
  mahnTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: C.dark,
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'right',
  },
  mahnBox: {
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: '#FC8181',
    borderRadius: 4,
    padding: 14,
    backgroundColor: C.bgLight,
  },
  mahnBoxTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: '#C53030',
    marginBottom: 10,
    letterSpacing: 1,
  },
  mahnSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#FED7D7',
  },
  mahnSummaryLabel: { fontSize: 8.5, color: C.textMid },
  mahnSummaryValue: { fontSize: 8.5, color: C.textDark },
  mahnTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#C53030',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginTop: 8,
  },
  mahnTotalLabel: { fontSize: 10, fontWeight: 700, color: C.white },
  mahnTotalValue: { fontSize: 10, fontWeight: 700, color: C.white },

  // ── FOOTER ───────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.dark,
    paddingHorizontal: 40,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  footerText: { fontSize: 7.5, color: '#6B7A94' },
  footerUstId: { fontSize: 7.5, color: '#8896A8' },
  footerPage: { fontSize: 7.5, color: C.yellow },
});

function fmt(n) {
  return Number(n || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
}

function vkPreis(p) {
  return Number(p.einzelpreis) * (1 + Number(p.aufschlag || 0) / 100);
}

function DokumentPDF({ data, typ = 'angebot' }) {
  const netto  = data.positionen.reduce((s, p) => s + Number(p.menge) * vkPreis(p), 0);
  const mwst   = netto * (Number(data.mwstSatz) / 100);
  const brutto = netto + mwst;
  const heute  = new Date().toLocaleDateString('de-DE');
  const f      = data.firma;

  const istRechnung  = typ === 'rechnung';
  const titelText    = istRechnung ? 'RECHNUNG' : 'ANGEBOT';
  const nummerLabel  = istRechnung ? 'Rechnungs-Nr.' : 'Nummer';
  const nummerWert   = istRechnung ? (data.rechnungsNr || '—') : (data.angebotNr || '—');
  const datumWert    = istRechnung ? (data.rechnungsDatum || heute) : (data.datum || heute);

  const absenderZeile = [f.name, f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join('  ·  ');

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── KOPFZEILE: alle Seiten ── */}
        <View fixed style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <View style={s.header}>
            {f.logo
              ? <Image src={f.logo} style={s.headerLogo} />
              : <Text style={s.headerFirmaName}>{f.name || 'Firmenname'}</Text>
            }
          </View>
          <View style={s.accentBar} />
        </View>

        {/* ── BODY ── */}
        <View style={s.body}>

          {/* Zweispaltig: Adressfenster links | Dokument-Info rechts */}
          <View style={s.topRow}>

            {/* Links — DIN-5008-Adressfenster */}
            <View style={s.addrCol}>
              <Text style={s.absender}>{absenderZeile}</Text>

              {data.kunde.firma && <Text style={s.addrName}>{data.kunde.firma}</Text>}
              {data.kunde.name && (
                <Text style={[s.addrLine, !data.kunde.firma && s.addrName]}>
                  {data.kunde.name}
                </Text>
              )}
              {data.kunde.strasse && <Text style={s.addrLine}>{data.kunde.strasse}</Text>}
              {data.kunde.ort     && <Text style={s.addrLine}>{data.kunde.plz} {data.kunde.ort}</Text>}
            </View>

            {/* Rechts — Dokument-Titel & Metadaten */}
            <View style={s.docCol}>
              <Text style={s.docTitle}>{titelText}</Text>
              <View style={s.docMetaRow}>
                <Text style={s.docMetaLabel}>{nummerLabel}</Text>
                <Text style={s.docMetaValue}>{nummerWert}</Text>
              </View>
              <View style={s.docMetaRow}>
                <Text style={s.docMetaLabel}>Datum</Text>
                <Text style={s.docMetaValue}>{datumWert}</Text>
              </View>
              {f.email && (
                <View style={[s.docMetaRow, { marginTop: 6 }]}>
                  <Text style={s.docMetaLabel}>E-Mail</Text>
                  <Text style={s.docMetaValue}>{f.email}</Text>
                </View>
              )}
              {f.telefon && (
                <View style={s.docMetaRow}>
                  <Text style={s.docMetaLabel}>Telefon</Text>
                  <Text style={s.docMetaValue}>{f.telefon}</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── BETREFF + EINLEITUNG ── */}
          {data.betreff    && <Text style={s.subject}>{data.betreff}</Text>}
          {data.einleitung && <Text style={s.intro}>{data.einleitung}</Text>}

          {/* ── TABELLE ── */}
          <View style={s.tableHeader}>
            <Text style={[s.colPos,   s.thText]}>Pos.</Text>
            <Text style={[s.colDesc,  s.thText]}>Beschreibung</Text>
            <Text style={[s.colQty,   s.thText]}>Menge</Text>
            <Text style={[s.colUnit,  s.thText]}>Einheit</Text>
            <Text style={[s.colPrice, s.thText]}>Einzelpreis</Text>
            <Text style={[s.colTotal, s.thText]}>Gesamt</Text>
          </View>

          {data.positionen.map((p, i) => (
            <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={[s.colPos,   s.tdText, { color: C.yellow, fontWeight: 700 }]}>{i + 1}</Text>
              <View style={s.colDesc}>
                <Text style={s.tdText}>{p.bezeichnung || '—'}</Text>
                {p.beschreibung ? <Text style={s.tdSub}>{p.beschreibung}</Text> : null}
              </View>
              <Text style={[s.colQty,   s.tdText]}>{p.menge}</Text>
              <Text style={[s.colUnit,  s.tdText]}>{p.einheit || 'Stk.'}</Text>
              <Text style={[s.colPrice, s.tdText]}>{fmt(vkPreis(p))}</Text>
              <Text style={[s.colTotal, s.tdText, { fontWeight: 700 }]}>
                {fmt(Number(p.menge) * vkPreis(p))}
              </Text>
            </View>
          ))}

          {/* ── SUMMEN ── */}
          <View style={s.totalsBlock}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Nettobetrag</Text>
              <Text style={s.totalsValue}>{fmt(netto)}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>MwSt. {data.mwstSatz} %</Text>
              <Text style={s.totalsValue}>{fmt(mwst)}</Text>
            </View>
            <View style={s.grandRow}>
              <Text style={s.grandLabel}>Gesamtbetrag</Text>
              <Text style={s.grandValue}>{fmt(brutto)}</Text>
            </View>
          </View>

          {/* ── HINWEISE ── */}
          {data.hinweise && (
            <View style={s.notes}>
              <Text style={s.notesLabel}>HINWEISE</Text>
              <Text style={s.notesText}>{data.hinweise}</Text>
            </View>
          )}

        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer} fixed>
          <View style={s.footerLeft}>
            <Text style={s.footerText}>
              {[f.name, f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join('  ·  ')}
              {f.ustId ? `  ·  USt-ID: ${f.ustId}` : ''}
            </Text>
            {f.iban && (
              <Text style={s.footerUstId}>
                {[
                  f.kontoinhaber && `Inh.: ${f.kontoinhaber}`,
                  f.iban && `IBAN: ${f.iban}`,
                  f.bic && `BIC: ${f.bic}`,
                  f.bank,
                ].filter(Boolean).join('  ·  ')}
              </Text>
            )}
          </View>
          <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}

function MahnungPDF({ data, mahnung }) {
  const f      = data.firma;
  const netto  = data.positionen.reduce((s, p) => s + Number(p.menge) * vkPreis(p), 0);
  const mwst   = netto * (Number(data.mwstSatz) / 100);
  const brutto = netto + mwst;
  const gebuehr = Number(mahnung.mahngebuehr || 0);
  const vorherigeGebuehren = (mahnung.vorherigeGebuehren || []).filter(g => g.betrag > 0);
  const vorherigeGebuehrenSum = vorherigeGebuehren.reduce((s, g) => s + Number(g.betrag || 0), 0);
  const gesamt = brutto + vorherigeGebuehrenSum + gebuehr;

  const STUFEN_LABEL = { 1: 'Zahlungserinnerung', 2: '1. Mahnung', 3: '2. Mahnung' };

  const stufe = mahnung.stufe;
  const titelText = stufe === 1 ? 'ZAHLUNGSERINNERUNG' : stufe === 3 ? '2. MAHNUNG' : '1. MAHNUNG';
  const betreffText = stufe === 1
    ? `Zahlungserinnerung zu Rechnung ${data.rechnungsNr || '—'} vom ${data.rechnungsDatum || '—'}`
    : stufe === 3
      ? `2. Mahnung zu Rechnung ${data.rechnungsNr || '—'} vom ${data.rechnungsDatum || '—'}`
      : `1. Mahnung zu Rechnung ${data.rechnungsNr || '—'} vom ${data.rechnungsDatum || '—'}`;

  const absenderZeile = [f.name, f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join('  ·  ');

  return (
    <Document>
      <Page size="A4" style={s.page}>

        <View fixed style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <View style={s.header}>
            {f.logo
              ? <Image src={f.logo} style={s.headerLogo} />
              : <Text style={s.headerFirmaName}>{f.name || 'Firmenname'}</Text>
            }
          </View>
          <View style={s.accentBar} />
        </View>

        <View style={s.body}>
          <View style={s.topRow}>
            <View style={s.addrCol}>
              <Text style={s.absender}>{absenderZeile}</Text>
              {data.kunde.firma && <Text style={s.addrName}>{data.kunde.firma}</Text>}
              {data.kunde.name && (
                <Text style={[s.addrLine, !data.kunde.firma && s.addrName]}>
                  {data.kunde.name}
                </Text>
              )}
              {data.kunde.strasse && <Text style={s.addrLine}>{data.kunde.strasse}</Text>}
              {data.kunde.ort     && <Text style={s.addrLine}>{data.kunde.plz} {data.kunde.ort}</Text>}
            </View>

            <View style={s.docCol}>
              <Text style={s.mahnTitle}>{titelText}</Text>
              <View style={s.docMetaRow}>
                <Text style={s.docMetaLabel}>Mahnungs-Nr.</Text>
                <Text style={s.docMetaValue}>{mahnung.mahnungNr || '—'}</Text>
              </View>
              <View style={s.docMetaRow}>
                <Text style={s.docMetaLabel}>Datum</Text>
                <Text style={s.docMetaValue}>{mahnung.datum || '—'}</Text>
              </View>
              <View style={s.docMetaRow}>
                <Text style={s.docMetaLabel}>Zu Rechnung</Text>
                <Text style={s.docMetaValue}>{data.rechnungsNr || '—'}</Text>
              </View>
              {f.email && (
                <View style={[s.docMetaRow, { marginTop: 6 }]}>
                  <Text style={s.docMetaLabel}>E-Mail</Text>
                  <Text style={s.docMetaValue}>{f.email}</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={s.subject}>{betreffText}</Text>
          <Text style={s.intro}>{mahnung.text}</Text>

          <View style={s.mahnBox}>
            <Text style={s.mahnBoxTitle}>OFFENER BETRAG</Text>
            <View style={s.mahnSummaryRow}>
              <Text style={s.mahnSummaryLabel}>
                Rechnungsbetrag (Rechnung {data.rechnungsNr || '—'} vom {data.rechnungsDatum || '—'})
              </Text>
              <Text style={s.mahnSummaryValue}>{fmt(brutto)}</Text>
            </View>
            {vorherigeGebuehren.map((g, i) => (
              <View key={i} style={s.mahnSummaryRow}>
                <Text style={s.mahnSummaryLabel}>
                  Mahngebühr ({STUFEN_LABEL[g.stufe] || `Stufe ${g.stufe}`})
                </Text>
                <Text style={s.mahnSummaryValue}>{fmt(g.betrag)}</Text>
              </View>
            ))}
            {gebuehr > 0 && (
              <View style={s.mahnSummaryRow}>
                <Text style={s.mahnSummaryLabel}>Mahngebühr ({STUFEN_LABEL[stufe] || `Stufe ${stufe}`})</Text>
                <Text style={s.mahnSummaryValue}>{fmt(gebuehr)}</Text>
              </View>
            )}
            <View style={s.mahnTotalRow}>
              <Text style={s.mahnTotalLabel}>Zu zahlen bis {mahnung.frist}</Text>
              <Text style={s.mahnTotalValue}>{fmt(gesamt)}</Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <View style={s.footerLeft}>
            <Text style={s.footerText}>
              {[f.name, f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join('  ·  ')}
              {f.ustId ? `  ·  USt-ID: ${f.ustId}` : ''}
            </Text>
            {f.iban && (
              <Text style={s.footerUstId}>
                {[
                  f.kontoinhaber && `Inh.: ${f.kontoinhaber}`,
                  f.iban && `IBAN: ${f.iban}`,
                  f.bic && `BIC: ${f.bic}`,
                  f.bank,
                ].filter(Boolean).join('  ·  ')}
              </Text>
            )}
          </View>
          <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}

export async function generatePDF(data, typ = 'angebot', mahnungData = null) {
  let component;
  let filename;

  if (typ === 'mahnung') {
    component = <MahnungPDF data={data} mahnung={mahnungData} />;
    filename  = `Mahnung_${mahnungData?.mahnungNr || 'export'}.pdf`;
  } else {
    component = <DokumentPDF data={data} typ={typ} />;
    const nr     = typ === 'rechnung' ? (data.rechnungsNr || 'export') : (data.angebotNr || 'export');
    const prefix = typ === 'rechnung' ? 'Rechnung' : 'Angebot';
    filename = `${prefix}_${nr}.pdf`;
  }

  const blob = await pdf(component).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default DokumentPDF;
