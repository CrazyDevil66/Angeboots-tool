import { useState, useCallback, useRef } from 'react';
import {
  ChevronRight, FileText, ClipboardList, User, Settings,
  Download, Save, CheckCircle2, ChevronDown, ChevronUp, RotateCcw
} from 'lucide-react';
import SectionCard from '../components/SectionCard';
import FormField, { Input, Textarea } from '../components/FormField';
import PositionenTabelle from '../components/PositionenTabelle';
import PreviewPanel from '../components/PreviewPanel';
import StatusDropdown from '../components/StatusDropdown';
import KundenPicker from '../components/KundenPicker';
import { generatePDF } from '../lib/pdfGenerator';
import { defaultData } from '../lib/defaultData';
import {
  loadFirma, loadAngebote, saveAngebot, updateAngebot, setAngebotStatus
} from '../lib/storage';

function Collapse({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={18} className="text-indigo-500" />}
          <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="p-6">{children}</div>}
    </div>
  );
}

function initData(params) {
  const firma = loadFirma() || defaultData.firma;

  if (params?.angebotId) {
    const gespeichert = loadAngebote().find(a => a.id === params.angebotId);
    if (gespeichert) return { ...gespeichert.snapshot, firma };
  }

  const base = { ...defaultData, firma };

  if (params?.prefillKunde) {
    const k = params.prefillKunde;
    base.kunde = {
      id: k.id || null,
      firma: k.firma || '',
      name: k.name || '',
      strasse: k.strasse || '',
      plz: k.plz || '',
      ort: k.ort || '',
      email: k.email || '',
      telefon: k.telefon || '',
    };
  }

  return base;
}

