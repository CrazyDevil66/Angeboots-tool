import { useState, useMemo } from 'react';
import { Search, Download, Pencil, ChevronDown } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { loadAngebotFull } from '../lib/storage';
import { generatePDF } from '../lib/pdfGenerator';
import { getStatus } from '../lib/statusConfig';

const RECHNUNGS_STATUS = ['angenommen', 'gemahnt', 'bezahlt'];

const TABS = [
  { id: 'alle',       label: 'Alle' },
  { id: 'angenommen', label: 'Offen' },
  { id: 'gemahnt',    label: 'Gemahnt' },
  { id: 'bezahlt',    label: 'Bezahlt' },
];

function fmt(num) {
  return Number(num || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RechnungenListe({ navigate, angebote = [], token, firma }) {
  const [suche, setSuche] = useState('');
  const [kundeFilter, setKundeFilter] = useState('alle');
  const [aktiveTab, setAktiveTab] = useState('alle');
  const [pdfLoading, setPdfLoading] = useState(null);

  const rechnungen = useMemo(() =>
    angebote.filter(a => a.rechnungsNr),
  [angebote]);

  const kunden = useMemo(() =>
    [...new Set(rechnungen.map(a => a.kundeDisplay).filter(Boolean))].sort(),
  [rechnungen]);

  const tabCounts = useMemo(() => {
    const counts = { alle: rechnungen.length };
    RECHNUNGS_STATUS.forEach(s => {
      counts[s] = rechnungen.filter(a => a.status === s).length;
    });
    return counts;
  }, [rechnungen]);

  const gefiltert = useMemo(() => {
    const q = suche.toLowerCase();
    return rechnungen.filter(a => {
      const matchSuche = !q || (
        a.rechnungsNr?.toLowerCase().includes(q) ||
        a.angebotNr?.toLowerCase().includes(q) ||
        a.kundeDisplay?.toLowerCase().includes(q) ||
        (a.rechnungsBetreff || a.betreff)?.toLowerCase().includes(q)
      );
      const matchKunde = kundeFilter === 'alle' || a.kundeDisplay === kundeFilter;
      const matchTab   = aktiveTab === 'alle' || a.status === aktiveTab;
      return matchSuche && matchKunde && matchTab;
    });
  }, [rechnungen, suche, kundeFilter, aktiveTab]);

  async function handlePDF(a) {
    setPdfLoading(a.id);
    try {
      const full = await loadAngebotFull(token, a.id);
      const snapshot = { ...full.snapshot, firma };
      await generatePDF({
        ...snapshot,
        rechnungsNr:    a.rechnungsNr,
        rechnungsDatum: a.rechnungsDatum,
        betreff:        a.rechnungsBetreff    ?? snapshot.betreff,
        einleitung:     a.rechnungsEinleitung ?? snapshot.einleitung,
        hinweise:       a.rechnungsHinweise   ?? snapshot.hinweise,
      }, 'rechnung');
    } catch (e) { console.error(e); }
    finally { setPdfLoading(null); }
  }

  const cfg = s => getStatus(s);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rechnungen</h1>
          <p className="text-slate-500 mt-1 text-sm">{rechnungen.length} Rechnungen gesamt</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Filter */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              placeholder="Suche nach Rechnungsnr., Kunde, Betreff…"
              value={suche}
              onChange={e => setSuche(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="pl-3 pr-8 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none"
              value={kundeFilter}
              onChange={e => setKundeFilter(e.target.value)}
            >
              <option value="alle">Alle Kunden</option>
              {kunden.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-4 bg-slate-50/50">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setAktiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex-shrink-0
                ${aktiveTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                ${aktiveTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                {tabCounts[tab.id] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Tabelle */}
        {gefiltert.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="font-medium text-slate-500">Keine Rechnungen gefunden</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Rechnungsnr.', 'Angebotsnr.', 'Kunde', 'Betreff', 'Datum', 'Betrag', 'Status', ''].map((h, i) => (
                  <th key={i} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50
                    ${h === 'Betrag' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {gefiltert.map(a => {
                const s = cfg(a.status);
                return (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-emerald-600">{a.rechnungsNr}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => navigate('angebot-editor', { angebotId: a.id })}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        {a.angebotNr}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-700">{a.kundeDisplay || '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500 max-w-[160px] truncate">
                      {a.rechnungsBetreff || a.betreff || <span className="italic text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                      {a.rechnungsDatum || a.datum || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-slate-800 text-right whitespace-nowrap">
                      {fmt(a.brutto)} €
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border ${s.bg} ${s.text} ${s.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => navigate('angebot-editor', { angebotId: a.id })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Im Angebot öffnen"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handlePDF(a)}
                          disabled={pdfLoading === a.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                          title="Rechnung PDF"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
