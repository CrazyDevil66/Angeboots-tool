import { FileText } from 'lucide-react';

function fmt(num) {
  return Number(num || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PreviewPanel({ data }) {
  const netto = data.positionen.reduce((s, p) => s + Number(p.menge) * Number(p.einzelpreis), 0);
  const mwst = netto * (Number(data.mwstSatz) / 100);
  const brutto = netto + mwst;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden sticky top-6">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
        <FileText size={18} className="text-indigo-500" />
        <h3 className="font-semibold text-slate-700 text-sm">Vorschau</h3>
      </div>

      {/* A4-Simulation */}
      <div className="p-4 bg-slate-100">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden text-xs" style={{ aspectRatio: '210/297' }}>
          <div className="p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-indigo-600 font-bold text-base leading-tight">
                  {data.firma.name || 'Firmenname'}
                </div>
                <div className="text-slate-400 text-[9px] mt-0.5">{data.firma.strasse}</div>
                <div className="text-slate-400 text-[9px]">{data.firma.plz} {data.firma.ort}</div>
              </div>
              <div className="text-right">
                <div className="text-slate-800 font-bold text-lg leading-none">ANGEBOT</div>
                <div className="text-slate-400 text-[9px] mt-1">Nr. {data.angebotNr}</div>
                <div className="text-slate-400 text-[9px]">{data.datum}</div>
              </div>
            </div>

            <div className="h-0.5 bg-indigo-500 rounded mb-3" />

            {/* Empfänger */}
            <div className="mb-3">
              <div className="text-slate-300 text-[8px] uppercase tracking-wide mb-1">Angebot für</div>
              <div className="font-semibold text-slate-700 text-[10px]">
                {data.kunde.firma || data.kunde.name || 'Kundenname'}
              </div>
              <div className="text-slate-400 text-[9px]">{data.kunde.strasse}</div>
              <div className="text-slate-400 text-[9px]">{data.kunde.plz} {data.kunde.ort}</div>
            </div>

            {/* Betreff */}
            {data.betreff && (
              <div className="font-semibold text-slate-800 text-[10px] mb-1">{data.betreff}</div>
            )}
            {data.einleitung && (
              <div className="text-slate-500 text-[8px] mb-3 leading-relaxed">{data.einleitung}</div>
            )}

            {/* Tabelle */}
            <div className="flex-1 overflow-hidden">
              <div className="bg-slate-50 rounded flex text-[8px] font-semibold text-slate-400 px-1.5 py-1 mb-1">
                <span className="flex-1">Beschreibung</span>
                <span className="w-8 text-center">Menge</span>
                <span className="w-14 text-right">Gesamt</span>
              </div>
              {data.positionen.slice(0, 6).map((p, i) => (
                <div key={i} className="flex text-[8px] px-1.5 py-0.5 border-b border-slate-50">
                  <span className="flex-1 text-slate-600 truncate">{p.bezeichnung || '—'}</span>
                  <span className="w-8 text-center text-slate-400">{p.menge}</span>
                  <span className="w-14 text-right text-slate-600">
                    {fmt(Number(p.menge) * Number(p.einzelpreis))} €
                  </span>
                </div>
              ))}
              {data.positionen.length > 6 && (
                <div className="text-[7px] text-slate-300 text-center py-1">
                  + {data.positionen.length - 6} weitere Positionen
                </div>
              )}
            </div>

            {/* Summen */}
            <div className="mt-auto pt-2 border-t border-slate-100">
              <div className="flex justify-end">
                <div className="w-36">
                  <div className="flex justify-between text-[8px] text-slate-400 mb-0.5">
                    <span>Netto</span><span>{fmt(netto)} €</span>
                  </div>
                  <div className="flex justify-between text-[8px] text-slate-400 mb-1">
                    <span>MwSt. {data.mwstSatz}%</span><span>{fmt(mwst)} €</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold bg-indigo-500 text-white rounded px-1.5 py-1">
                    <span>Gesamt</span><span>{fmt(brutto)} €</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
