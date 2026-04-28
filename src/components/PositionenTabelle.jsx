import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Input, Select } from './FormField';
import { einheiten } from '../lib/defaultData';

function fmt(val) {
  const n = Number(val) || 0;
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PositionenTabelle({ positionen, onChange }) {
  function update(i, field, value) {
    const neu = positionen.map((p, idx) => idx === i ? { ...p, [field]: value } : p);
    onChange(neu);
  }

  function addRow() {
    onChange([...positionen, { bezeichnung: '', beschreibung: '', menge: 1, einheit: 'Stk.', einzelpreis: 0 }]);
  }

  function remove(i) {
    if (positionen.length === 1) return;
    onChange(positionen.filter((_, idx) => idx !== i));
  }

  const netto = positionen.reduce((s, p) => s + Number(p.menge) * Number(p.einzelpreis), 0);

  return (
    <div>
      {/* Tabellen-Header */}
      <div className="grid grid-cols-[32px_1fr_80px_90px_110px_110px_40px] gap-2 px-2 pb-2 border-b border-slate-100">
        <span />
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Beschreibung</span>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide text-center">Menge</span>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide text-center">Einheit</span>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide text-right">Einzelpreis</span>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide text-right">Gesamt</span>
        <span />
      </div>

      {/* Positionen */}
      <div className="flex flex-col gap-1 mt-2">
        {positionen.map((pos, i) => {
          const gesamt = Number(pos.menge) * Number(pos.einzelpreis);
          return (
            <div
              key={i}
              className="grid grid-cols-[32px_1fr_80px_90px_110px_110px_40px] gap-2 items-start
                bg-slate-50 rounded-xl p-2 hover:bg-indigo-50/40 transition-colors group"
            >
              <div className="flex items-center justify-center h-9 text-slate-300 group-hover:text-slate-400">
                <GripVertical size={16} />
              </div>

              <div className="flex flex-col gap-1">
                <Input
                  placeholder="Bezeichnung"
                  value={pos.bezeichnung}
                  onChange={e => update(i, 'bezeichnung', e.target.value)}
                />
                <input
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500
                    bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all
                    placeholder:text-slate-300"
                  placeholder="Zusatzbeschreibung (optional)"
                  value={pos.beschreibung}
                  onChange={e => update(i, 'beschreibung', e.target.value)}
                />
              </div>

              <Input
                type="number"
                min="0"
                step="0.01"
                value={pos.menge}
                onChange={e => update(i, 'menge', e.target.value)}
                className="text-center"
              />

              <Select
                value={pos.einheit}
                onChange={e => update(i, 'einheit', e.target.value)}
              >
                {einheiten.map(e => <option key={e} value={e}>{e}</option>)}
              </Select>

              <Input
                type="number"
                min="0"
                step="0.01"
                value={pos.einzelpreis}
                onChange={e => update(i, 'einzelpreis', e.target.value)}
                className="text-right"
                placeholder="0,00"
              />

              <div className="flex items-center justify-end h-9">
                <span className="text-sm font-medium text-slate-700">
                  {fmt(gesamt)} €
                </span>
              </div>

              <div className="flex items-center justify-center h-9">
                <button
                  onClick={() => remove(i)}
                  disabled={positionen.length === 1}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50
                    disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hinzufügen */}
      <button
        onClick={addRow}
        className="mt-3 flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 font-medium
          border-2 border-dashed border-indigo-200 rounded-xl w-full justify-center
          hover:border-indigo-400 hover:bg-indigo-50 transition-all"
      >
        <Plus size={16} />
        Position hinzufügen
      </button>

      {/* Summe */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
        <div className="text-sm text-slate-500">
          Netto gesamt:
          <span className="ml-3 font-semibold text-slate-800 text-base">
            {fmt(netto)} €
          </span>
        </div>
      </div>
    </div>
  );
}