export default function AngebotEditor({ navigate, params = {}, onRefresh }) {
  const [data, setData] = useState(() => initData(params));
  const [aktivesId, setAktivesId] = useState(params?.angebotId || null);
  const [status, setStatus] = useState(() => {
    if (params?.angebotId) {
      const a = loadAngebote().find(x => x.id === params.angebotId);
      return a?.status || 'entwurf';
    }
    return 'entwurf';
  });
  const [pdfLoading, setPdfLoading] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const savedTimer = useRef(null);

  const set = useCallback((path, value) => {
    setData(prev => {
      const parts = path.split('.');
      if (parts.length === 1) return { ...prev, [path]: value };
      if (parts.length === 2) return { ...prev, [parts[0]]: { ...prev[parts[0]], [parts[1]]: value } };
      return prev;
    });
  }, []);

  function handleSpeichern() {
    if (aktivesId) {
      updateAngebot(aktivesId, data);
      setAngebotStatus(aktivesId, status);
    } else {
      const eintrag = saveAngebot(data);
      setAktivesId(eintrag.id);
      setAngebotStatus(eintrag.id, status);
      onRefresh?.();
    }
    setSavedHint(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedHint(false), 2500);
  }

  function handleStatusChange(neuerStatus) {
    setStatus(neuerStatus);
    if (aktivesId) setAngebotStatus(aktivesId, neuerStatus);
  }

  async function handlePDF() {
    setPdfLoading(true);
    try { await generatePDF(data); }
    catch (e) { console.error(e); }
    finally { setPdfLoading(false); }
  }

  function handleKundeAuswahl(k) {
    setData(prev => ({
      ...prev,
      kunde: {
        id: k.id || null,
        firma: k.firma || '',
        name: k.name || '',
        strasse: k.strasse || '',
        plz: k.plz || '',
        ort: k.ort || '',
        email: k.email || '',
        telefon: k.telefon || '',
      },
    }));
  }

  function handleReset() {
    if (confirm('Eingaben zurücksetzen?')) {
      setData({ ...defaultData, firma: loadFirma() || defaultData.firma });
      setAktivesId(null);
      setStatus('entwurf');
    }
  }

  const isNeu = !aktivesId;
  const betreffLabel = data.angebotNr || 'Neues Angebot';

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-indigo-50/20">
      {/* Topbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-8 h-14 flex items-center justify-between gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate('angebote')} className="text-slate-400 hover:text-indigo-600 font-medium transition-colors">
              Angebote
            </button>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="font-semibold text-slate-800">{betreffLabel}</span>
          </div>

          {/* Aktionen */}
          <div className="flex items-center gap-3">
            <StatusDropdown status={status} onChange={handleStatusChange} />

            <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
              <RotateCcw size={14} />
              Zurücksetzen
            </button>

            <button
              onClick={handleSpeichern}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all
                ${savedHint
                  ? 'bg-emerald-500 text-white'
                  : isNeu ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
            >
              {savedHint ? <CheckCircle2 size={14} /> : <Save size={14} />}
              {savedHint ? 'Gespeichert!' : isNeu ? 'Speichern' : 'Aktualisieren'}
            </button>

            <button
              onClick={handlePDF}
              disabled={pdfLoading}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-all"
            >
              <Download size={14} />
              {pdfLoading ? 'Erstelle…' : 'PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="flex flex-col gap-5">

            {/* Angebots-Infos */}
            <Collapse title="Angebots-Informationen" icon={Settings}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField label="Angebotsnummer">
                  <Input value={data.angebotNr} onChange={e => set('angebotNr', e.target.value)} placeholder="A-2024-001" />
                </FormField>
                <FormField label="Datum">
                  <Input value={data.datum} onChange={e => set('datum', e.target.value)} />
                </FormField>
                <FormField label="Gültig bis">
                  <Input value={data.gueltigBis} onChange={e => set('gueltigBis', e.target.value)} placeholder="31.01.2024" />
                </FormField>
                <FormField label="MwSt. (%)">
                  <Input type="number" value={data.mwstSatz} onChange={e => set('mwstSatz', e.target.value)} />
                </FormField>
              </div>
            </Collapse>

            {/* Firmendaten (read-only) */}
            <Collapse title="Ihre Firmendaten" icon={Settings} defaultOpen={false}>
              <p className="text-xs text-slate-400 mb-4 -mt-1 flex items-center gap-1">
                Gespeicherte Firmendaten aus
                <button onClick={() => navigate('einstellungen')} className="text-indigo-600 hover:underline font-medium">
                  Einstellungen
                </button>
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Firma', data.firma.name],
                  ['Straße', data.firma.strasse],
                  ['PLZ / Ort', `${data.firma.plz} ${data.firma.ort}`],
                  ['Telefon', data.firma.telefon],
                  ['E-Mail', data.firma.email],
                  ['USt-ID', data.firma.ustId],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">{label}</div>
                    <div className="text-slate-700 font-medium">{value || <span className="text-slate-300 italic">Nicht gesetzt</span>}</div>
                  </div>
                ))}
              </div>
            </Collapse>

            {/* Kundendaten */}
            <Collapse title="Kundendaten" icon={User}>
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                <KundenPicker
                  onSelect={handleKundeAuswahl}
                  onManage={() => navigate('kunden')}
                />
                {(data.kunde.firma || data.kunde.name) && (
                  <button
                    onClick={() => setData(prev => ({ ...prev, kunde: defaultData.kunde }))}
                    className="text-xs text-slate-400 hover:text-red-400 transition-colors ml-auto"
                  >
                    Leeren
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Firmenname (optional)">
                  <Input value={data.kunde.firma} onChange={e => set('kunde.firma', e.target.value)} placeholder="Kunden GmbH" />
                </FormField>
                <FormField label="Ansprechpartner">
                  <Input value={data.kunde.name} onChange={e => set('kunde.name', e.target.value)} placeholder="Max Mustermann" />
                </FormField>
                <FormField label="Straße">
                  <Input value={data.kunde.strasse} onChange={e => set('kunde.strasse', e.target.value)} placeholder="Kundenstraße 5" />
                </FormField>
                <div className="grid grid-cols-[110px_1fr] gap-3">
                  <FormField label="PLZ">
                    <Input value={data.kunde.plz} onChange={e => set('kunde.plz', e.target.value)} placeholder="10115" />
                  </FormField>
                  <FormField label="Ort">
                    <Input value={data.kunde.ort} onChange={e => set('kunde.ort', e.target.value)} placeholder="Berlin" />
                  </FormField>
                </div>
                <FormField label="E-Mail">
                  <Input type="email" value={data.kunde.email} onChange={e => set('kunde.email', e.target.value)} placeholder="kunde@beispiel.de" />
                </FormField>
                <FormField label="Telefon">
                  <Input value={data.kunde.telefon} onChange={e => set('kunde.telefon', e.target.value)} placeholder="+49 30 654321" />
                </FormField>
              </div>
            </Collapse>

            {/* Anschreiben */}
            <Collapse title="Anschreiben" icon={FileText}>
              <div className="flex flex-col gap-4">
                <FormField label="Betreff">
                  <Input value={data.betreff} onChange={e => set('betreff', e.target.value)} placeholder="Angebot für Umbaumaßnahmen" />
                </FormField>
                <FormField label="Einleitungstext">
                  <Textarea value={data.einleitung} onChange={e => set('einleitung', e.target.value)} rows={3} />
                </FormField>
              </div>
            </Collapse>

            {/* Positionen */}
            <SectionCard title="Positionen" icon={ClipboardList}>
              <PositionenTabelle
                positionen={data.positionen}
                onChange={p => setData(d => ({ ...d, positionen: p }))}
              />
            </SectionCard>

            {/* Hinweise */}
            <Collapse title="Hinweise & Zahlungsbedingungen" icon={FileText} defaultOpen={false}>
              <FormField label="Hinweistext">
                <Textarea value={data.hinweise} onChange={e => set('hinweise', e.target.value)} rows={4} placeholder="Zahlungsziel: 14 Tage netto…" />
              </FormField>
            </Collapse>
          </div>

          {/* Vorschau */}
          <div><PreviewPanel data={data} /></div>
        </div>
      </div>
    </div>
  );
}
