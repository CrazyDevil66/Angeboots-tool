import { useState } from 'react';
import { X, Download } from 'lucide-react';
import FormField, { Input, Textarea } from './FormField';
import DateInput from './DateInput';
import { nextRechnungsNr } from '../lib/storage';

function genSalutation(anrede, name, template) {
  let ansprache;
  if (anrede === 'Herr')       ansprache = `Sehr geehrter Herr ${name || ''},`;
  else if (anrede === 'Frau')  ansprache = `Sehr geehrte Frau ${name || ''},`;
  else                         ansprache = 'Sehr geehrte Damen und Herren,';
  return `${ansprache}\n\n${template}`;
}

export default function RechnungModal({ data, onConfirm, onClose }) {
  const defaultNr    = nextRechnungsNr();
  const defaultDatum = new Date().toLocaleDateString('de-DE');
  const f            = data.firma;
  const k            = data.kunde;

  const template = f.einleitungRechnung || 'vielen Dank für Ihren Auftrag. Wir erlauben uns, folgende Leistungen in Rechnung zu stellen:';

  const [rechnungsNr,  setRechnungsNr]  = useState(defaultNr);
  const [datum,        setDatum]        = useState(defaultDatum);
  const [betreff,      setBetreff]      = useState('Rechnung');
  const [einleitung,   setEinleitung]   = useState(
    () => genSalutation(k.anrede, k.name, template)
  );
  const [hinweise,     setHinweise]     = useState(
    f.hinweiseRechnung || 'Zahlungsziel: 14 Tage nach Rechnungseingang ohne Abzug.'
  );

  function handleConfirm() {
    onConfirm({ rechnungsNr, datum, betreff, einleitung, hinweise });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="font-semibold text-slate-800 text-base">Rechnung erstellen</h2>
            <p className="text-xs text-slate-400 mt-0.5">Angaben prüfen und anpassen</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Rechnungsnummer">
              <Input value={rechnungsNr} onChange={e => setRechnungsNr(e.target.value)} />
            </FormField>
            <FormField label="Datum">
              <DateInput value={datum} onChange={setDatum} />
            </FormField>
          </div>

          <FormField label="Betreff">
            <Input value={betreff} onChange={e => setBetreff(e.target.value)} />
          </FormField>

          <FormField label="Einleitungstext">
            <Textarea value={einleitung} onChange={e => setEinleitung(e.target.value)} rows={3} />
          </FormField>

          <FormField label="Hinweise & Zahlungsbedingungen">
            <Textarea value={hinweise} onChange={e => setHinweise(e.target.value)} rows={4} />
          </FormField>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Download size={14} />
            PDF erstellen
          </button>
        </div>
      </div>
    </div>
  );
}
