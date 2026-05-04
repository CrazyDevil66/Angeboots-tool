import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import FormField, { Input, Textarea } from './FormField';
import DateInput, { add14Days } from './DateInput';

const STUFEN = [
  { value: 1, label: 'Zahlungserinnerung', kurztext: 'Zahlungserinnerung' },
  { value: 2, label: '1. Mahnung',         kurztext: '1. Mahnung'         },
  { value: 3, label: '2. Mahnung',         kurztext: '2. Mahnung (letzte)'},
];

function mahntext(stufe, ansprache, rechnungsNr, rechnungsDatum, frist) {
  const ref = `Rechnung Nr. ${rechnungsNr || '—'} vom ${rechnungsDatum || '—'}`;
  if (stufe === 1) return (
    `${ansprache}\n\n` +
    `vielleicht haben Sie unsere ${ref} übersehen. ` +
    `Wir bitten Sie, den offenstehenden Betrag bis zum ${frist} zu begleichen.\n\n` +
    `Falls die Zahlung bereits erfolgt ist, betrachten Sie dieses Schreiben als gegenstandslos.`
  );
  if (stufe === 2) return (
    `${ansprache}\n\n` +
    `trotz unserer Zahlungserinnerung ist der Betrag aus unserer ${ref} bisher nicht eingegangen. ` +
    `Wir fordern Sie hiermit auf, den ausstehenden Betrag zuzüglich Mahngebühr bis zum ${frist} zu überweisen.\n\n` +
    `Sollte die Zahlung weiterhin ausbleiben, behalten wir uns weitere rechtliche Schritte vor.`
  );
  return (
    `${ansprache}\n\n` +
    `dies ist unsere letzte Mahnung bezüglich der ${ref}. ` +
    `Der gesamte ausstehende Betrag einschließlich aller Mahngebühren muss bis spätestens ${frist} auf unserem Konto eingegangen sein.\n\n` +
    `Bei weiterem Ausbleiben der Zahlung werden wir die Forderung ohne weitere Ankündigung einem Inkassobüro übergeben bzw. gerichtliche Schritte einleiten.`
  );
}

export default function MahnungModal({ data, mahnStufeAktuell = 0, vorherigeGebuehren = [], onConfirm, onClose }) {
  const f     = data.firma;
  const k     = data.kunde;
  const heute = new Date().toLocaleDateString('de-DE');
  const fristDefault = add14Days(heute);

  const naechsteStufe = Math.min(mahnStufeAktuell + 1, 3);
  const mahnNrPrefix  = (data.rechnungsNr || data.angebotNr || 'M').replace(/^[AR]-/, 'M-');

  const ansprache = k.anrede === 'Herr'
    ? `Sehr geehrter Herr ${k.name || ''},`
    : k.anrede === 'Frau'
      ? `Sehr geehrte Frau ${k.name || ''},`
      : 'Sehr geehrte Damen und Herren,';

  const [stufe,       setStufe]       = useState(naechsteStufe);
  const [mahnungNr,   setMahnungNr]   = useState(mahnNrPrefix);
  const [datum,       setDatum]       = useState(heute);
  const [frist,       setFrist]       = useState(fristDefault);
  const [mahngebuehr, setMahngebuehr] = useState(
    naechsteStufe === 1 ? '0.00' : (f.mahngebuehr ?? '5.00')
  );
  const [text, setText] = useState(
    () => mahntext(naechsteStufe, ansprache, data.rechnungsNr, data.rechnungsDatum, fristDefault)
  );

  function handleStufeChange(s) {
    setStufe(s);
    setText(mahntext(s, ansprache, data.rechnungsNr, data.rechnungsDatum, frist));
    setMahngebuehr(s === 1 ? '0.00' : (f.mahngebuehr ?? '5.00'));
  }

  function handleFristChange(val) {
    setFrist(val);
    setText(mahntext(stufe, ansprache, data.rechnungsNr, data.rechnungsDatum, val));
  }

  function handleConfirm() {
    onConfirm({ stufe, mahnungNr, datum, frist, mahngebuehr, text });
  }

  const stufenLabel = STUFEN.find(s => s.value === stufe)?.kurztext || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-100 bg-red-50">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-500" />
            <div>
              <h2 className="font-semibold text-slate-800 text-base">Mahnung erstellen</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rechnung {data.rechnungsNr || '—'} · {k.firma || k.name || '—'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4 max-h-[72vh] overflow-y-auto">

          {/* Mahnstufe */}
          <FormField label="Mahnstufe">
            <div className="flex gap-2">
              {STUFEN.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleStufeChange(s.value)}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-all font-medium ${
                    stufe === s.value
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-red-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </FormField>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="Mahnungs-Nr.">
              <Input value={mahnungNr} onChange={e => setMahnungNr(e.target.value)} />
            </FormField>
            <FormField label="Datum">
              <DateInput value={datum} onChange={setDatum} />
            </FormField>
            <FormField label="Zahlungsfrist">
              <DateInput value={frist} onChange={handleFristChange} />
            </FormField>
          </div>

          {stufe > 1 && (() => {
            const bereitsBerechnet = vorherigeGebuehren.filter(g => g.stufe < stufe && g.betrag > 0);
            return (
              <>
                {bereitsBerechnet.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
                    <span className="font-semibold">Bereits beaufschlagte Mahngebühren:</span>{' '}
                    {bereitsBerechnet.map(g => `${Number(g.betrag).toFixed(2).replace('.', ',')} €`).join(' + ')}
                    {' '}— werden im PDF ausgewiesen.
                  </div>
                )}
                <FormField label="Mahngebühr (€)">
                  <Input
                    type="number"
                    step="0.01"
                    value={mahngebuehr}
                    onChange={e => setMahngebuehr(e.target.value)}
                    className="w-36"
                  />
                </FormField>
              </>
            );
          })()}

          <FormField label="Mahnschreiben">
            <Textarea value={text} onChange={e => setText(e.target.value)} rows={7} />
          </FormField>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            <AlertTriangle size={14} />
            {stufenLabel} PDF erstellen
          </button>
        </div>
      </div>
    </div>
  );
}
