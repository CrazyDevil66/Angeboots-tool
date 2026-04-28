import { useState, useEffect, useRef } from 'react';
import { Building2, CheckCircle2 } from 'lucide-react';
import FormField, { Input } from '../components/FormField';
import { loadFirma, saveFirma } from '../lib/storage';
import { defaultData } from '../lib/defaultData';

export default function Einstellungen() {
  const [firma, setFirma] = useState(() => loadFirma() || defaultData.firma);
  const [saved, setSaved] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    saveFirma(firma);
    setSaved(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer.current);
  }, [firma]);

  const set = (field, val) => setFirma(prev => ({ ...prev, [field]: val }));

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Einstellungen</h1>
        <p className="text-slate-500 mt-1 text-sm">Firmendaten werden automatisch gespeichert und in jedem Angebot verwendet.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <Building2 size={18} className="text-indigo-500" />
            <h2 className="font-semibold text-slate-700 text-sm">Ihre Firmendaten</h2>
          </div>
          <span className={`flex items-center gap-1.5 text-xs text-emerald-600 font-medium transition-opacity duration-500 ${saved ? 'opacity-100' : 'opacity-0'}`}>
            <CheckCircle2 size={13} />
            Gespeichert
          </span>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <FormField label="Firmenname" className="col-span-2">
            <Input value={firma.name} onChange={e => set('name', e.target.value)} placeholder="Muster GmbH" />
          </FormField>
          <FormField label="Straße">
            <Input value={firma.strasse} onChange={e => set('strasse', e.target.value)} placeholder="Musterstraße 1" />
          </FormField>
          <div className="grid grid-cols-[100px_1fr] gap-3">
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
      </div>
    </div>
  );
}