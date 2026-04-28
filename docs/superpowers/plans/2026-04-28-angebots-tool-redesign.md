# AngebotsTool UI-Redesign — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vollständiges Redesign des AngebotsTool zu einer professionellen SaaS-App mit Sidebar-Navigation, 5 Views, Status-System für Angebote und Kunden-Drawer.

**Architecture:** State-basiertes Routing ohne React Router (`{ view, params }` in App.jsx). Jede View ist eine eigenständige Komponente in `src/views/`. Neue Hilfskomponenten in `src/components/`. Bestehende Logik (PDF, Positionen, Vorschau) bleibt unverändert.

**Tech Stack:** React 18, Vite, Tailwind CSS 3, @react-pdf/renderer 4, localStorage, lucide-react

**Projektpfad:** `/home/tolga/Dokumente/Visual Studio Code/Objektrausch/angebots-tool`

---

## Datei-Übersicht

| Datei | Aktion |
|---|---|
| `src/lib/statusConfig.js` | NEU |
| `src/lib/storage.js` | UPDATE: status-Feld, setAngebotStatus, getAngeboteByKunde |
| `src/components/StatusBadge.jsx` | NEU |
| `src/components/StatusDropdown.jsx` | NEU |
| `src/components/Sidebar.jsx` | NEU |
| `src/components/KundenPicker.jsx` | NEU (inline Kundenauswahl im Editor) |
| `src/views/Einstellungen.jsx` | NEU |
| `src/views/Dashboard.jsx` | NEU |
| `src/views/AngebotEditor.jsx` | NEU (Form-Logik aus App.jsx) |
| `src/views/AngeboteListe.jsx` | NEU |
| `src/views/KundenListe.jsx` | NEU |
| `src/App.jsx` | REWRITE: Router-Shell |
| `src/components/KundenVerwaltung.jsx` | LÖSCHEN |
| `src/components/AngebotArchiv.jsx` | LÖSCHEN |
| `src/components/FormField.jsx` | unverändert |
| `src/components/PositionenTabelle.jsx` | unverändert |
| `src/components/PreviewPanel.jsx` | unverändert |
| `src/components/SectionCard.jsx` | unverändert |
| `src/lib/pdfGenerator.jsx` | unverändert |
| `src/lib/defaultData.js` | unverändert |

---

## Task 1: statusConfig.js

**Files:**
- Create: `src/lib/statusConfig.js`

- [ ] **Schritt 1: Datei anlegen**

```js
// src/lib/statusConfig.js
export const STATUS_CONFIG = {
  entwurf: {
    label: 'Entwurf',
    bg: 'bg-slate-100', text: 'text-slate-600',
    dot: 'bg-slate-400', border: 'border-slate-200',
  },
  gesendet: {
    label: 'Gesendet',
    bg: 'bg-blue-50', text: 'text-blue-700',
    dot: 'bg-blue-500', border: 'border-blue-200',
  },
  angenommen: {
    label: 'Angenommen',
    bg: 'bg-emerald-50', text: 'text-emerald-700',
    dot: 'bg-emerald-500', border: 'border-emerald-200',
  },
  abgelehnt: {
    label: 'Abgelehnt',
    bg: 'bg-red-50', text: 'text-red-600',
    dot: 'bg-red-400', border: 'border-red-200',
  },
  abgelaufen: {
    label: 'Abgelaufen',
    bg: 'bg-orange-50', text: 'text-orange-700',
    dot: 'bg-orange-400', border: 'border-orange-200',
  },
};

export const STATUS_LIST = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({ value, ...cfg }));

export function getStatus(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.entwurf;
}
```

- [ ] **Schritt 2: Build prüfen**

```bash
cd "/home/tolga/Dokumente/Visual Studio Code/Objektrausch/angebots-tool"
npm run build 2>&1 | grep -E "error|✓"
```
Erwartet: `✓ built in`

- [ ] **Schritt 3: Commit**

