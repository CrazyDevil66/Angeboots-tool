import { useState, useCallback, useRef } from 'react';
import {
  ChevronRight, FileText, ClipboardList, User, Settings,
  Download, Save, CheckCircle2, ChevronDown, ChevronUp, RotateCcw, Receipt, Mail,
  AlertTriangle, Banknote, BookOpen
} from 'lucide-react';
import SectionCard from '../components/SectionCard';
import FormField, { Input, Textarea } from '../components/FormField';
import DateInput, { add14Days } from '../components/DateInput';
import PositionenTabelle from '../components/PositionenTabelle';
import PreviewPanel from '../components/PreviewPanel';
import StatusDropdown from '../components/StatusDropdown';
import KundenPicker from '../components/KundenPicker';
import RechnungModal from '../components/RechnungModal';
import MahnungModal from '../components/MahnungModal';
import KatalogPicker from '../components/KatalogPicker';
import { generatePDF } from '../lib/pdfGenerator';
import { defaultData } from '../lib/defaultData';
import {
  loadFirma, loadAngebote, saveAngebot, updateAngebot, setAngebotStatus,
  setAngebotRechnung, setMahnung, setBezahlt, nextAngebotNr, loadKatalog
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

  const datum = new Date().toLocaleDateString('de-DE');
  const base = {
    ...defaultData,
    angebotNr: nextAngebotNr(),
    datum,
    gueltigBis: add14Days(datum),
    betreff: 'Angebot',
    firma,
    hinweise: firma.hinweiseAngebot ?? defaultData.firma.hinweiseAngebot,
  };

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
  const [rechnungsNr, setRechnungsNr] = useState(() => {
    if (params?.angebotId) {
      const a = loadAngebote().find(x => x.id === params.angebotId);
      return a?.rechnungsNr || null;
    }
    return null;
  });
  const [rechnungsDatum, setRechnungsDatum] = useState(() => {
    if (params?.angebotId) {
      const a = loadAngebote().find(x => x.id === params.angebotId);
      return a?.rechnungsDatum || null;
    }
    return null;
  });
  const [rechnungsBetreff, setRechnungsBetreff]       = useState(() => {
    if (params?.angebotId) {
      const a = loadAngebote().find(x => x.id === params.angebotId);
      return a?.rechnungsBetreff || null;
    }
    return null;
  });
  const [rechnungsEinleitung, setRechnungsEinleitung] = useState(() => {
    if (params?.angebotId) {
      const a = loadAngebote().find(x => x.id === params.angebotId);
      return a?.rechnungsEinleitung || null;
    }
    return null;
  });
  const [rechnungsHinweise, setRechnungsHinweise]     = useState(() => {
    if (params?.angebotId) {
      const a = loadAngebote().find(x => x.id === params.angebotId);
      return a?.rechnungsHinweise || null;
    }
    return null;
  });
  const [mahnStufe, setMahnStufe] = useState(() => {
    if (params?.angebotId) {
      const a = loadAngebote().find(x => x.id === params.angebotId);
      return a?.mahnStufe || 0;
    }
    return 0;
  });
  const [mahnGebuehren, setMahnGebuehren] = useState(() => {
    if (params?.angebotId) {
      const a = loadAngebote().find(x => x.id === params.angebotId);
      return a?.mahnGebuehren || [];
    }
    return [];
  });
  const [pdfLoading, setPdfLoading] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const [rechnungModalOffen, setRechnungModalOffen] = useState(false);
  const [mahnModalOffen,    setMahnModalOffen]    = useState(false);
  const [katalogPickerOffen, setKatalogPickerOffen] = useState(false);
  const savedTimer = useRef(null);

  const set = useCallback((path, value) => {
    setData(prev => {
      const parts = path.split('.');
      if (parts.length === 1) return { ...prev, [path]: value };
      if (parts.length === 2) return { ...prev, [parts[0]]: { ...prev[parts[0]], [parts[1]]: value } };
      return prev;
    });
  }, []);

  function handleDatumChange(val) {
    setData(prev => ({ ...prev, datum: val, gueltigBis: add14Days(val) }));
  }

  function genEinleitung(anrede, name, template) {
    let ansprache;
    if (anrede === 'Herr')  ansprache = `Sehr geehrter Herr ${name || ''},`;
    else if (anrede === 'Frau') ansprache = `Sehr geehrte Frau ${name || ''},`;
    else ansprache = 'Sehr geehrte Damen und Herren,';
    return `${ansprache}\n\n${template}`;
  }

  function handleAnredeChange(anrede) {
    setData(prev => ({
      ...prev,
      kunde: { ...prev.kunde, anrede },
      einleitung: genEinleitung(anrede, prev.kunde.name, prev.firma.einleitungAngebot ?? defaultData.firma.einleitungAngebot),
    }));
  }

  function handleKundeNameChange(name) {
    setData(prev => ({
      ...prev,
      kunde: { ...prev.kunde, name },
      einleitung: genEinleitung(prev.kunde.anrede, name, prev.firma.einleitungAngebot ?? defaultData.firma.einleitungAngebot),
    }));
  }

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
    try { await generatePDF(data, 'angebot'); }
    catch (e) { console.error(e); }
    finally { setPdfLoading(false); }
  }

  async function handleRechnungPDF() {
    setPdfLoading(true);
    try {
      await generatePDF({
        ...data,
        rechnungsNr,
        rechnungsDatum,
        betreff:    rechnungsBetreff    ?? data.betreff,
        einleitung: rechnungsEinleitung ?? data.einleitung,
        hinweise:   rechnungsHinweise   ?? data.hinweise,
      }, 'rechnung');
    } catch (e) { console.error(e); }
    finally { setPdfLoading(false); }
  }

  function handleMailSenden() {
    const k  = data.kunde;
    const f  = data.firma;
    const to = k.email || '';

    const ansprache = k.anrede === 'Herr'
      ? `Sehr geehrter Herr ${k.name || ''},`
      : k.anrede === 'Frau'
        ? `Sehr geehrte Frau ${k.name || ''},`
        : 'Sehr geehrte Damen und Herren,';

    const subject = encodeURIComponent(
      `${data.betreff || 'Angebot'} ${data.angebotNr || ''}${k.firma || k.name ? ' – ' + (k.firma || k.name) : ''}`
    );

    const body = encodeURIComponent(
      `${ansprache}\n\n` +
      `im Anhang erhalten Sie unser ${data.betreff || 'Angebot'} Nr. ${data.angebotNr || ''} vom ${data.datum || ''}.\n\n` +
      (data.hinweise ? `${data.hinweise}\n\n` : '') +
      `Mit freundlichen Grüßen\n${f.name || ''}` +
      (f.telefon ? `\nTel.: ${f.telefon}` : '') +
      (f.email   ? `\nMail: ${f.email}`   : '')
    );

    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  }

  async function handleRechnungBestaetigt({ rechnungsNr: nr, datum: rDatum, betreff: rBetreff, einleitung: rEinleitung, hinweise: rHinweise }) {
    setRechnungModalOffen(false);
    setRechnungsNr(nr);
    setRechnungsDatum(rDatum);
    setRechnungsBetreff(rBetreff);
    setRechnungsEinleitung(rEinleitung);
    setRechnungsHinweise(rHinweise);

    let id = aktivesId;
    if (!id) {
      const eintrag = saveAngebot(data);
      id = eintrag.id;
      setAktivesId(id);
      onRefresh?.();
    }
    setAngebotStatus(id, 'angenommen');
    setAngebotRechnung(id, nr, rDatum, rBetreff, rEinleitung, rHinweise);
    setStatus('angenommen');

    const rechnungData = {
      ...data,
      rechnungsNr: nr,
      rechnungsDatum: rDatum,
      betreff: rBetreff,
      einleitung: rEinleitung,
      hinweise: rHinweise,
    };
    setPdfLoading(true);
    try { await generatePDF(rechnungData, 'rechnung'); }
    catch (e) { console.error(e); }
    finally { setPdfLoading(false); }
  }

  async function handleMahnungBestaetigt({ stufe, mahnungNr, datum, frist, mahngebuehr, text }) {
    setMahnModalOffen(false);
    setMahnStufe(stufe);
    setStatus('gemahnt');

    // Mahngebühren früherer Stufen (für PDF-Ausweis)
    const vorherigeGebuehren = mahnGebuehren.filter(g => g.stufe < stufe && g.betrag > 0);

    // Aktuellen Eintrag in den Verlauf aufnehmen (Stufe ggf. ersetzen)
    const neueGebuehren = [
      ...mahnGebuehren.filter(g => g.stufe !== stufe),
      { stufe, betrag: Number(mahngebuehr || 0) },
    ];
    setMahnGebuehren(neueGebuehren);

    let id = aktivesId;
    if (!id) {
      const eintrag = saveAngebot(data);
      id = eintrag.id;
      setAktivesId(id);
      onRefresh?.();
    }
    setMahnung(id, stufe, mahnungNr, datum, neueGebuehren);

    const mahnungData = { stufe, mahnungNr, datum, frist, mahngebuehr, text, vorherigeGebuehren };
    setPdfLoading(true);
    try { await generatePDF({ ...data, rechnungsNr, rechnungsDatum }, 'mahnung', mahnungData); }
    catch (e) { console.error(e); }
    finally { setPdfLoading(false); }
  }

  function handleBezahltMarkieren() {
    if (!confirm('Angebot/Rechnung als bezahlt markieren?')) return;
    setStatus('bezahlt');
    if (aktivesId) setBezahlt(aktivesId);
    onRefresh?.();
  }

  function handleKundeAuswahl(k) {
    setData(prev => {
      const kunde = {
        id: k.id || null,
        anrede: k.anrede || '',
        firma: k.firma || '',
        name: k.name || '',
        strasse: k.strasse || '',
        plz: k.plz || '',
        ort: k.ort || '',
        email: k.email || '',
        telefon: k.telefon || '',
      };
      return {
        ...prev,
        kunde,
        einleitung: genEinleitung(kunde.anrede, kunde.name, prev.firma.einleitungAngebot ?? defaultData.firma.einleitungAngebot),
      };
    });
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
              {pdfLoading ? 'Erstelle…' : 'Angebot PDF'}
            </button>

            {data.kunde.email && (
              <button
                onClick={handleMailSenden}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
                title={`An ${data.kunde.email} senden`}
              >
                <Mail size={14} />
                Per Mail senden
              </button>
            )}

            {status === 'angenommen' && !rechnungsNr && (
              <button
                onClick={() => setRechnungModalOffen(true)}
                disabled={pdfLoading}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition-all"
              >
                <Receipt size={14} />
                Rechnung erstellen
              </button>
            )}

            {rechnungsNr && status !== 'bezahlt' && (
              <button
                onClick={handleRechnungPDF}
                disabled={pdfLoading}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition-all"
              >
                <Download size={14} />
                {rechnungsNr}
              </button>
            )}

            {rechnungsNr && status !== 'bezahlt' && (
              <button
                onClick={() => setMahnModalOffen(true)}
                disabled={pdfLoading}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-all"
              >
                <AlertTriangle size={14} />
                {mahnStufe > 0 ? `Mahnung (Stufe ${mahnStufe})` : 'Mahnung erstellen'}
              </button>
            )}

            {rechnungsNr && status !== 'bezahlt' && (
              <button
                onClick={handleBezahltMarkieren}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-all"
              >
                <Banknote size={14} />
                Als bezahlt markieren
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(460px,48%)] gap-6">
          <div className="flex flex-col gap-5">

            {/* Angebots-Infos */}
            <Collapse title="Angebots-Informationen" icon={Settings}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField label="Angebotsnummer">
                  <Input value={data.angebotNr} onChange={e => set('angebotNr', e.target.value)} placeholder="A-2024-001" />
                </FormField>
                <FormField label="Datum">
                  <DateInput value={data.datum} onChange={handleDatumChange} />
                </FormField>
                <FormField label="Gültig bis (auto)">
                  <div className="w-full px-3 py-2 text-sm border border-slate-100 rounded-lg bg-slate-50 text-slate-400 select-none">
                    {data.gueltigBis || '—'}
                  </div>
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
                <FormField label="Anrede">
                  <div className="flex gap-1">
                    {['', 'Herr', 'Frau', 'Divers'].map(a => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => handleAnredeChange(a)}
                        className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                          data.kunde.anrede === a
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
                  <Input value={data.kunde.name} onChange={e => handleKundeNameChange(e.target.value)} placeholder="Max Mustermann" />
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
            <SectionCard
              title="Positionen"
              icon={ClipboardList}
              action={
                <button
                  onClick={() => setKatalogPickerOffen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all"
                >
                  <BookOpen size={13} />
                  Aus Katalog
                </button>
              }
            >
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

      {rechnungModalOffen && (
        <RechnungModal
          data={data}
          onConfirm={handleRechnungBestaetigt}
          onClose={() => setRechnungModalOffen(false)}
        />
      )}

      {katalogPickerOffen && (
        <KatalogPicker
          katalog={loadKatalog()}
          onAdd={neuePositionen => setData(d => ({
            ...d,
            positionen: [
              ...d.positionen.filter(p => p.bezeichnung || p.einzelpreis),
              ...neuePositionen,
            ],
          }))}
          onClose={() => setKatalogPickerOffen(false)}
        />
      )}

      {mahnModalOffen && (
        <MahnungModal
          data={{ ...data, rechnungsNr, rechnungsDatum }}
          mahnStufeAktuell={mahnStufe}
          vorherigeGebuehren={mahnGebuehren}
          onConfirm={handleMahnungBestaetigt}
          onClose={() => setMahnModalOffen(false)}
        />
      )}
    </div>
  );
}
