import { useState, useMemo } from 'react';
import { X, Search, Archive, Download, Trash2, FolderOpen, ChevronDown, User } from 'lucide-react';
import { loadAngebote, deleteAngebot } from '../lib/storage';
import { generatePDF } from '../lib/pdfGenerator';

function fmt(num) {
  return Number(num || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ angebot }) {
  const age = (Date.now() - new Date(angebot.savedAt)) / 86400000;
  if (age < 1) return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Heute</span>;
  if (age < 7) return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Diese Woche</span>;
  return null;
}

export default function AngebotArchiv({ onLoad, onClose }) {
  const [angebote, setAngebote] = useState(loadAngebote);
  const [suche, setSuche] = useState('');
  const [kundeFilter, setKundeFilter] = useState('alle');
  const [pdfLoading, setPdfLoading] = useState(null);

  const kunden = useMemo(() => {
    const namen = [...new Set(angebote.map(a => a.kundeDisplay).filter(Boolean))];
    return namen.sort();
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
      return matchSuche && matchKunde;
    });
  }, [angebote, suche, kundeFilter]);

  function handleDelete(id) {
    if (!confirm('Angebot endgültig löschen?')) return;
    deleteAngebot(id);
    setAngebote(prev => prev.filter(a => a.id !== id));
  }

  async function handlePDF(angebot) {
    setPdfLoading(angebot.id);
    try {
      await generatePDF(angebot.snapshot);
    } finally {
      setPdfLoading(null);
    }
  }

  // Angebote nach Kunde gruppieren
  const gruppen = useMemo(() => {
    const map = {};
    gefiltert.forEach(a => {
      const key = a.kundeDisplay || '—';
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [gefiltert]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Archive size={16} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 text-base">Angebots-Archiv</h2>
              <p className="text-xs text-slate-400">{angebote.length} Angebote gespeichert</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Filter-Leiste */}
        <div className="flex gap-3 px-6 py-3 border-b border-slate-100 flex-shrink-0 bg-white">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm
                focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              placeholder="Suche nach Nr., Kunde, Betreff…"
              value={suche}
              onChange={e => setSuche(e.target.value)}
            />
          </div>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
            <select
              className="pl-8 pr-8 py-2 rounded-lg border border-slate-200 text-sm bg-white
                focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none"
              value={kundeFilter}
              onChange={e => setKundeFilter(e.target.value)}
            >
              <option value="alle">Alle Kunden</option>
              {kunden.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {gefiltert.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Archive size={44} className="mx-auto mb-3 opacity-25" />
              <p className="font-medium text-slate-500">
                {suche || kundeFilter !== 'alle' ? 'Keine Angebote gefunden' : 'Noch keine Angebote gespeichert'}
              </p>
              {!suche && kundeFilter === 'alle' && (
                <p className="text-sm mt-1">Speichere dein erstes Angebot über den Button oben.</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {gruppen.map(([kundenName, items]) => (
                <div key={kundenName}>
                  {/* Kunden-Gruppe Header */}
                  <div className="flex items-center gap-2 px-6 py-2 bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                    <User size={13} className="text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{kundenName}</span>
                    <span className="text-xs text-slate-400 ml-auto">{items.length} Angebot{items.length !== 1 ? 'e' : ''}</span>
                  </div>

                  {/* Angebote der Gruppe */}
                  {items.map(a => (
                    <div
                      key={a.id}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-indigo-50/30 transition-colors group"
                    >
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-slate-800 text-sm">{a.angebotNr}</span>
                          <StatusBadge angebot={a} />
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {a.betreff || <span className="italic text-slate-300">Kein Betreff</span>}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {a.updatedAt
                            ? `Zuletzt geändert ${formatDate(a.updatedAt)}`
                            : `Gespeichert ${formatDate(a.savedAt)}`}
                        </div>
                      </div>

                      {/* Betrag */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-slate-800">{fmt(a.brutto)} €</div>
                        <div className="text-xs text-slate-400">Netto {fmt(a.netto)} €</div>
                      </div>

                      {/* Aktionen */}
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handlePDF(a)}
                          disabled={pdfLoading === a.id}
                          className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                          title="PDF exportieren"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Löschen"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Laden */}
                      <button
                        onClick={() => { onLoad(a.snapshot); onClose(); }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold flex-shrink-0
                          text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-600 hover:text-white
                          hover:border-indigo-600 transition-all"
                      >
                        <FolderOpen size={13} />
                        Laden
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
