const C = { dark: '#2D3342', yellow: '#E8B800' };

function PreviewRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-end gap-2">
      <span style={{ fontSize: 9, color: '#8896A8' }}>{label}</span>
      <span style={{ fontSize: 9, fontWeight: 700, color: '#1E2130' }}>{value}</span>
    </div>
  );
}

function SkeletonLine({ w = 'full', h = 6, className = '' }) {
  return (
    <div
      className={`rounded ${className}`}
      style={{ height: h, backgroundColor: '#EEF2F7', width: w === 'full' ? '100%' : w }}
    />
  );
}

function DokumentVorschau({ firma }) {
  const absender = [firma.name, firma.strasse, [firma.plz, firma.ort].filter(Boolean).join(' ')]
    .filter(Boolean).join('  ·  ');

  const footer1 = [
    firma.name,
    firma.strasse,
    [firma.plz, firma.ort].filter(Boolean).join(' '),
    firma.ustId ? `USt-ID: ${firma.ustId}` : null,
  ].filter(Boolean).join('  ·  ');

  const footer2 = [
    firma.kontoinhaber ? `Inh.: ${firma.kontoinhaber}` : null,
    firma.iban         ? `IBAN: ${firma.iban}`         : null,
    firma.bic          ? `BIC: ${firma.bic}`           : null,
    firma.bank         || null,
  ].filter(Boolean).join('  ·  ');

  return (
    <div className="rounded-xl overflow-hidden shadow-md border border-slate-200 text-xs">
      {/* Header */}
      <div className="px-5 py-3.5" style={{ backgroundColor: C.dark }}>
        {firma.logo ? (
          <img src={firma.logo} alt="Logo" className="max-h-9 max-w-[130px] object-contain" />
        ) : (
          <span className="font-bold tracking-widest" style={{ color: C.yellow, fontSize: 13, fontFamily: 'monospace' }}>
            {firma.name || <span style={{ color: '#4A5568', fontStyle: 'italic', fontWeight: 400 }}>Kein Firmenname gesetzt</span>}
          </span>
        )}
      </div>

      <div style={{ height: 3, backgroundColor: C.yellow }} />

      <div className="bg-white px-5 py-4">
        <div className="flex gap-4 justify-between">
          <div className="flex-1 min-w-0">
            <div className="truncate pb-1.5 mb-3" style={{ fontSize: 7, color: '#8896A8', borderBottom: '0.5px solid #E2E8F0' }}>
              {absender || <em>Firmenname · Straße · Ort</em>}
            </div>
            <div className="space-y-1">
              <SkeletonLine w="55%" />
              <SkeletonLine w="70%" h={5} />
              <SkeletonLine w="50%" h={5} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="font-bold tracking-widest mb-1" style={{ fontSize: 11, color: C.dark, fontFamily: 'monospace' }}>ANGEBOT</div>
            <PreviewRow label="Nummer"  value={firma.name ? 'A-2026-001' : undefined} />
            <PreviewRow label="Datum"   value={new Date().toLocaleDateString('de-DE')} />
            <PreviewRow label="E-Mail"  value={firma.email} />
            <PreviewRow label="Telefon" value={firma.telefon} />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="font-bold" style={{ fontSize: 8, borderLeft: `3px solid ${C.yellow}`, paddingLeft: 6, color: '#1E2130' }}>
            Angebot
          </div>
          <SkeletonLine w="90%" h={5} />
          <SkeletonLine w="80%" h={5} />
          <SkeletonLine w="60%" h={5} />
        </div>

        <div className="mt-4 rounded flex gap-3 px-3 py-2" style={{ backgroundColor: C.dark }}>
          {['5%','44%','10%','10%','16%','15%'].map((w, i) => (
            <div key={i} style={{ width: w, height: 5, backgroundColor: '#4A5568', borderRadius: 2 }} />
          ))}
        </div>
        {[0, 1].map(i => (
          <div key={i} className="flex gap-3 px-3 py-2" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ width: '5%',  height: 5, backgroundColor: C.yellow,   borderRadius: 2 }} />
            <div style={{ width: '44%', height: 5, backgroundColor: '#EEF2F7', borderRadius: 2 }} />
            <div style={{ width: '10%', height: 5, backgroundColor: '#EEF2F7', borderRadius: 2 }} />
            <div style={{ width: '10%', height: 5, backgroundColor: '#EEF2F7', borderRadius: 2 }} />
            <div style={{ width: '16%', height: 5, backgroundColor: '#EEF2F7', borderRadius: 2 }} />
            <div style={{ width: '15%', height: 5, backgroundColor: '#EEF2F7', borderRadius: 2 }} />
          </div>
        ))}

        <div className="mt-3 ml-auto w-2/5 space-y-1">
          <div className="flex justify-between px-2 py-1" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <SkeletonLine w="45%" h={5} /><SkeletonLine w="30%" h={5} />
          </div>
          <div className="flex justify-between px-2 py-1" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <SkeletonLine w="40%" h={5} /><SkeletonLine w="28%" h={5} />
          </div>
          <div className="flex justify-between rounded px-2 py-1.5" style={{ backgroundColor: C.yellow }}>
            <SkeletonLine w="45%" h={5} className="!bg-white/40" />
            <SkeletonLine w="32%" h={5} className="!bg-white/40" />
          </div>
        </div>
      </div>

      <div className="px-5 py-3" style={{ backgroundColor: C.dark }}>
        <div className="truncate" style={{ fontSize: 7.5, color: '#6B7A94' }}>
          {footer1 || <em style={{ color: '#4A5568' }}>Firmenname · Straße · PLZ Ort · USt-ID</em>}
        </div>
        <div className="truncate mt-1" style={{ fontSize: 7.5, color: '#6B7A94' }}>
          {footer2 || <em style={{ color: '#4A5568' }}>Kontoinhaber · IBAN · BIC · Bank</em>}
        </div>
      </div>
    </div>
  );
}

