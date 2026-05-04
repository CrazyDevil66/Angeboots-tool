import { FileText } from 'lucide-react';

function fmt(num) {
  return Number(num || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const C = {
  dark:      '#2D3342',
  yellow:    '#E8B800',
  textDark:  '#1E2130',
  textMid:   '#4A5568',
  textLight: '#8896A8',
  bgLight:   '#F8FAFC',
  border:    '#E2E8F0',
};

export default function PreviewPanel({ data }) {
  const netto  = data.positionen.reduce((s, p) => s + Number(p.menge) * Number(p.einzelpreis), 0);
  const mwst   = netto * (Number(data.mwstSatz) / 100);
  const brutto = netto + mwst;
  const f      = data.firma;

  const absender = [f.name, f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join(' · ');

  return (
    <div
      className="rounded-2xl shadow-sm border border-slate-100 overflow-hidden sticky"
      style={{ top: '80px', backgroundColor: '#fff' }}
    >
      {/* Panel-Titel */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <FileText size={16} className="text-indigo-500" />
        <h3 className="font-semibold text-slate-700 text-sm">Vorschau</h3>
      </div>

      {/* Dokument-Vorschau — scrollbar, screen-taugliche Schriftgrößen */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>

        {/* Header */}
        <div style={{ backgroundColor: C.dark, padding: '14px 28px', minHeight: 58, display: 'flex', alignItems: 'center' }}>
          {f.logo
            ? <img src={f.logo} alt="Logo" style={{ maxHeight: 34, maxWidth: 140, objectFit: 'contain' }} />
            : <span style={{ color: C.yellow, fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>{f.name || 'Firmenname'}</span>
          }
        </div>
        <div style={{ height: 3, backgroundColor: C.yellow }} />

        {/* Body */}
        <div style={{ padding: '28px 28px 20px', backgroundColor: '#fff' }}>

          {/* Zweispaltig: Adresse | Dok-Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>

            {/* Adressfenster */}
            <div style={{ flex: '0 0 auto', maxWidth: '55%' }}>
              <div style={{ fontSize: 10, color: C.textLight, borderBottom: `0.5px solid ${C.border}`, paddingBottom: 3, marginBottom: 6 }}>
                {absender || ' '}
              </div>
              {data.kunde.firma && (
                <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark, marginBottom: 2 }}>{data.kunde.firma}</div>
              )}
              {data.kunde.name && (
                <div style={{ fontSize: data.kunde.firma ? 11 : 13, fontWeight: data.kunde.firma ? 400 : 700, color: data.kunde.firma ? C.textMid : C.textDark, marginBottom: 2 }}>
                  {data.kunde.name}
                </div>
              )}
              {!data.kunde.firma && !data.kunde.name && (
                <div style={{ fontSize: 13, fontWeight: 700, color: '#CBD5E1' }}>Kundenname</div>
              )}
              {data.kunde.strasse && <div style={{ fontSize: 11, color: C.textMid, marginBottom: 1 }}>{data.kunde.strasse}</div>}
              {data.kunde.ort     && <div style={{ fontSize: 11, color: C.textMid }}>{data.kunde.plz} {data.kunde.ort}</div>}
            </div>

            {/* Dokumenttitel + Metadaten */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.dark, letterSpacing: 2, marginBottom: 6 }}>ANGEBOT</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 11, color: C.textLight, minWidth: 60, textAlign: 'right' }}>Nummer</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.textDark }}>{data.angebotNr || '—'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 11, color: C.textLight, minWidth: 60, textAlign: 'right' }}>Datum</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.textDark }}>{data.datum}</span>
              </div>
              {f.email && (
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: C.textLight, minWidth: 60, textAlign: 'right' }}>E-Mail</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.textDark }}>{f.email}</span>
                </div>
              )}
              {f.telefon && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 11, color: C.textLight, minWidth: 60, textAlign: 'right' }}>Telefon</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.textDark }}>{f.telefon}</span>
                </div>
              )}
            </div>
          </div>

          {/* Betreff */}
          {data.betreff && (
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark, borderLeft: `3px solid ${C.yellow}`, paddingLeft: 10, marginBottom: 8 }}>
              {data.betreff}
            </div>
          )}

          {/* Einleitung */}
          {data.einleitung && (
            <div style={{ fontSize: 11, color: C.textMid, lineHeight: 1.6, marginBottom: 18, whiteSpace: 'pre-wrap' }}>
              {data.einleitung}
            </div>
          )}

          {/* Tabelle */}
          <div style={{ display: 'flex', backgroundColor: C.dark, padding: '7px 0', borderRadius: 3, marginBottom: 1 }}>
            <span style={{ width: '5%',  paddingLeft: 10, fontSize: 10, fontWeight: 700, color: '#fff' }}>#</span>
            <span style={{ width: '43%', paddingLeft: 6,  fontSize: 10, fontWeight: 700, color: '#fff' }}>Beschreibung</span>
            <span style={{ width: '10%', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>Menge</span>
            <span style={{ width: '10%', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>Einheit</span>
            <span style={{ width: '16%', textAlign: 'right',  fontSize: 10, fontWeight: 700, color: '#fff' }}>Einzelpreis</span>
            <span style={{ width: '16%', textAlign: 'right', paddingRight: 10, fontSize: 10, fontWeight: 700, color: '#fff' }}>Gesamt</span>
          </div>

          {data.positionen.slice(0, 8).map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', borderBottom: `1px solid ${C.border}`, padding: '6px 0', backgroundColor: i % 2 !== 0 ? C.bgLight : '#fff' }}>
              <span style={{ width: '5%',  paddingLeft: 10, fontSize: 10, color: C.yellow, fontWeight: 700, paddingTop: 1 }}>{i + 1}</span>
              <div style={{ width: '43%', paddingLeft: 6 }}>
                <div style={{ fontSize: 11, color: C.textDark }}>{p.bezeichnung || '—'}</div>
                {p.beschreibung && <div style={{ fontSize: 10, color: C.textLight, marginTop: 1 }}>{p.beschreibung}</div>}
              </div>
              <span style={{ width: '10%', textAlign: 'center', fontSize: 11, color: C.textDark }}>{p.menge}</span>
              <span style={{ width: '10%', textAlign: 'center', fontSize: 11, color: C.textDark }}>{p.einheit || 'Stk.'}</span>
              <span style={{ width: '16%', textAlign: 'right',  fontSize: 11, color: C.textDark }}>{fmt(p.einzelpreis)} €</span>
              <span style={{ width: '16%', textAlign: 'right', paddingRight: 10, fontSize: 11, fontWeight: 700, color: C.textDark }}>
                {fmt(Number(p.menge) * Number(p.einzelpreis))} €
              </span>
            </div>
          ))}
          {data.positionen.length > 8 && (
            <div style={{ fontSize: 10, color: C.textLight, textAlign: 'center', padding: '5px 0' }}>
              + {data.positionen.length - 8} weitere Positionen
            </div>
          )}

          {/* Summen */}
          <div style={{ marginTop: 12, marginLeft: 'auto', width: '40%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 10px', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 11, color: C.textMid }}>Nettobetrag</span>
              <span style={{ fontSize: 11, color: C.textDark }}>{fmt(netto)} €</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 10px', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 11, color: C.textMid }}>MwSt. {data.mwstSatz} %</span>
              <span style={{ fontSize: 11, color: C.textDark }}>{fmt(mwst)} €</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: C.yellow, padding: '7px 10px', borderRadius: 3, marginTop: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>Gesamtbetrag</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>{fmt(brutto)} €</span>
            </div>
          </div>

          {/* Hinweise */}
          {data.hinweise && (
            <div style={{ marginTop: 20, padding: 12, backgroundColor: C.bgLight, borderLeft: `3px solid ${C.dark}`, borderRadius: 2 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dark, marginBottom: 4, letterSpacing: 0.5 }}>HINWEISE</div>
              <div style={{ fontSize: 11, color: C.textMid, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{data.hinweise}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ backgroundColor: C.dark, padding: '10px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: '#6B7A94' }}>
              {[f.name, f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
              {f.ustId ? ` · USt-ID: ${f.ustId}` : ''}
            </div>
            {f.iban && (
              <div style={{ fontSize: 10, color: C.textLight, marginTop: 2 }}>
                {[f.kontoinhaber && `Inh.: ${f.kontoinhaber}`, `IBAN: ${f.iban}`, f.bic && `BIC: ${f.bic}`, f.bank].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          <span style={{ fontSize: 10, color: C.yellow }}>1 / 1</span>
        </div>
      </div>

      {/* Summen-Übersicht */}
      <div className="p-4 bg-slate-50 border-t border-slate-100">
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Nettobetrag</span>
            <span className="font-medium text-slate-700">{fmt(netto)} €</span>
          </div>
          <div className="flex justify-between text-sm text-slate-500">
            <span>MwSt. {data.mwstSatz}%</span>
            <span className="font-medium text-slate-700">{fmt(mwst)} €</span>
          </div>
          <div className="h-px bg-slate-200 my-2" />
          <div className="flex justify-between font-semibold">
            <span className="text-slate-700">Gesamtbetrag</span>
            <span className="text-indigo-600 text-base">{fmt(brutto)} €</span>
          </div>
        </div>
      </div>
    </div>
  );
}
