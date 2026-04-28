import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';
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

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Orbitron',
    fontSize: 10,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  companyName: {
    fontSize: 22,
    fontWeight: 700,
    color: '#6366f1',
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
  },
  docTitle: {
    textAlign: 'right',
  },
  docTitleText: {
    fontSize: 26,
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: 4,
  },
  docMeta: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
    textAlign: 'right',
  },
  divider: {
    height: 2,
    backgroundColor: '#6366f1',
    marginBottom: 24,
    borderRadius: 1,
  },
  twoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  addressBlock: {
    width: '48%',
  },
  addressLabel: {
    fontSize: 8,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  addressName: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 3,
  },
  addressLine: {
    fontSize: 9,
    color: '#475569',
    marginBottom: 2,
  },
  subjectLine: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
    color: '#1e293b',
  },
  introText: {
    fontSize: 9.5,
    color: '#475569',
    lineHeight: 1.5,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: '8 0',
    borderRadius: 4,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: '7 0',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: '7 0',
    backgroundColor: '#fafafa',
  },
  colPos: { width: '5%', paddingLeft: 8, fontSize: 9, color: '#94a3b8' },
  colDesc: { width: '45%', paddingLeft: 4 },
  colQty: { width: '10%', textAlign: 'center' },
  colUnit: { width: '10%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '15%', textAlign: 'right', paddingRight: 8 },
  headerText: { fontSize: 8.5, fontWeight: 700, color: '#475569' },
  cellText: { fontSize: 9.5 },
  cellSubText: { fontSize: 8, color: '#94a3b8', marginTop: 2 },
  totalsBlock: {
    marginTop: 16,
    marginLeft: 'auto',
    width: '38%',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalsLabel: { fontSize: 9.5, color: '#64748b' },
  totalsValue: { fontSize: 9.5, color: '#1e293b' },
  totalsDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 6,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#6366f1',
    padding: '8 10',
    borderRadius: 4,
    marginTop: 4,
  },
  grandTotalLabel: { fontSize: 11, fontWeight: 700, color: '#ffffff' },
  grandTotalValue: { fontSize: 11, fontWeight: 700, color: '#ffffff' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 8, color: '#94a3b8' },
  notesSection: {
    marginTop: 28,
    padding: '12 14',
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
    borderRadius: 2,
  },
  notesLabel: { fontSize: 8.5, fontWeight: 700, color: '#6366f1', marginBottom: 4 },
  notesText: { fontSize: 9, color: '#475569', lineHeight: 1.5 },
  validityBadge: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  validityText: { fontSize: 9, color: '#64748b' },
});

function fmt(num) {
  return Number(num || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
}

function calcNetto(items) {
  return items.reduce((s, i) => s + (Number(i.menge) * Number(i.einzelpreis)), 0);
}

function AngebotPDF({ data }) {
  const netto = calcNetto(data.positionen);
  const mwst = netto * (Number(data.mwstSatz) / 100);
  const brutto = netto + mwst;
  const heute = new Date().toLocaleDateString('de-DE');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{data.firma.name || 'Firmenname'}</Text>
            {data.firma.strasse && <Text style={styles.companyDetail}>{data.firma.strasse}</Text>}
            {data.firma.ort && <Text style={styles.companyDetail}>{data.firma.plz} {data.firma.ort}</Text>}
            {data.firma.telefon && <Text style={styles.companyDetail}>Tel: {data.firma.telefon}</Text>}
            {data.firma.email && <Text style={styles.companyDetail}>{data.firma.email}</Text>}
            {data.firma.web && <Text style={styles.companyDetail}>{data.firma.web}</Text>}
          </View>
          <View style={styles.docTitle}>
            <Text style={styles.docTitleText}>ANGEBOT</Text>
            <Text style={styles.docMeta}>Nr. {data.angebotNr || 'A-2024-001'}</Text>
            <Text style={styles.docMeta}>Datum: {data.datum || heute}</Text>
            {data.gueltigBis && <Text style={styles.docMeta}>Gültig bis: {data.gueltigBis}</Text>}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Adressen */}
        <View style={styles.twoCol}>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>Angebot für</Text>
            {data.kunde.firma && <Text style={styles.addressName}>{data.kunde.firma}</Text>}
            {data.kunde.name && <Text style={[styles.addressLine, !data.kunde.firma && styles.addressName]}>{data.kunde.name}</Text>}
            {data.kunde.strasse && <Text style={styles.addressLine}>{data.kunde.strasse}</Text>}
            {data.kunde.ort && <Text style={styles.addressLine}>{data.kunde.plz} {data.kunde.ort}</Text>}
            {data.kunde.email && <Text style={styles.addressLine}>{data.kunde.email}</Text>}
            {data.kunde.telefon && <Text style={styles.addressLine}>{data.kunde.telefon}</Text>}
          </View>
          <View style={styles.addressBlock}>
            {data.firma.ustId && (
              <>
                <Text style={styles.addressLabel}>Steuer</Text>
                <Text style={styles.addressLine}>USt-ID: {data.firma.ustId}</Text>
              </>
            )}
            {data.firma.steuernr && <Text style={styles.addressLine}>St.-Nr.: {data.firma.steuernr}</Text>}
          </View>
        </View>

        {/* Betreff */}
        {data.betreff && <Text style={styles.subjectLine}>{data.betreff}</Text>}
        {data.einleitung && <Text style={styles.introText}>{data.einleitung}</Text>}

        {/* Tabelle */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colPos, styles.headerText]}>Pos.</Text>
          <Text style={[styles.colDesc, styles.headerText]}>Beschreibung</Text>
          <Text style={[styles.colQty, styles.headerText]}>Menge</Text>
          <Text style={[styles.colUnit, styles.headerText]}>Einheit</Text>
          <Text style={[styles.colPrice, styles.headerText]}>Preis</Text>
          <Text style={[styles.colTotal, styles.headerText]}>Gesamt</Text>
        </View>

        {data.positionen.map((pos, i) => (
          <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={[styles.colPos, styles.cellText]}>{i + 1}</Text>
            <View style={styles.colDesc}>
              <Text style={styles.cellText}>{pos.bezeichnung || '-'}</Text>
              {pos.beschreibung && <Text style={styles.cellSubText}>{pos.beschreibung}</Text>}
            </View>
            <Text style={[styles.colQty, styles.cellText]}>{pos.menge}</Text>
            <Text style={[styles.colUnit, styles.cellText]}>{pos.einheit || 'Stk.'}</Text>
            <Text style={[styles.colPrice, styles.cellText]}>{fmt(pos.einzelpreis)}</Text>
            <Text style={[styles.colTotal, styles.cellText]}>{fmt(Number(pos.menge) * Number(pos.einzelpreis))}</Text>
          </View>
        ))}

        {/* Summen */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Nettobetrag</Text>
            <Text style={styles.totalsValue}>{fmt(netto)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>MwSt. {data.mwstSatz}%</Text>
            <Text style={styles.totalsValue}>{fmt(mwst)}</Text>
          </View>
          <View style={styles.totalsDivider} />
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Gesamtbetrag</Text>
            <Text style={styles.grandTotalValue}>{fmt(brutto)}</Text>
          </View>
        </View>

        {/* Hinweise */}
        {data.hinweise && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Hinweise</Text>
            <Text style={styles.notesText}>{data.hinweise}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {data.firma.name} · {data.firma.strasse} · {data.firma.plz} {data.firma.ort}
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
            `Seite ${pageNumber} / ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  );
}

export async function generatePDF(data) {
  const blob = await pdf(<AngebotPDF data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Angebot_${data.angebotNr || 'export'}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export default AngebotPDF;
