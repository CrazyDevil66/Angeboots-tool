import { useState, useMemo } from 'react';
import { Plus, Search, Download, Pencil, Trash2, ChevronDown } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import StatusDropdown from '../components/StatusDropdown';
import { deleteAngebot, setAngebotStatus } from '../lib/storage';
import { generatePDF } from '../lib/pdfGenerator';
import { STATUS_LIST } from '../lib/statusConfig';

const TABS = [
  { id: 'alle', label: 'Alle' },
  ...STATUS_LIST.map(s => ({ id: s.value, label: s.label })),
];

function fmt(num) {
  return Number(num || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AngeboteListe({ navigate, angebote = [], setAngebote, token }) {
  const [suche, setSuche] = useState('');
  const [kundeFilter, setKundeFilter] = useState('alle');
  const [aktiveTab, setAktiveTab] = useState('alle');
  const [pdfLoading, setPdfLoading] = useState(null);

  const kunden = useMemo(() => (
    [...new Set(angebote.map(a => a.kundeDisplay).filter(Boolean))].sort()
  ), [angebote]);

  const tabCounts = useMemo(() => {
    const counts = { alle: angebote.length };
    STATUS_LIST.forEach(s => {
      counts[s.value] = angebote.filter(a => (a.status || 'entwurf') === s.value).length;
    });
    return counts;
  }, [angebote]);

  const gefiltert = useMemo(() => {
    return angebote.filter(a => {
      const q = suche.toLowerCase();
      const matchSuche = !q || (
        a.angebotNr?.toLowerCase().includes(q) ||
        a.kundeDisplay?.toLowerCase().includes(q) ||
        a.betreff?.toLowerCase().includes(q)
      );
      const matchKunde = kundeFilter === 'alle' || a.kundeDisplay === kundeFilter;
      const matchTab = aktiveTab === 'alle' || (a.status || 'entwurf') === aktiveTab;
      return matchSuche && matchKunde && matchTab;
    });
  }, [angebote, suche, kundeFilter, aktiveTab]);

  async function handleDelete(id) {
    if (!confirm('Angebot endgültig löschen?')) return;
    const updated = await deleteAngebot(token, id);
    setAngebote(updated);
  }

  async function handleStatusChange(id, status) {
    const updated = await setAngebotStatus(token, id, status);
    setAngebote(updated);
  }

  async function handlePDF(a) {
    setPdfLoading(a.id);
    try {
      if (a.rechnungsNr) {
        await generatePDF({
          ...a.snapshot,
          rechnungsNr:  a.rechnungsNr,
          rechnungsDatum: a.rechnungsDatum,
          betreff:    a.rechnungsBetreff    ?? a.snapshot?.betreff,
          einleitung: a.rechnungsEinleitung ?? a.snapshot?.einleitung,
          hinweise:   a.rechnungsHinweise   ?? a.snapshot?.hinweise,
        }, 'rechnung');
      } else {
        await generatePDF(a.snapshot);
      }
    } catch (e) { console.error(e); }
    finally { setPdfLoading(null); }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Angebote</h1>
          <p className="text-slate-500 mt-1 text-sm">{angebote.length} Angebote gespeichert</p>
        </div>
        <button
          onClick={() => navigate('angebot-editor')}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
        >
          <Plus size={16} />
          Neues Angebot
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Filter-Leiste */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              placeholder="Suche nach Nr., Kunde, Betreff…"
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

        {/* Status-Tabs */}
        <div className="flex border-b border-slate-100 px-4 bg-slate-50/50 overflow-x-auto">
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
            <p className="font-medium text-slate-500">Keine Angebote gefunden</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Nummer', 'Kunde', 'Betreff', 'Datum', 'Betrag', 'Status', ''].map((h, i) => (
                  <th key={i} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50
                    ${h === 'Betrag' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {gefiltert.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => navigate('angebot-editor', { angebotId: a.id })}
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 leading-tight"
                    >
                      {a.angebotNr}
                    </button>
                    {a.rechnungsNr && (
                      <div className="text-xs text-emerald-600 font-medium mt-0.5">{a.rechnungsNr}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-700">{a.kundeDisplay || '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-500 max-w-[180px] truncate">
                    {a.betreff || <span className="italic text-slate-300">Kein Betreff</span>}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">{a.datum || '—'}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-slate-800 text-right">{fmt(a.brutto)} €</td>
                  <td className="px-4 py-3.5">
                    <StatusDropdown
                      status={a.status || 'entwurf'}
                      onChange={s => handleStatusChange(a.id, s)}
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => navigate('angebot-editor', { angebotId: a.id })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Bearbeiten"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handlePDF(a)}
                        disabled={pdfLoading === a.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                        title={a.rechnungsNr ? 'Rechnung PDF' : 'Angebot PDF'}
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
