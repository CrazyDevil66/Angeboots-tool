import { useState, useMemo } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, UserCheck, Users,
  TrendingUp, FileText, ChevronRight, FolderOpen
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import FormField, { Input } from '../components/FormField';
import { loadKunden, saveKunden, loadAngebote } from '../lib/storage';

const leerKunde = { id: null, anrede: '', firma: '', name: '', strasse: '', plz: '', ort: '', email: '', telefon: '' };

function fmt(num) {
  return Number(num || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function KundeForm({ initial, onSave, onCancel }) {
  const [k, setK] = useState(initial);
  const set = (f, v) => setK(prev => ({ ...prev, [f]: v }));
  const valid = !!(k.firma || k.name);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Firma">
          <Input value={k.firma} onChange={e => set('firma', e.target.value)} placeholder="Kunden GmbH" autoFocus />
        </FormField>
        <FormField label="Anrede">
          <div className="flex gap-1 flex-wrap">
            {['', 'Herr', 'Frau', 'Divers'].map(a => (
              <button
                key={a}
                type="button"
                onClick={() => set('anrede', a)}
                className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                  k.anrede === a
                    ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {a || '—'}
              </button>
            ))}
          </div>
        </FormField>
        <FormField label="Ansprechpartner">
          <Input value={k.name} onChange={e => set('name', e.target.value)} placeholder="Max Mustermann" />
        </FormField>
        <FormField label="Straße">
          <Input value={k.strasse} onChange={e => set('strasse', e.target.value)} placeholder="Musterstraße 1" />
        </FormField>
        <div className="grid grid-cols-[80px_1fr] gap-2">
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
      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
          Abbrechen
        </button>
        <button
          onClick={() => onSave({ ...k, id: k.id || crypto.randomUUID(), createdAt: k.createdAt || new Date().toISOString() })}
          disabled={!valid}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          <UserCheck size={14} />
          Speichern
        </button>
      </div>
    </div>
  );
}

function KundeDrawer({ kunde, angebote, onEdit, onDelete, onClose, onNeuesAngebot }) {
  const stats = useMemo(() => {
    const angenommen = angebote.filter(a => a.status === 'angenommen');
    const abgelehnt  = angebote.filter(a => a.status === 'abgelehnt');
    const umsatz     = angenommen.reduce((s, a) => s + a.brutto, 0);
    const entschieden = angenommen.length + abgelehnt.length;
    const quote = entschieden > 0 ? Math.round((angenommen.length / entschieden) * 100) : 0;
    return { umsatz, total: angebote.length, quote };
  }, [angebote]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
        <div>
          <div className="font-bold text-slate-900 text-base leading-tight">{kunde.firma || kunde.name}</div>
          {kunde.firma && kunde.name && <div className="text-xs text-slate-500">{kunde.name}</div>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Kontakt */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Kontakt</span>
            <button onClick={onEdit} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              <Pencil size={11} /> Bearbeiten
            </button>
          </div>
          {kunde.strasse && <p className="text-sm text-slate-600 mb-0.5">{kunde.strasse}</p>}
          {kunde.ort && <p className="text-sm text-slate-600 mb-0.5">{kunde.plz} {kunde.ort}</p>}
          {kunde.email && (
            <a href={`mailto:${kunde.email}`} className="text-sm text-indigo-600 hover:underline block mb-0.5">{kunde.email}</a>
          )}
          {kunde.telefon && <p className="text-sm text-slate-600">{kunde.telefon}</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 p-5 border-b border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-slate-900">{stats.total}</div>
            <div className="text-xs text-slate-400 mt-0.5">Angebote</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-emerald-700">{fmt(stats.umsatz)} €</div>
            <div className="text-xs text-slate-400 mt-0.5">Umsatz</div>
          </div>
          <div className="bg-indigo-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-indigo-700">{stats.quote} %</div>
            <div className="text-xs text-slate-400 mt-0.5">Quote</div>
          </div>
        </div>

        {/* Angebote */}
        <div className="p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Angebots-Verlauf</div>
          {angebote.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Noch keine Angebote</p>
          ) : (
            <div className="flex flex-col gap-2">
              {angebote.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-indigo-50/50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800">{a.angebotNr}</div>
                    <div className="text-xs text-slate-400 truncate">{a.betreff || 'Kein Betreff'}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <StatusBadge status={a.status || 'entwurf'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="p-4 border-t border-slate-100 flex-shrink-0 flex flex-col gap-2">
        <button
          onClick={onNeuesAngebot}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus size={15} />
          Neues Angebot für diesen Kunden
        </button>
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <Trash2 size={13} />
          Kunden löschen
        </button>
      </div>
    </div>
  );
}

export default function KundenListe({ navigate, onRefresh }) {
  const [kunden, setKunden] = useState(loadKunden);
  const [suche, setSuche] = useState('');
  const [selected, setSelected] = useState(null);
  const [drawerMode, setDrawerMode] = useState('view');
  const angebote = loadAngebote();

  const gefiltert = useMemo(() => {
    const q = suche.toLowerCase();
    return kunden.filter(k => !q || (k.firma + k.name + k.ort + k.email).toLowerCase().includes(q));
  }, [kunden, suche]);

  function kundeAngebote(k) {
    return angebote.filter(a => (k.id && a.kundeId === k.id) || a.kundeDisplay === (k.firma || k.name));
  }

  function kundeStats(k) {
    const ka = kundeAngebote(k);
    const umsatz = ka.filter(a => a.status === 'angenommen').reduce((s, a) => s + a.brutto, 0);
    return { anzahl: ka.length, umsatz };
  }

  function handleSave(k) {
    const aktuell = kunden.some(c => c.id === k.id)
      ? kunden.map(c => c.id === k.id ? k : c)
      : [...kunden, k];
    setKunden(aktuell);
    saveKunden(aktuell);
    setSelected(k);
    setDrawerMode('view');
    onRefresh?.();
  }

  function handleDelete(k) {
    if (!confirm(`Kunden "${k.firma || k.name}" löschen? Angebote bleiben erhalten.`)) return;
    const aktuell = kunden.filter(c => c.id !== k.id);
    setKunden(aktuell);
    saveKunden(aktuell);
    setSelected(null);
    onRefresh?.();
  }

  return (
    <div className="flex h-full min-h-screen">
      {/* Hauptbereich */}
      <div className={`flex-1 p-8 transition-all ${selected ? 'mr-0' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Kunden</h1>
            <p className="text-slate-500 mt-1 text-sm">{kunden.length} Kunden im Adressbuch</p>
          </div>
          <button
            onClick={() => { setSelected(null); setDrawerMode('new'); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
          >
            <Plus size={16} />
            Neuer Kunde
          </button>
        </div>

        {/* Suche */}
        <div className="relative mb-4 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
            placeholder="Suche nach Firma, Name, Ort…"
            value={suche}
            onChange={e => setSuche(e.target.value)}
          />
        </div>

        {/* Tabelle */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {gefiltert.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users size={44} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium text-slate-500">
                {suche ? 'Kein Kunde gefunden' : 'Noch keine Kunden gespeichert'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Name / Firma', 'Ort', 'E-Mail', 'Angebote', 'Umsatz', ''].map((h, i) => (
                    <th key={i} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left ${h === 'Umsatz' ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {gefiltert.map(k => {
                  const stats = kundeStats(k);
                  const isActive = selected?.id === k.id;
                  return (
                    <tr
                      key={k.id}
                      onClick={() => { setSelected(k); setDrawerMode('view'); }}
                      className={`cursor-pointer transition-colors group ${isActive ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800 text-sm">{k.firma || k.name}</div>
                        {k.firma && k.name && <div className="text-xs text-slate-400">{k.name}</div>}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500">{k.ort ? `${k.plz} ${k.ort}` : '—'}</td>
                      <td className="px-4 py-4 text-sm">
                        {k.email
                          ? <a href={`mailto:${k.email}`} onClick={e => e.stopPropagation()} className="text-indigo-600 hover:underline">{k.email}</a>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{stats.anzahl}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-800 text-right">{stats.umsatz > 0 ? `${fmt(stats.umsatz)} €` : '—'}</td>
                      <td className="px-4 py-4">
                        <ChevronRight size={16} className={`transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-200 group-hover:text-slate-400'}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Drawer */}
      {(selected || drawerMode === 'new') && (
        <div className="w-96 border-l border-slate-200 bg-white flex-shrink-0 flex flex-col shadow-xl">
          {drawerMode === 'view' && selected ? (
            <KundeDrawer
              kunde={selected}
              angebote={kundeAngebote(selected)}
              onEdit={() => setDrawerMode('edit')}
              onDelete={() => handleDelete(selected)}
              onClose={() => { setSelected(null); setDrawerMode('view'); }}
              onNeuesAngebot={() => navigate('angebot-editor', { prefillKunde: selected })}
            />
          ) : (
            <>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
                <h3 className="font-bold text-slate-900 text-base">
                  {drawerMode === 'new' ? 'Neuer Kunde' : 'Kunde bearbeiten'}
                </h3>
                <button
                  onClick={() => { if (drawerMode === 'new') setSelected(null); setDrawerMode('view'); }}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <KundeForm
                  initial={drawerMode === 'edit' ? selected : leerKunde}
                  onSave={handleSave}
                  onCancel={() => {
                    if (drawerMode === 'new') { setSelected(null); setDrawerMode('view'); }
                    else setDrawerMode('view');
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
