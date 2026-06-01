import { useState } from 'react';
import { X, BookOpen, Check, PackageSearch } from 'lucide-react';

function fmt(val) {
  return Number(val || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function KatalogPicker({ katalog, onAdd, onClose }) {
  const [ausgewaehlt, setAusgewaehlt] = useState(new Set());

  function toggle(id) {
    setAusgewaehlt(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleUebernehmen() {
    const positionen = katalog
      .filter(item => ausgewaehlt.has(item.id))
      .map(item => ({
        bezeichnung: item.bezeichnung,
        beschreibung: item.beschreibung || '',
        menge: 1,
        einheit: item.einheit || 'Stk.',
        einzelpreis: item.einzelpreis || 0,
      }));
    onAdd(positionen);
    onClose();
  }

  const anzahl = ausgewaehlt.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen size={18} className="text-indigo-500" />
            <div>
              <h2 className="font-semibold text-slate-800 text-base">Aus Katalog übernehmen</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {katalog.length} {katalog.length === 1 ? 'Leistung' : 'Leistungen'} im Katalog
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-4">
          {katalog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <PackageSearch size={40} className="mb-3 opacity-30" />
              <p className="font-medium text-slate-500">Katalog ist leer</p>
              <p className="text-xs mt-1">Leistungen unter Einstellungen → Leistungen anlegen</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {katalog.map(item => {
                const aktiv = ausgewaehlt.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border text-left transition-all ${
                      aktiv
                        ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      aktiv ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                    }`}>
                      {aktiv && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>

                    {/* Inhalt */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800">{item.bezeichnung}</div>
                      {item.beschreibung && (
                        <div className="text-xs text-slate-400 mt-0.5 truncate">{item.beschreibung}</div>
                      )}
                    </div>

                    {/* Preis */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-slate-700">{fmt(item.einzelpreis)} €</div>
                      <div className="text-xs text-slate-400">pro {item.einheit || 'Stk.'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
          <span className="text-sm text-slate-500">
            {anzahl > 0
              ? <span className="font-semibold text-indigo-600">{anzahl} {anzahl === 1 ? 'Leistung' : 'Leistungen'} ausgewählt</span>
              : 'Leistungen auswählen und übernehmen'}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">
              Abbrechen
            </button>
            <button
              onClick={handleUebernehmen}
              disabled={anzahl === 0}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Check size={14} />
              {anzahl > 0 ? `${anzahl} übernehmen` : 'Übernehmen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
