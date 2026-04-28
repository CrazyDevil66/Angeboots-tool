import { useState, useRef, useEffect } from 'react';
import { Search, BookUser, X, UserCheck } from 'lucide-react';
import { loadKunden } from '../lib/storage';

export default function KundenPicker({ onSelect, onManage }) {
  const [open, setOpen] = useState(false);
  const [suche, setSuche] = useState('');
  const ref = useRef(null);
  const kunden = loadKunden();

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const gefiltert = kunden.filter(k => {
    const q = suche.toLowerCase();
    return (k.firma + k.name + k.ort + k.email).toLowerCase().includes(q);
  });

  function handleSelect(k) {
    onSelect(k);
    setOpen(false);
    setSuche('');
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600
          border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100
          hover:border-indigo-400 transition-all"
      >
        <BookUser size={15} />
        Aus Adressbuch
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 w-80 overflow-hidden">
          {/* Suche */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                autoFocus
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm
                  focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                placeholder="Suche…"
                value={suche}
                onChange={e => setSuche(e.target.value)}
              />
            </div>
          </div>

          {/* Liste */}
          <div className="max-h-60 overflow-y-auto">
            {gefiltert.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                {suche ? 'Kein Treffer' : 'Noch keine Kunden gespeichert'}
              </div>
            ) : (
              gefiltert.map(k => (
                <button
                  key={k.id}
                  onClick={() => handleSelect(k)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left border-b border-slate-50 last:border-0"
                >
                  <UserCheck size={14} className="text-indigo-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{k.firma || k.name}</div>
                    {k.firma && k.name && <div className="text-xs text-slate-400 truncate">{k.name}</div>}
                    {k.ort && <div className="text-xs text-slate-400 truncate">{k.plz} {k.ort}</div>}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={() => { setOpen(false); onManage(); }}
              className="w-full text-center text-xs text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
            >
              Alle Kunden verwalten →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