```bash
git init 2>/dev/null || true
git add src/lib/statusConfig.js
git commit -m "feat: add statusConfig with 5 offer statuses"
```

---

## Task 2: storage.js — Status-Erweiterungen

**Files:**
- Modify: `src/lib/storage.js`

- [ ] **Schritt 1: saveAngebot updaten — status + kundeId hinzufügen**

In `saveAngebot` das `eintrag`-Objekt ergänzen:
```js
// Bestehende Zeile: kundeId: data.kunde.id || null,
// Neu hinzufügen:
status: 'entwurf',
kundeId: data.kunde?.id || null,
```

Die vollständige aktualisierte `saveAngebot`-Funktion:
```js
export function saveAngebot(data) {
  const angebote = loadAngebote();
  const netto = data.positionen.reduce((s, p) => s + Number(p.menge) * Number(p.einzelpreis), 0);
  const brutto = netto * (1 + Number(data.mwstSatz) / 100);

  const eintrag = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    angebotNr: data.angebotNr,
    datum: data.datum,
    betreff: data.betreff,
    kundeDisplay: data.kunde.firma || data.kunde.name || '—',
    kundeId: data.kunde?.id || null,
    netto,
    brutto,
    mwstSatz: data.mwstSatz,
    status: 'entwurf',
    snapshot: data,
  };

  const aktuell = [eintrag, ...angebote];
  localStorage.setItem(ANGEBOTE_KEY, JSON.stringify(aktuell));
  return eintrag;
}
```

- [ ] **Schritt 2: updateAngebot updaten — status beibehalten**

```js
export function updateAngebot(id, data) {
  const angebote = loadAngebote();
  const netto = data.positionen.reduce((s, p) => s + Number(p.menge) * Number(p.einzelpreis), 0);
  const brutto = netto * (1 + Number(data.mwstSatz) / 100);

  const aktuell = angebote.map(a =>
    a.id === id
      ? {
          ...a,
          updatedAt: new Date().toISOString(),
          angebotNr: data.angebotNr,
          datum: data.datum,
          betreff: data.betreff,
          kundeDisplay: data.kunde.firma || data.kunde.name || '—',
          kundeId: data.kunde?.id || null,
          netto,
          brutto,
          mwstSatz: data.mwstSatz,
          status: a.status || 'entwurf',   // ← status NICHT überschreiben
          snapshot: data,
        }
      : a
  );
  localStorage.setItem(ANGEBOTE_KEY, JSON.stringify(aktuell));
}
```

- [ ] **Schritt 3: setAngebotStatus + getAngeboteByKunde + deleteAngebot hinzufügen**

Am Ende von `storage.js` einfügen:
```js
export function setAngebotStatus(id, status) {
  const aktuell = loadAngebote().map(a =>
    a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a
  );
  localStorage.setItem(ANGEBOTE_KEY, JSON.stringify(aktuell));
}

export function getAngeboteByKunde(kundeId, kundeDisplay) {
  return loadAngebote().filter(a =>
    (kundeId && a.kundeId === kundeId) ||
    (kundeDisplay && a.kundeDisplay === kundeDisplay)
  );
}

export function deleteAngebot(id) {
  const aktuell = loadAngebote().filter(a => a.id !== id);
  localStorage.setItem(ANGEBOTE_KEY, JSON.stringify(aktuell));
}
```

Hinweis: Falls `deleteAngebot` bereits existiert, nicht doppelt einfügen.

- [ ] **Schritt 4: Build prüfen**

```bash
npm run build 2>&1 | grep -E "error|✓"
```

- [ ] **Schritt 5: Commit**

```bash
git add src/lib/storage.js
git commit -m "feat: extend storage with status, kundeId, setAngebotStatus, getAngeboteByKunde"
```

---

## Task 3: StatusBadge + StatusDropdown

**Files:**
- Create: `src/components/StatusBadge.jsx`
- Create: `src/components/StatusDropdown.jsx`

- [ ] **Schritt 1: StatusBadge anlegen**

