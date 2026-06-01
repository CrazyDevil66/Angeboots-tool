import { useState, useEffect, useRef } from 'react';
import { Building2, CheckCircle2, ImagePlus, Trash2, FileText, CreditCard, Settings2, AlignLeft, BookOpen, Plus, Download, Upload, Users, Mail } from 'lucide-react';
import FormField, { Input, Textarea, Select } from '../components/FormField';
import FirmenPreview from '../components/FirmenPreview';
import { saveFirma, saveKatalog, saveKunden, saveAngebote } from '../lib/storage';
import { defaultData, einheiten } from '../lib/defaultData';
import BenutzerVerwaltung from './BenutzerVerwaltung';
import { apiGetSmtp, apiSaveSmtp, apiTestSmtp, clearToken } from '../lib/auth';

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <Icon size={16} className="text-indigo-500" />
        <h2 className="font-semibold text-slate-700 text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const TABS = [
  { id: 'firma',    label: 'Firmendaten',   icon: Building2 },
  { id: 'texte',    label: 'Textvorlagen',  icon: AlignLeft },
  { id: 'katalog',  label: 'Leistungen',    icon: BookOpen  },
  { id: 'benutzer', label: 'Benutzer',      icon: Users,    adminOnly: true },
  { id: 'email',    label: 'E-Mail',        icon: Mail,     adminOnly: true },
];

