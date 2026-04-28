import { useState } from 'react';
import { X, Plus, Pencil, Trash2, UserCheck, Search, Users } from 'lucide-react';
import FormField, { Input } from './FormField';
import { loadKunden, saveKunden } from '../lib/storage';

const leerKunde = { id: null, firma: '', name: '', strasse: '', plz: '', ort: '', email: '', telefon: '' };

function KundeForm({ initial, onSave, onCancel }) {
  const [k, setK] = useState(initial);
  const set = (f, v) => setK(prev => ({ ...prev, [f]: v }));

  function handleSave() {
    if (!k.firma && !k.name) return;
    onSave({ ...k, id: k.id || crypto.randomUUID() });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Firmenname">
          <Input value={k.firma} onChange={e => set('firma', e.target.value)} placeholder="Kunden GmbH" autoFocus />
        </FormField>
        <FormField label="Ansprechpartner">
          <Input value={k.name} onChange={e => set('name', e.target.value)} placeholder="Max Mustermann" />
        </FormField>
        <FormField label="Straße">
          <Input value={k.strasse} onChange={e => set('strasse', e.target.value)} placeholder="Musterstraße 1" />
        </FormField>
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <FormField label="PLZ">
            <Input value={k.plz} onChange={e => set('plz', e.target.value)} placeholder="12345" />
          </FormField>
          <FormField label="Ort">
            <Input value={k.ort} onChange={e => set('ort', e.target.value)} placeholder="Berlin" />
          </FormField>
        </div>
        <FormField label="E-Mail">
          <Input type="email" value={k.email} onChange={e => set('email', e.target.value)} placeholder="info@kunde.de" />
        </FormField>
        <FormField label="Telefon">
          <Input value={k.telefon} onChange={e => set('telefon', e.target.value)} placeholder="+49 30 123456" />
        </FormField>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-500 font-medium rounded-lg hover:bg-slate-100 transition-colors"
        >
          Abbrechen
        </button>
        <button
          onClick={handleSave}
          disabled={!k.firma && !k.name}
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white
            bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40
            disabled:cursor-not-allowed transition-colors"
        >
          <UserCheck size={15} />
          Speichern
        </button>
      </div>
    </div>
  );
}

export default function KundenVerwaltung({ onSelect, onClose }) {
  const [kunden, setKunden] = useState(loadKunden);
  const [suche, setSuche] = useState('');
  const [editKunde, setEditKunde] = useState(null);
  const [neuAnlegen, setNeuAnlegen] = useState(false);

  const gefiltert = kunden.filter(k => {
    const q = suche.toLowerCase();
    return (k.firma + k.name + k.ort + k.email).toLowerCase().includes(q);
  });

  function handleSave(k) {
    const aktuell = kunden.some(c => c.id === k.id)
      ? kunden.map(c => c.id === k.id ? k : c)
      : [...kunden, k];
    setKunden(aktuell);
    saveKunden(aktuell);
    setEditKunde(null);
    setNeuAnlegen(false);
  }

  function handleDelete(id) {
    if (!confirm('Kunden wirklich löschen?')) return;
    const aktuell = kunden.filter(c => c.id !== id);
    setKunden(aktuell);
    saveKunden(aktuell);
  }

  const showForm = neuAnlegen || editKunde;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users size={16} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 text-base">
                {showForm ? (editKunde ? 'Kunde bearbeiten' : 'Neuer Kunde') : 'Kundenverwaltung'}
              </h2>
              {!showForm && (
                <p className="text-xs text-slate-400">{kunden.length} Kunden gespeichert</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {showForm ? (
            <KundeForm
              initial={editKunde || leerKunde}
              onSave={handleSave}
              onCancel={() => { setEditKunde(null); setNeuAnlegen(false); }}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {/* Such- & Neu-Zeile */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm
                      focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="Suche nach Name, Firma, Ort…"
                    value={suche}
                    onChange={e => setSuche(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setNeuAnlegen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white
                    bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0"
                >
                  <Plus size={15} />
                  Neu anlegen
                </button>
              </div>

              {/* Kundenliste */}
              {gefiltert.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Users size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-slate-500">
                    {suche ? 'Kein Kunde gefunden' : 'Noch keine Kunden gespeichert'}
                  </p>
                  <p className="text-sm mt-1">
                    {!suche && 'Leg deinen ersten Kunden an.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {gefiltert.map(k => (
                    <div
                      key={k.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-100
                        hover:border-indigo-200 hover:bg-indigo-50/40 transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 text-sm truncate">
                          {k.firma || k.name}
                        </div>
                        {k.firma && k.name && (
                          <div className="text-xs text-slate-400 truncate">{k.name}</div>
                        )}
                        <div className="text-xs text-slate-400 mt-0.5 truncate">
                          {[k.strasse, k.plz && `${k.plz} ${k.ort}`].filter(Boolean).join(' · ')}
                          {k.email && ` · ${k.email}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 ml-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditKunde(k)}
                          className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                          title="Bearbeiten"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(k.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => { onSelect(k); onClose(); }}
                        className="ml-3 flex-shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs font-semibold
                          text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-600 hover:text-white
                          hover:border-indigo-600 transition-all"
                      >
                        <UserCheck size={13} />
                        Auswählen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