```jsx
// src/components/StatusBadge.jsx
import { getStatus } from '../lib/statusConfig';

export default function StatusBadge({ status }) {
  const cfg = getStatus(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
```

- [ ] **Schritt 2: StatusDropdown anlegen**

```jsx
// src/components/StatusDropdown.jsx
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { STATUS_LIST, getStatus } from '../lib/statusConfig';

export default function StatusDropdown({ status, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cfg = getStatus(status);

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold
          transition-opacity ${cfg.bg} ${cfg.text}
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        {cfg.label}
        {!disabled && <ChevronDown size={11} />}
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 bg-white rounded-xl shadow-xl border border-slate-100 py-1 min-w-[160px]">
          {STATUS_LIST.map(s => (
            <button
              key={s.value}
              onClick={() => { onChange(s.value); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-slate-50
                ${s.value === status ? 'font-semibold bg-slate-50' : ''}`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
              <span className={s.text}>{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Schritt 3: Build prüfen**

```bash
npm run build 2>&1 | grep -E "error|✓"
```

- [ ] **Schritt 4: Commit**

```bash
git add src/components/StatusBadge.jsx src/components/StatusDropdown.jsx
git commit -m "feat: add StatusBadge and StatusDropdown components"
```

---

## Task 4: Sidebar

**Files:**
- Create: `src/components/Sidebar.jsx`

- [ ] **Schritt 1: Sidebar anlegen**

```jsx
// src/components/Sidebar.jsx
import { LayoutDashboard, FileText, Users, Settings } from 'lucide-react';

const MAIN_NAV = [
  { id: 'dashboard',  label: 'Dashboard', icon: LayoutDashboard },
  { id: 'angebote',   label: 'Angebote',  icon: FileText },
  { id: 'kunden',     label: 'Kunden',    icon: Users },
];

function NavItem({ id, label, icon: Icon, active, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left group
        ${active
          ? 'bg-slate-800 border border-slate-700 text-white'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
        }`}
    >
      <Icon size={16} className={active ? 'text-indigo-400' : 'group-hover:text-slate-300'} />
      <span className="font-medium flex-1">{label}</span>
      {count > 0 && (
        <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

export default function Sidebar({ currentView, onNavigate, counts = {} }) {
  return (
    <aside className="w-56 bg-[#0f172a] flex flex-col flex-shrink-0 h-screen border-r border-slate-800">
      {/* Logo */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-900/50">
            <FileText size={15} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight tracking-tight">AngebotsTool</div>
            <div className="text-[11px] text-slate-500">by Objektrausch</div>
          </div>
        </div>
      </div>

      {/* Hauptnavigation */}
      <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
        {MAIN_NAV.map(item => (
          <NavItem
            key={item.id}
            {...item}
            active={
              currentView === item.id ||
              (item.id === 'angebote' && currentView === 'angebot-editor')
            }
            count={counts[item.id] || 0}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </nav>

      {/* Einstellungen unten */}
      <div className="p-3 border-t border-slate-800/80">
        <NavItem
          id="einstellungen"
          label="Einstellungen"
          icon={Settings}
          active={currentView === 'einstellungen'}
          onClick={() => onNavigate('einstellungen')}
        />
      </div>
    </aside>
  );
}
```

- [ ] **Schritt 2: Build prüfen**

```bash
npm run build 2>&1 | grep -E "error|✓"
```

- [ ] **Schritt 3: Commit**

```bash
git add src/components/Sidebar.jsx
git commit -m "feat: add Sidebar navigation component"
```

---

## Task 5: KundenPicker — Inline-Kundenauswahl für Editor

**Files:**
- Create: `src/components/KundenPicker.jsx`

- [ ] **Schritt 1: KundenPicker anlegen**

```jsx
// src/components/KundenPicker.jsx
import { useState, useRef, useEffect } from 'react';
import { Search, BookUser, X, UserCheck } from 'lucide-react';
import { loadKunden } from '../lib/storage';

export default function KundenPicker({ onSelect, onManage }) {
  const [open, setOpen] = useState(false);
  const [suche, setSuche] = useState('');
  const ref = useRef(null);
  const kunden = loadKunden();

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const gefiltert = kunden.filter(k => {
    const q = suche.toLowerCase();
    return (k.firma + k.name + k.ort + k.email).toLowerCase().includes(q);
  });

  function handleSelect(k) {
    onSelect(k);
    setOpen(false);
    setSuche('');
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600
          border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100
          hover:border-indigo-400 transition-all"
      >
        <BookUser size={15} />
        Aus Adressbuch
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 w-80 overflow-hidden">
          {/* Suche */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                autoFocus
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm
                  focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                placeholder="Suche…"
                value={suche}
                onChange={e => setSuche(e.target.value)}
              />
            </div>
          </div>

          {/* Liste */}
          <div className="max-h-60 overflow-y-auto">
            {gefiltert.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                {suche ? 'Kein Treffer' : 'Noch keine Kunden gespeichert'}
              </div>
            ) : (
              gefiltert.map(k => (
                <button
                  key={k.id}
                  onClick={() => handleSelect(k)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left border-b border-slate-50 last:border-0"
                >
                  <UserCheck size={14} className="text-indigo-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{k.firma || k.name}</div>
                    {k.firma && k.name && <div className="text-xs text-slate-400 truncate">{k.name}</div>}
                    {k.ort && <div className="text-xs text-slate-400 truncate">{k.plz} {k.ort}</div>}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={() => { setOpen(false); onManage(); }}
              className="w-full text-center text-xs text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
            >
              Alle Kunden verwalten →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Schritt 2: Build prüfen**

```bash
npm run build 2>&1 | grep -E "error|✓"
```

- [ ] **Schritt 3: Commit**

```bash
git add src/components/KundenPicker.jsx
git commit -m "feat: add KundenPicker inline customer selector"
```

---

## Task 6: View-Stubs + App.jsx Rewrite

**Files:**
- Create: `src/views/Einstellungen.jsx` (stub)
- Create: `src/views/Dashboard.jsx` (stub)
- Create: `src/views/AngebotEditor.jsx` (stub)
- Create: `src/views/AngeboteListe.jsx` (stub)
- Create: `src/views/KundenListe.jsx` (stub)
- Rewrite: `src/App.jsx`

- [ ] **Schritt 1: View-Stubs anlegen (alle 5 auf einmal)**

```jsx
// src/views/Einstellungen.jsx
export default function Einstellungen() {
  return <div className="p-8"><h1 className="text-2xl font-bold text-slate-900">Einstellungen</h1></div>;
}
```

```jsx
// src/views/Dashboard.jsx
export default function Dashboard({ navigate }) {
  return <div className="p-8"><h1 className="text-2xl font-bold text-slate-900">Dashboard</h1></div>;
}
```

```jsx
// src/views/AngebotEditor.jsx
export default function AngebotEditor({ navigate, params }) {
  return <div className="p-8"><h1 className="text-2xl font-bold text-slate-900">Angebot Editor</h1></div>;
}
```

```jsx
// src/views/AngeboteListe.jsx
export default function AngeboteListe({ navigate }) {
  return <div className="p-8"><h1 className="text-2xl font-bold text-slate-900">Angebote</h1></div>;
}
```

```jsx
// src/views/KundenListe.jsx
export default function KundenListe({ navigate }) {
  return <div className="p-8"><h1 className="text-2xl font-bold text-slate-900">Kunden</h1></div>;
}
```

- [ ] **Schritt 2: App.jsx neu schreiben**

```jsx
// src/App.jsx
import { useState, useCallback, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import AngeboteListe from './views/AngeboteListe';
import AngebotEditor from './views/AngebotEditor';
import KundenListe from './views/KundenListe';
import Einstellungen from './views/Einstellungen';
import { loadAngebote, loadKunden } from './lib/storage';

export default function App() {
  const [nav, setNav] = useState({ view: 'dashboard', params: {} });
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = useCallback((view, params = {}) => {
    setNav({ view, params });
  }, []);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const counts = useMemo(() => ({
    angebote: loadAngebote().length,
    kunden: loadKunden().length,
  }), [refreshKey]);

  function renderView() {
    const props = { navigate, onRefresh: refresh };
    switch (nav.view) {
      case 'dashboard':      return <Dashboard {...props} />;
      case 'angebote':       return <AngeboteListe {...props} />;
      case 'angebot-editor': return <AngebotEditor {...props} params={nav.params} />;
      case 'kunden':         return <KundenListe {...props} />;
      case 'einstellungen':  return <Einstellungen />;
      default:               return <Dashboard {...props} />;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        currentView={nav.view}
        onNavigate={navigate}
        counts={counts}
      />
      <main className="flex-1 overflow-y-auto">
        {renderView()}
      </main>
    </div>
  );
}
```

- [ ] **Schritt 3: Build prüfen**

```bash
npm run build 2>&1 | grep -E "error|✓"
```

- [ ] **Schritt 4: Im Browser öffnen und Navigation testen**

`http://localhost:5173` — Sidebar muss sichtbar sein, alle 4 Nav-Punkte müssen klickbar sein und die jeweilige Stub-Seite anzeigen.

- [ ] **Schritt 5: Commit**

```bash
git add src/views/ src/App.jsx
git commit -m "feat: add router shell and view stubs with sidebar navigation"
```

---

## Task 7: Einstellungen View

**Files:**
- Modify: `src/views/Einstellungen.jsx`

- [ ] **Schritt 1: Einstellungen implementieren**

```jsx
// src/views/Einstellungen.jsx
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
```

- [ ] **Schritt 2: Build + Browser-Test**

```bash
npm run build 2>&1 | grep -E "error|✓"
```
Im Browser: Einstellungen öffnen, Firmennamen eingeben → „Gespeichert"-Badge erscheint nach Eingabe.

- [ ] **Schritt 3: Commit**

```bash
git add src/views/Einstellungen.jsx
git commit -m "feat: implement Einstellungen view with auto-save"
```

---

## Task 8: Dashboard View

**Files:**
- Modify: `src/views/Dashboard.jsx`

- [ ] **Schritt 1: Dashboard implementieren**

```jsx
// src/views/Dashboard.jsx
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
```

- [ ] **Schritt 2: Build + Browser-Test**

```bash
npm run build 2>&1 | grep -E "error|✓"
```
Im Browser: Dashboard öffnen, KPI-Kacheln sichtbar, „Neues Angebot" Button navigiert zum Editor-Stub.

- [ ] **Schritt 3: Commit**

```bash
git add src/views/Dashboard.jsx
git commit -m "feat: implement Dashboard with KPIs and recent offers table"
```

---

## Task 9: AngebotEditor View

**Files:**
- Modify: `src/views/AngebotEditor.jsx`

- [ ] **Schritt 1: AngebotEditor implementieren**

```jsx
// src/views/AngebotEditor.jsx
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
```

- [ ] **Schritt 2: Build + Browser-Test**

```bash
npm run build 2>&1 | grep -E "error|✓"
```
Im Browser: „Neues Angebot" im Dashboard klicken → Editor öffnet sich. Formular ausfüllen, Speichern klicken, PDF exportieren.

- [ ] **Schritt 3: Commit**

```bash
git add src/views/AngebotEditor.jsx
git commit -m "feat: implement AngebotEditor with status, breadcrumb and KundenPicker"
```

---

## Task 10: AngeboteListe View

**Files:**
- Modify: `src/views/AngeboteListe.jsx`

- [ ] **Schritt 1: AngeboteListe implementieren**

```jsx
// src/views/AngeboteListe.jsx
import { useState, useMemo } from 'react';
import { Plus, Search, Download, Pencil, Trash2, ChevronDown } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import StatusDropdown from '../components/StatusDropdown';
import { loadAngebote, deleteAngebot, setAngebotStatus } from '../lib/storage';
import { generatePDF } from '../lib/pdfGenerator';
import { STATUS_LIST } from '../lib/statusConfig';

const TABS = [
  { id: 'alle', label: 'Alle' },
  ...STATUS_LIST.map(s => ({ id: s.value, label: s.label })),
];

function fmt(num) {
  return Number(num || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-DE');
}

export default function AngeboteListe({ navigate, onRefresh }) {
  const [angebote, setAngebote] = useState(loadAngebote);
  const [suche, setSuche] = useState('');
  const [kundeFilter, setKundeFilter] = useState('alle');
  const [aktiveTab, setAktiveTab] = useState('alle');
  const [pdfLoading, setPdfLoading] = useState(null);

  const kunden = useMemo(() => (
    [...new Set(angebote.map(a => a.kundeDisplay).filter(Boolean))].sort()
  ), [angebote]);

  const tabCounts = useMemo(() => {
    const counts = { alle: angebote.length };
    STATUS_LIST.forEach(s => {
      counts[s.value] = angebote.filter(a => (a.status || 'entwurf') === s.value).length;
    });
    return counts;
  }, [angebote]);

  const gefiltert = useMemo(() => {
    return angebote.filter(a => {
      const q = suche.toLowerCase();
      const matchSuche = !q || (
        a.angebotNr?.toLowerCase().includes(q) ||
        a.kundeDisplay?.toLowerCase().includes(q) ||
        a.betreff?.toLowerCase().includes(q)
      );
      const matchKunde = kundeFilter === 'alle' || a.kundeDisplay === kundeFilter;
      const matchTab = aktiveTab === 'alle' || (a.status || 'entwurf') === aktiveTab;
      return matchSuche && matchKunde && matchTab;
    });
  }, [angebote, suche, kundeFilter, aktiveTab]);

  function handleDelete(id) {
    if (!confirm('Angebot endgültig löschen?')) return;
    deleteAngebot(id);
    setAngebote(loadAngebote());
    onRefresh?.();
  }

  function handleStatusChange(id, status) {
    setAngebotStatus(id, status);
    setAngebote(loadAngebote());
  }

  async function handlePDF(a) {
    setPdfLoading(a.id);
    try { await generatePDF(a.snapshot); }
    catch (e) { console.error(e); }
    finally { setPdfLoading(null); }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Angebote</h1>
          <p className="text-slate-500 mt-1 text-sm">{angebote.length} Angebote gespeichert</p>
        </div>
        <button
          onClick={() => navigate('angebot-editor')}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
        >
          <Plus size={16} />
          Neues Angebot
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Filter-Leiste */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              placeholder="Suche nach Nr., Kunde, Betreff…"
              value={suche}
              onChange={e => setSuche(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="pl-3 pr-8 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none"
              value={kundeFilter}
              onChange={e => setKundeFilter(e.target.value)}
            >
              <option value="alle">Alle Kunden</option>
              {kunden.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
          </div>
        </div>

        {/* Status-Tabs */}
        <div className="flex border-b border-slate-100 px-4 bg-slate-50/50 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setAktiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex-shrink-0
                ${aktiveTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                ${aktiveTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                {tabCounts[tab.id] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Tabelle */}
        {gefiltert.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="font-medium text-slate-500">Keine Angebote gefunden</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Nummer', 'Kunde', 'Betreff', 'Datum', 'Betrag', 'Status', ''].map((h, i) => (
                  <th key={i} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50
                    ${h === 'Betrag' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {gefiltert.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => navigate('angebot-editor', { angebotId: a.id })}
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      {a.angebotNr}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-700">{a.kundeDisplay || '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-500 max-w-[180px] truncate">
                    {a.betreff || <span className="italic text-slate-300">Kein Betreff</span>}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">{formatDate(a.savedAt)}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-slate-800 text-right">{fmt(a.brutto)} €</td>
                  <td className="px-4 py-3.5">
                    <StatusDropdown
                      status={a.status || 'entwurf'}
                      onChange={s => handleStatusChange(a.id, s)}
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => navigate('angebot-editor', { angebotId: a.id })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Bearbeiten"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handlePDF(a)}
                        disabled={pdfLoading === a.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                        title="PDF exportieren"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Schritt 2: Build + Browser-Test**

```bash
npm run build 2>&1 | grep -E "error|✓"
```
Im Browser: Angebote-Seite öffnen, Status-Tabs klicken, Status per Dropdown ändern, PDF exportieren, Löschen testen.

- [ ] **Schritt 3: Commit**

```bash
git add src/views/AngeboteListe.jsx
git commit -m "feat: implement AngeboteListe with status tabs, search and inline status change"
```

---

## Task 11: KundenListe View mit Drawer

**Files:**
- Modify: `src/views/KundenListe.jsx`

- [ ] **Schritt 1: KundenListe implementieren**

```jsx
// src/views/KundenListe.jsx
import { useState, useMemo } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, UserCheck, Users,
  TrendingUp, FileText, ChevronRight, FolderOpen
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import FormField, { Input } from '../components/FormField';
import { loadKunden, saveKunden, loadAngebote } from '../lib/storage';

const leerKunde = { id: null, firma: '', name: '', strasse: '', plz: '', ort: '', email: '', telefon: '' };

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
  const [selected, setSelected] = useState(null);      // aktiver Kunde im Drawer
  const [drawerMode, setDrawerMode] = useState('view'); // 'view' | 'edit' | 'new'
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
                  onClick={() => { setDrawerMode(selected ? 'view' : 'view'); if (!selected) setDrawerMode('view'); setSelected(selected); }}
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
```

- [ ] **Schritt 2: Build + Browser-Test**

```bash
npm run build 2>&1 | grep -E "error|✓"
```
Im Browser: Kunden-Seite öffnen, neuen Kunden anlegen, Drawer testen, „Neues Angebot für diesen Kunden" klicken → Editor öffnet sich mit vorausgefüllten Kundendaten.

- [ ] **Schritt 3: Commit**

```bash
git add src/views/KundenListe.jsx
git commit -m "feat: implement KundenListe with drawer, stats and offer history"
```

---

## Task 12: Cleanup

**Files:**
- Delete: `src/components/KundenVerwaltung.jsx`
- Delete: `src/components/AngebotArchiv.jsx`

- [ ] **Schritt 1: Alte Dateien löschen**

```bash
rm "/home/tolga/Dokumente/Visual Studio Code/Objektrausch/angebots-tool/src/components/KundenVerwaltung.jsx"
rm "/home/tolga/Dokumente/Visual Studio Code/Objektrausch/angebots-tool/src/components/AngebotArchiv.jsx"
```

- [ ] **Schritt 2: Build prüfen — keine Imports mehr auf gelöschte Dateien**

```bash
npm run build 2>&1 | grep -E "error|✓"
```
Erwartet: `✓ built in` — keine Importfehler.

- [ ] **Schritt 3: Vollständiger Browser-Test**

Alle fünf Views durchklicken:
1. Dashboard — KPIs und letzte Angebote sichtbar
2. Angebote → Neues Angebot → speichern → zurück → in Liste sichtbar
3. Angebote → Status per Dropdown ändern → Tab-Filter reagiert
4. Kunden → neuen Kunden anlegen → Drawer zeigt Kontakt + Stats
5. Kunden → „Neues Angebot für diesen Kunden" → Editor mit vorausgefülltem Kunden
6. Einstellungen → Firmennamen ändern → Badge erscheint → Editor zeigt neuen Namen

- [ ] **Schritt 4: Finaler Commit**

```bash
git add -A
git commit -m "feat: complete UI redesign - sidebar navigation, 5 views, status system, customer drawer"
```