export default function Einstellungen({ token, currentUser, onLogout, firma, setFirma, kunden, setKunden, angebote, setAngebote, katalog, setKatalog }) {
  const [saved,   setSaved]   = useState(false);
  const [tab,     setTab]     = useState('firma');
  const timer     = useRef(null);
  const [smtp, setSmtp] = useState({ host: '', port: 587, user: '', pass: '', from: '', baseUrl: '' });
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [smtpError, setSmtpError] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    if (currentUser?.role === 'admin' && token) {
      apiGetSmtp(token).then(d => { if (d) setSmtp(d); }).catch(() => {});
    }
  }, [token, currentUser]);

  async function saveSmtp() {
    setSmtpError('');
    try {
      await apiSaveSmtp(token, smtp);
      setSmtpSaved(true);
      setTimeout(() => setSmtpSaved(false), 2500);
    } catch (e) {
      setSmtpError(e.message);
    }
  }

  async function sendTestMail() {
    setTestResult('');
    try {
      await apiTestSmtp(token, testEmail);
      setTestResult('✓ Test-Mail gesendet.');
    } catch (e) {
      setTestResult(`Fehler: ${e.message}`);
    }
  }

  const fileRef   = useRef(null);
  const importRef = useRef(null);
  const saveTimer = useRef(null);

  function triggerSaved() {
    setSaved(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 2500);
  }

  useEffect(() => {
    if (!token || !firma) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await saveFirma(token, firma);
      triggerSaved();
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [firma]);

  const set = (field, val) => setFirma(prev => ({ ...prev, [field]: val }));

  function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set('logo', ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function katalogUpdate(id, field, value) {
    const neu = katalog.map(item => item.id === id ? { ...item, [field]: value } : item);
    setKatalog(neu);
    await saveKatalog(token, neu);
    triggerSaved();
  }

  async function katalogAdd() {
    const neu = [
      ...katalog,
      { id: crypto.randomUUID(), bezeichnung: '', beschreibung: '', einheit: 'Stk.', einzelpreis: 0 },
    ];
    setKatalog(neu);
    await saveKatalog(token, neu);
    triggerSaved();
  }

  async function katalogDelete(id) {
    const neu = katalog.filter(item => item.id !== id);
    setKatalog(neu);
    await saveKatalog(token, neu);
    triggerSaved();
  }

  function handleExport() {
    const backup = {
      exportedAt: new Date().toISOString(),
      firma,
      kunden,
      angebote,
      katalog,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `objektrausch-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const backup = JSON.parse(ev.target.result);
        if (backup.firma)    { await saveFirma(token, backup.firma);       setFirma(backup.firma); }
        if (backup.kunden)   { await saveKunden(token, backup.kunden);     setKunden(backup.kunden); }
        if (backup.katalog)  { await saveKatalog(token, backup.katalog);   setKatalog(backup.katalog); }
        if (backup.angebote) { await saveAngebote(token, backup.angebote); setAngebote(backup.angebote); }
        triggerSaved();
      } catch {
        alert('Ungültige Backup-Datei.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-indigo-50/20">

      {/* Topbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Settings2 size={18} className="text-indigo-500" />
              <h1 className="text-base font-bold text-slate-800">Einstellungen</h1>
            </div>
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {TABS.filter(t => !t.adminOnly || currentUser?.role === 'admin').map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    tab === id
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <span className={`flex items-center gap-1.5 text-xs text-emerald-600 font-medium transition-opacity duration-500 ${saved ? 'opacity-100' : 'opacity-0'}`}>
            <CheckCircle2 size={13} />
            Gespeichert
          </span>
        </div>
      </div>

      {/* Zwei-Spalten-Layout */}
      <div className="max-w-6xl mx-auto px-8 py-6">
        <div className="grid gap-6" style={{ gridTemplateColumns: (['katalog', 'benutzer', 'email'].includes(tab)) ? 'minmax(0,1fr)' : 'minmax(0,1fr) 340px' }}>

          {/* ── Linke Spalte: Einstellungen ── */}
          <div className="flex flex-col gap-4">

            {tab === 'firma' && (
              <>
                {/* Logo */}
                <Section icon={ImagePlus} title="Firmen-Logo">
                  <div className="flex items-center gap-5">
                    {firma.logo ? (
                      <>
                        <div className="w-28 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <img src={firma.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => fileRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all"
                          >
                            <ImagePlus size={13} />
                            Austauschen
                          </button>
                          <button
                            onClick={() => set('logo', null)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={13} />
                            Entfernen
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-3 px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all"
                      >
                        <ImagePlus size={18} />
                        <div className="text-left">
                          <div className="text-sm font-medium">Logo hochladen</div>
                          <div className="text-xs text-slate-400">PNG, JPG oder SVG</div>
                        </div>
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </div>
                </Section>

                {/* Firmendaten */}
                <Section icon={Building2} title="Firmendaten">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Firmenname" className="col-span-2">
                      <Input value={firma.name} onChange={e => set('name', e.target.value)} placeholder="Muster GmbH" />
                    </FormField>
                    <FormField label="Straße">
                      <Input value={firma.strasse} onChange={e => set('strasse', e.target.value)} placeholder="Musterstraße 1" />
                    </FormField>
                    <div className="grid grid-cols-[90px_1fr] gap-2">
                      <FormField label="PLZ">
                        <Input value={firma.plz} onChange={e => set('plz', e.target.value)} placeholder="12345" />
                      </FormField>
                      <FormField label="Ort">
                        <Input value={firma.ort} onChange={e => set('ort', e.target.value)} placeholder="Berlin" />
                      </FormField>
                    </div>
                    <FormField label="Telefon">
                      <Input value={firma.telefon} onChange={e => set('telefon', e.target.value)} placeholder="+49 30 123456" />
                    </FormField>
                    <FormField label="E-Mail">
                      <Input type="email" value={firma.email} onChange={e => set('email', e.target.value)} placeholder="info@firma.de" />
                    </FormField>
                    <FormField label="Website">
                      <Input value={firma.web} onChange={e => set('web', e.target.value)} placeholder="www.firma.de" />
                    </FormField>
                    <FormField label="USt-ID">
                      <Input value={firma.ustId} onChange={e => set('ustId', e.target.value)} placeholder="DE123456789" />
                    </FormField>
                  </div>
                </Section>

                {/* Bankverbindung */}
                <Section icon={CreditCard} title="Bankverbindung">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Kontoinhaber" className="col-span-2">
                      <Input value={firma.kontoinhaber ?? ''} onChange={e => set('kontoinhaber', e.target.value)} placeholder="Max Mustermann" />
                    </FormField>
                    <FormField label="IBAN" className="col-span-2">
                      <Input value={firma.iban ?? ''} onChange={e => set('iban', e.target.value.toUpperCase())} placeholder="DE12 3456 7890 1234 5678 90" />
                    </FormField>
                    <FormField label="BIC">
                      <Input value={firma.bic ?? ''} onChange={e => set('bic', e.target.value.toUpperCase())} placeholder="BELADEBEXXX" />
                    </FormField>
                    <FormField label="Kreditinstitut">
                      <Input value={firma.bank ?? ''} onChange={e => set('bank', e.target.value)} placeholder="Musterbank" />
                    </FormField>
                    <FormField label="Standard-Mahngebühr (€)">
                      <Input type="number" step="0.01" value={firma.mahngebuehr ?? '5.00'} onChange={e => set('mahngebuehr', e.target.value)} placeholder="5.00" />
                    </FormField>
                  </div>
                </Section>

                {/* Datensicherung */}
                <Section icon={Download} title="Datensicherung">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleExport}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
                    >
                      <Download size={14} />
                      Alle Daten exportieren
                    </button>
                    <button
                      onClick={() => importRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
                    >
                      <Upload size={14} />
                      Backup importieren
                    </button>
                    <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
                    <span className="text-xs text-slate-400">Importieren überschreibt alle vorhandenen Daten.</span>
                  </div>
                </Section>
              </>
            )}

            {tab === 'texte' && (
              <Section icon={FileText} title="Textvorlagen">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Einleitungstext — Angebot">
                    <Textarea
                      value={firma.einleitungAngebot ?? ''}
                      onChange={e => set('einleitungAngebot', e.target.value)}
                      rows={4}
                      placeholder="vielen Dank für Ihr Interesse…"
                    />
                  </FormField>
                  <FormField label="Einleitungstext — Rechnung">
                    <Textarea
                      value={firma.einleitungRechnung ?? ''}
                      onChange={e => set('einleitungRechnung', e.target.value)}
                      rows={4}
                      placeholder="vielen Dank für Ihren Auftrag…"
                    />
                  </FormField>
                  <FormField label="Hinweise — Angebot">
                    <Textarea
                      value={firma.hinweiseAngebot ?? ''}
                      onChange={e => set('hinweiseAngebot', e.target.value)}
                      rows={5}
                      placeholder="Zahlungsziel: 14 Tage netto · Angebot freibleibend."
                    />
                  </FormField>
                  <FormField label="Hinweise — Rechnung">
                    <Textarea
                      value={firma.hinweiseRechnung ?? ''}
                      onChange={e => set('hinweiseRechnung', e.target.value)}
                      rows={5}
                      placeholder="Zahlungsziel: 14 Tage nach Rechnungseingang ohne Abzug."
                    />
                  </FormField>
                </div>
              </Section>
            )}

            {tab === 'katalog' && (
              <Section icon={BookOpen} title="Leistungskatalog">
                {/* Tabellen-Header */}
                <div className="grid grid-cols-[1fr_160px_90px_110px_40px] gap-2 px-2 pb-2 border-b border-slate-100 mb-2">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Bezeichnung / Beschreibung</span>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Einheit</span>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide text-right">Preis (€)</span>
                  <span />
                  <span />
                </div>

                <div className="flex flex-col gap-1.5">
                  {katalog.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-6 italic">
                      Noch keine Leistungen angelegt — klicke auf „Neue Leistung"
                    </p>
                  )}
                  {katalog.map(item => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1fr_160px_90px_110px_40px] gap-2 items-start bg-slate-50 rounded-xl p-2 hover:bg-indigo-50/30 transition-colors group"
                    >
                      <div className="flex flex-col gap-1">
                        <Input
                          placeholder="Bezeichnung *"
                          value={item.bezeichnung}
                          onChange={e => katalogUpdate(item.id, 'bezeichnung', e.target.value)}
                        />
                        <input
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
                          placeholder="Beschreibung (optional)"
                          value={item.beschreibung}
                          onChange={e => katalogUpdate(item.id, 'beschreibung', e.target.value)}
                        />
                      </div>
                      <Select
                        value={item.einheit}
                        onChange={e => katalogUpdate(item.id, 'einheit', e.target.value)}
                      >
                        {einheiten.map(e => <option key={e} value={e}>{e}</option>)}
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.einzelpreis}
                        onChange={e => katalogUpdate(item.id, 'einzelpreis', e.target.value)}
                        className="text-right"
                        placeholder="0,00"
                      />
                      <div className="col-span-2 flex justify-end">
                        <button
                          onClick={() => katalogDelete(item.id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={katalogAdd}
                  className="mt-3 flex items-center gap-2 px-4 py-2.5 text-sm text-indigo-600 font-medium border-2 border-dashed border-indigo-200 rounded-xl w-full justify-center hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                >
                  <Plus size={16} />
                  Neue Leistung
                </button>
              </Section>
            )}

            {tab === 'benutzer' && (
              <>
                <BenutzerVerwaltung token={token} currentUser={currentUser} />
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4">
                    <span className="text-sm text-slate-600">
                      Eingeloggt als <strong className="text-slate-800">{currentUser?.username}</strong>
                      {currentUser?.role === 'admin' && <span className="ml-2 text-xs text-indigo-600 font-semibold">(Admin)</span>}
                    </span>
                    <button
                      onClick={onLogout}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                    >
                      Abmelden
                    </button>
                  </div>
                </div>
              </>
            )}

            {tab === 'email' && (
              <Section icon={Mail} title="SMTP-Konfiguration">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="SMTP-Host" className="col-span-2">
                    <Input value={smtp.host} onChange={e => setSmtp(p => ({ ...p, host: e.target.value }))} placeholder="smtp.gmail.com" />
                  </FormField>
                  <FormField label="Port">
                    <Input type="number" value={smtp.port} onChange={e => setSmtp(p => ({ ...p, port: Number(e.target.value) }))} placeholder="587" />
                  </FormField>
                  <FormField label="Benutzername">
                    <Input value={smtp.user} onChange={e => setSmtp(p => ({ ...p, user: e.target.value }))} placeholder="user@gmail.com" />
                  </FormField>
                  <FormField label="Passwort">
                    <Input type="password" value={smtp.pass} onChange={e => setSmtp(p => ({ ...p, pass: e.target.value }))} placeholder="App-Passwort" />
                  </FormField>
                  <FormField label="Absender-Adresse">
                    <Input value={smtp.from} onChange={e => setSmtp(p => ({ ...p, from: e.target.value }))} placeholder="noreply@firma.de" />
                  </FormField>
                  <FormField label="App-URL (für Einladungslinks)" className="col-span-2">
                    <Input value={smtp.baseUrl} onChange={e => setSmtp(p => ({ ...p, baseUrl: e.target.value }))} placeholder="https://meinserver.de" />
                  </FormField>
                </div>
                {smtpError && <div className="text-xs text-red-500 mt-2">{smtpError}</div>}
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={saveSmtp}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {smtpSaved ? '✓ Gespeichert' : 'Speichern'}
                  </button>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Test-Mail senden</div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={e => setTestEmail(e.target.value)}
                      placeholder="empfaenger@beispiel.de"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                    />
                    <button
                      onClick={sendTestMail}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm rounded-lg transition-colors"
                    >
                      Senden
                    </button>
                  </div>
                  {testResult && <div className={`text-xs mt-2 ${testResult.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{testResult}</div>}
                </div>
              </Section>
            )}

          </div>

          {/* ── Rechte Spalte: Live-Vorschau ── */}
          {!['katalog', 'benutzer', 'email'].includes(tab) && <FirmenPreview firma={firma} fokus={tab} />}

        </div>
      </div>
    </div>
  );
}