function TextVorschau({ firma }) {
  const typen = [
    {
      label: 'Angebot',
      einleitung: firma.einleitungAngebot,
      hinweise:   firma.hinweiseAngebot,
    },
    {
      label: 'Rechnung',
      einleitung: firma.einleitungRechnung,
      hinweise:   firma.hinweiseRechnung,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {typen.map(({ label, einleitung, hinweise }) => (
        <div key={label} className="rounded-xl overflow-hidden shadow-md border border-slate-200 text-xs">
          {/* Mini-Header */}
          <div className="px-5 py-2.5" style={{ backgroundColor: C.dark }}>
            {firma.logo
              ? <img src={firma.logo} alt="Logo" className="max-h-6 max-w-[100px] object-contain" />
              : <span className="font-bold tracking-widest" style={{ color: C.yellow, fontSize: 11, fontFamily: 'monospace' }}>
                  {firma.name || <span style={{ color: '#4A5568', fontStyle: 'italic', fontWeight: 400 }}>Firmenname</span>}
                </span>
            }
          </div>
          <div style={{ height: 3, backgroundColor: C.yellow }} />

          <div className="bg-white px-5 py-4 space-y-3">
            {/* Betreff */}
            <div className="font-bold" style={{ fontSize: 9, borderLeft: `3px solid ${C.yellow}`, paddingLeft: 6, color: '#1E2130' }}>
              {label}
            </div>

            {/* Einleitungstext */}
            {einleitung ? (
              <p className="leading-relaxed whitespace-pre-line" style={{ fontSize: 8, color: '#4A5568' }}>
                {'Sehr geehrte Damen und Herren,\n\n'}{einleitung}
              </p>
            ) : (
              <div className="space-y-1">
                <SkeletonLine w="80%" h={5} />
                <SkeletonLine w="90%" h={5} />
                <SkeletonLine w="65%" h={5} />
              </div>
            )}

            {/* Tabellen-Platzhalter */}
            <div className="rounded flex gap-3 px-3 py-1.5 mt-2" style={{ backgroundColor: C.dark, opacity: 0.6 }}>
              {['5%','50%','15%','30%'].map((w, i) => (
                <div key={i} style={{ width: w, height: 4, backgroundColor: '#4A5568', borderRadius: 2 }} />
              ))}
            </div>
            {[0].map(i => (
              <div key={i} className="flex gap-3 px-3 py-1.5" style={{ borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ width: '5%',  height: 4, backgroundColor: C.yellow,   borderRadius: 2 }} />
                <div style={{ width: '50%', height: 4, backgroundColor: '#EEF2F7', borderRadius: 2 }} />
                <div style={{ width: '15%', height: 4, backgroundColor: '#EEF2F7', borderRadius: 2 }} />
                <div style={{ width: '30%', height: 4, backgroundColor: '#EEF2F7', borderRadius: 2 }} />
              </div>
            ))}

            {/* Hinweise */}
            {hinweise && (
              <div className="rounded p-3 mt-1" style={{ backgroundColor: '#F8FAFC', borderLeft: `3px solid ${C.dark}` }}>
                <div className="font-bold mb-1" style={{ fontSize: 7, color: C.dark, letterSpacing: '0.05em' }}>HINWEISE</div>
                <p className="whitespace-pre-line leading-relaxed" style={{ fontSize: 7.5, color: '#4A5568' }}>
                  {hinweise}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FirmenPreview({ firma, fokus = 'firma' }) {
  return (
    <div className="sticky flex flex-col gap-4" style={{ top: 80 }}>
      <div>
        <h3 className="font-semibold text-slate-700 text-sm">Vorschau</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          {fokus === 'texte'
            ? 'So erscheinen Ihre Texte in erzeugten Dokumenten'
            : 'So erscheinen Ihre Daten in erzeugten PDFs'}
        </p>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
        {fokus === 'texte'
          ? <TextVorschau firma={firma} />
          : <DokumentVorschau firma={firma} />
        }
      </div>
    </div>
  );
}
