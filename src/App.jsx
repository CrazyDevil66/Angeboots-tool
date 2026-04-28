import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Building2, User, FileText, ClipboardList, Settings,
  Download, RotateCcw, ChevronDown, ChevronUp, Users,
  CheckCircle2, BookUser, Archive, Save
} from 'lucide-react';
import SectionCard from './components/SectionCard';
import FormField, { Input, Textarea } from './components/FormField';
import PositionenTabelle from './components/PositionenTabelle';
import PreviewPanel from './components/PreviewPanel';
import KundenVerwaltung from './components/KundenVerwaltung';
import AngebotArchiv from './components/AngebotArchiv';
import { generatePDF } from './lib/pdfGenerator';
import { defaultData } from './lib/defaultData';
import { loadFirma, saveFirma, saveAngebot, updateAngebot, loadAngebote } from './lib/storage';

function Collapse({ title, icon: Icon, children, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100
          bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={18} className="text-indigo-500" />}
          <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
          {badge}
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="p-6">{children}</div>}
    </div>
  );
}

function SavedBadge({ visible }) {
  return (
    <span className={`flex items-center gap-1 text-xs text-emerald-600 font-medium transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <CheckCircle2 size={13} />
      Gespeichert
    </span>
  );
}

export default function App() {
  const gespeicherteFirma = loadFirma();
  const [data, setData] = useState({
    ...defaultData,
    firma: gespeicherteFirma || defaultData.firma,
  });
  const [loading, setLoading] = useState(false);
  const [firmaSaved, setFirmaSaved] = useState(false);
  const [kundenModal, setKundenModal] = useState(false);
  const [archivModal, setArchivModal] = useState(false);
  const [aktivesAngebotId, setAktivesAngebotId] = useState(null);
  const [angebotSavedHint, setAngebotSavedHint] = useState(false);
  const savedTimer = useRef(null);
  const angebotTimer = useRef(null);
  const [archivCount, setArchivCount] = useState(() => loadAngebote().length);

  // Firmendaten auto-speichern
  useEffect(() => {
    saveFirma(data.firma);
    setFirmaSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setFirmaSaved(false), 2500);
    return () => clearTimeout(savedTimer.current);
  }, [data.firma]);

  const set = useCallback((path, value) => {
    setData(prev => {
      const parts = path.split('.');
      if (parts.length === 1) return { ...prev, [path]: value };
      if (parts.length === 2) return { ...prev, [parts[0]]: { ...prev[parts[0]], [parts[1]]: value } };
      return prev;
    });
  }, []);

  function handleKundeAuswahl(kunde) {
    setData(prev => ({
      ...prev,
      kunde: {
        firma: kunde.firma || '',
        name: kunde.name || '',
        strasse: kunde.strasse || '',
        plz: kunde.plz || '',
        ort: kunde.ort || '',
        email: kunde.email || '',
        telefon: kunde.telefon || '',
      },
    }));
  }

  function handleAngebotSpeichern() {
    if (aktivesAngebotId) {
      updateAngebot(aktivesAngebotId, data);
    } else {
      const eintrag = saveAngebot(data);
      setAktivesAngebotId(eintrag.id);
      setArchivCount(c => c + 1);
    }
    setAngebotSavedHint(true);
    if (angebotTimer.current) clearTimeout(angebotTimer.current);
    angebotTimer.current = setTimeout(() => setAngebotSavedHint(false), 2500);
  }

  function handleAngebotLaden(snapshot) {
    if (data.angebotNr && !confirm('Aktuelles Angebot verwerfen und das gespeicherte laden?')) return;
    setData({ ...snapshot, firma: data.firma });
    setAktivesAngebotId(null);
  }

  async function handleDownload() {
    setLoading(true);
    try {
      await generatePDF(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    if (confirm('Angebotsformular zurücksetzen? (Firmendaten & gespeicherte Kunden bleiben erhalten.)')) {
      setAktivesAngebotId(null);
      setData(prev => ({
        ...defaultData,
        firma: prev.firma,
      }));
    }
  }

  const kundeGesetzt = !!(data.kunde.firma || data.kunde.name);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      {/* Top-Bar */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-800">AngebotsTool</span>
              <span className="ml-2 text-xs text-slate-400 font-medium">by Objektrausch</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500 font-medium
                rounded-lg hover:bg-slate-100 transition-colors"
            >
              <RotateCcw size={15} />
              Zurücksetzen
            </button>

            {/* Archiv-Button */}
            <button
              onClick={() => setArchivModal(true)}
              className="relative flex items-center gap-2 px-4 py-2 text-sm text-slate-600 font-medium
                border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Archive size={15} />
              Archiv
              {archivCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-500 text-white text-[10px]
                  font-bold rounded-full flex items-center justify-center">
                  {archivCount > 99 ? '99+' : archivCount}
                </span>
              )}
            </button>

            {/* Speichern-Button */}
            <button
              onClick={handleAngebotSpeichern}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all
                ${angebotSavedHint
                  ? 'bg-emerald-500 text-white'
                  : aktivesAngebotId
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-slate-700 text-white hover:bg-slate-800'
                }`}
            >
              {angebotSavedHint ? <CheckCircle2 size={15} /> : <Save size={15} />}
              {angebotSavedHint ? 'Gespeichert!' : aktivesAngebotId ? 'Aktualisieren' : 'Speichern'}
            </button>

            <button
              onClick={handleDownload}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white
                bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60
                disabled:cursor-not-allowed transition-all shadow-sm shadow-indigo-200"
            >
              <Download size={15} />
              {loading ? 'Erstelle PDF…' : 'PDF exportieren'}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

          {/* Linke Spalte */}
          <div className="flex flex-col gap-5">

            {/* Angebots-Metadaten */}
            <Collapse title="Angebots-Informationen" icon={Settings}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField label="Angebotsnummer">
                  <Input value={data.angebotNr} onChange={e => set('angebotNr', e.target.value)} placeholder="A-2024-001" />
                </FormField>
                <FormField label="Datum">
                  <Input value={data.datum} onChange={e => set('datum', e.target.value)} placeholder="01.01.2024" />
                </FormField>
                <FormField label="Gültig bis">
                  <Input value={data.gueltigBis} onChange={e => set('gueltigBis', e.target.value)} placeholder="31.01.2024" />
                </FormField>
                <FormField label="MwSt.-Satz (%)">
                  <Input type="number" value={data.mwstSatz} onChange={e => set('mwstSatz', e.target.value)} placeholder="19" />
                </FormField>
              </div>
            </Collapse>

            {/* Firmendaten – zentral gespeichert */}
            <Collapse
              title="Ihre Firmendaten"
              icon={Building2}
              badge={<SavedBadge visible={firmaSaved} />}
            >
              <p className="text-xs text-slate-400 mb-4 -mt-1">
                Diese Daten werden automatisch gespeichert und in jedem neuen Angebot verwendet.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Firmenname" className="md:col-span-2">
                  <Input value={data.firma.name} onChange={e => set('firma.name', e.target.value)} placeholder="Muster GmbH" />
                </FormField>
                <FormField label="Straße">
                  <Input value={data.firma.strasse} onChange={e => set('firma.strasse', e.target.value)} placeholder="Musterstraße 1" />
                </FormField>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <FormField label="PLZ">
                    <Input value={data.firma.plz} onChange={e => set('firma.plz', e.target.value)} placeholder="12345" />
                  </FormField>
                  <FormField label="Ort">
                    <Input value={data.firma.ort} onChange={e => set('firma.ort', e.target.value)} placeholder="Berlin" />
                  </FormField>
                </div>
                <FormField label="Telefon">
                  <Input value={data.firma.telefon} onChange={e => set('firma.telefon', e.target.value)} placeholder="+49 30 123456" />
                </FormField>
                <FormField label="E-Mail">
                  <Input type="email" value={data.firma.email} onChange={e => set('firma.email', e.target.value)} placeholder="info@firma.de" />
                </FormField>
                <FormField label="Website">
                  <Input value={data.firma.web} onChange={e => set('firma.web', e.target.value)} placeholder="www.firma.de" />
                </FormField>
                <FormField label="USt-ID">
                  <Input value={data.firma.ustId} onChange={e => set('firma.ustId', e.target.value)} placeholder="DE123456789" />
                </FormField>
              </div>
            </Collapse>

            {/* Kundendaten */}
            <Collapse
              title="Kundendaten"
              icon={User}
              badge={
                kundeGesetzt ? (
                  <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">
                    {data.kunde.firma || data.kunde.name}
                  </span>
                ) : null
              }
            >
              {/* Kunden-Aktionsleiste */}
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                <button
                  onClick={() => setKundenModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600
                    border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 hover:border-indigo-400
                    transition-all"
                >
                  <BookUser size={15} />
                  Kunde aus Adressbuch
                </button>
                <button
                  onClick={() => setKundenModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500
                    border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                >
                  <Users size={15} />
                  Kundenverwaltung
                </button>
                {kundeGesetzt && (
                  <button
                    onClick={() => setData(prev => ({ ...prev, kunde: defaultData.kunde }))}
                    className="ml-auto text-xs text-slate-400 hover:text-red-400 transition-colors"
                  >
                    Leeren
                  </button>
                )}
              </div>

              {/* Felder */}
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
                <div className="grid grid-cols-[120px_1fr] gap-3">
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
                  <Input value={data.betreff} onChange={e => set('betreff', e.target.value)} placeholder="Angebot für Umbaumaßnahmen – Projekt Muster" />
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
                <Textarea value={data.hinweise} onChange={e => set('hinweise', e.target.value)} rows={4} placeholder="Zahlungsziel: 14 Tage netto..." />
              </FormField>
            </Collapse>

          </div>

          {/* Rechte Spalte: Vorschau */}
          <div>
            <PreviewPanel data={data} />
          </div>

        </div>
      </main>

      {/* Kunden-Modal */}
      {kundenModal && (
        <KundenVerwaltung
          onSelect={handleKundeAuswahl}
          onClose={() => setKundenModal(false)}
        />
      )}

      {/* Archiv-Modal */}
      {archivModal && (
        <AngebotArchiv
          onLoad={handleAngebotLaden}
          onClose={() => { setArchivModal(false); setArchivCount(loadAngebote().length); }}
        />
      )}
    </div>
  );
}
