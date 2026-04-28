import { useMemo } from 'react';
import { TrendingUp, FileText, CheckCircle2, Users, Plus, ArrowRight } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { loadAngebote, loadKunden } from '../lib/storage';

function fmt(num) {
  return Number(num || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function KpiCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 leading-none mb-1">{value}</div>
        <div className="text-sm font-medium text-slate-600">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function Dashboard({ navigate }) {
  const angebote = loadAngebote();
  const kunden = loadKunden();

  const stats = useMemo(() => {
    const angenommen = angebote.filter(a => (a.status || 'entwurf') === 'angenommen');
    const abgelehnt  = angebote.filter(a => (a.status || 'entwurf') === 'abgelehnt');
    const offen      = angebote.filter(a => ['entwurf', 'gesendet'].includes(a.status || 'entwurf'));
    const umsatz     = angenommen.reduce((s, a) => s + a.brutto, 0);
    const entschieden = angenommen.length + abgelehnt.length;
    const quote = entschieden > 0 ? Math.round((angenommen.length / entschieden) * 100) : 0;
    return { umsatz, offen: offen.length, quote, kundenzahl: kunden.length };
  }, [angebote, kunden]);

  const letzte = angebote.slice(0, 5);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">Willkommen zurück</p>
        </div>
        <button
          onClick={() => navigate('angebot-editor')}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
        >
          <Plus size={16} />
          Neues Angebot
        </button>
      </div>

      {/* KPI-Kacheln */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Gesamtumsatz"    value={`${fmt(stats.umsatz)} €`} sub="Angenommene Angebote" icon={TrendingUp}   color="bg-indigo-500" />
        <KpiCard label="Offene Angebote" value={stats.offen}              sub="Entwurf + Gesendet"   icon={FileText}     color="bg-amber-500"  />
        <KpiCard label="Erfolgsquote"    value={`${stats.quote} %`}       sub="Angenommen / Entschieden" icon={CheckCircle2} color="bg-emerald-500" />
        <KpiCard label="Kunden"          value={stats.kundenzahl}         sub="Im Adressbuch"        icon={Users}        color="bg-slate-600"  />
      </div>

      {/* Letzte Angebote */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Letzte Angebote</h2>
          <button
            onClick={() => navigate('angebote')}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            Alle anzeigen <ArrowRight size={14} />
          </button>
        </div>

        {letzte.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileText size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium text-slate-500 mb-3">Noch keine Angebote gespeichert</p>
            <button
              onClick={() => navigate('angebot-editor')}
              className="text-sm text-indigo-600 hover:underline"
            >
              Erstes Angebot erstellen
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Nummer', 'Kunde', 'Betreff', 'Betrag', 'Status'].map(h => (
                  <th key={h} className={`px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${h === 'Betrag' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {letzte.map(a => (
                <tr
                  key={a.id}
                  onClick={() => navigate('angebot-editor', { angebotId: a.id })}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800">{a.angebotNr}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{a.kundeDisplay || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 max-w-[200px] truncate">{a.betreff || <span className="italic text-slate-300">Kein Betreff</span>}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800 text-right">{fmt(a.brutto)} €</td>
                  <td className="px-6 py-4"><StatusBadge status={a.status || 'entwurf'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
