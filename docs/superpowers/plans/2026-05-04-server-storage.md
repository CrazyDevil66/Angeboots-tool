# Server-seitiger Datenspeicher mit SSE-Echtzeit-Sync — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App-Daten (Angebote, Kunden, Firma, Katalog) aus localStorage → Server-JSON-Dateien verlagern; alle Browser sehen immer denselben Stand; Änderungen erscheinen bei anderen Usern sofort via SSE.

**Architecture:** `server/data.js` übernimmt atomares JSON-I/O. Drei neue Express-Routen (GET/PUT `/api/data/:type`, GET `/api/events`). `src/lib/storage.js` wird komplett async auf API-Calls umgestellt. `App.jsx` hält die vier Daten-States zentral und verwaltet die SSE-Verbindung. Alle Views erhalten Daten + Setter als Props.

**Tech Stack:** Node.js fs (atomare tmp→rename Schreibweise), Express SSE (text/event-stream), React useState/useEffect, native EventSource-API

---

## Dateiübersicht

| Datei | Änderung |
|---|---|
| `server/data.js` | **Neu** — atomares JSON lesen/schreiben |
| `server/tests/data.test.js` | **Neu** — Tests für data.js |
| `server/index.js` | **Ändern** — 3 neue Routen + SSE-Broadcast |
| `src/lib/storage.js` | **Ersetzen** — async API-Client, pure Helpers |
| `src/App.jsx` | **Ändern** — zentraler State, SSE, loadAllData |
| `src/views/Dashboard.jsx` | **Ändern** — Props statt loadAngebote/loadKunden |
| `src/views/AngeboteListe.jsx` | **Ändern** — Props + async Handler |
| `src/views/KundenListe.jsx` | **Ändern** — Props + async Handler |
| `src/components/KundenPicker.jsx` | **Ändern** — kunden-Prop statt loadKunden() |
| `src/views/AngebotEditor.jsx` | **Ändern** — Props + async Handler |
| `src/views/Einstellungen.jsx` | **Ändern** — Props + debounced async Saves |

---

## Task 1: server/data.js — Atomares JSON-I/O

**Files:**
- Create: `server/data.js`
- Create: `server/tests/data.test.js`

- [ ] **Step 1: Testdatei anlegen**

```js
// server/tests/data.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'data-test-'));
process.env.DATA_DIR = tmp;

// Modul nach Setzen der Env-Var laden
delete require.cache[require.resolve('../data')];
const { readData, writeData, VALID_TYPES } = require('../data');

// Ungültiger Typ → Fehler
assert.throws(() => readData('xyz'), /Ungültiger/);
assert.throws(() => writeData('xyz', []), /Ungültiger/);

// firma: Default null, kunden/angebote/katalog: Default []
assert.strictEqual(readData('firma'), null);
assert.deepStrictEqual(readData('kunden'), []);
assert.deepStrictEqual(readData('angebote'), []);
assert.deepStrictEqual(readData('katalog'), []);

// Schreiben und wieder lesen
writeData('firma', { name: 'Test GmbH' });
assert.deepStrictEqual(readData('firma'), { name: 'Test GmbH' });

writeData('kunden', [{ id: '1', name: 'Kunde A' }]);
assert.deepStrictEqual(readData('kunden'), [{ id: '1', name: 'Kunde A' }]);

// VALID_TYPES enthält alle 4 Typen
assert.ok(VALID_TYPES.has('firma'));
assert.ok(VALID_TYPES.has('kunden'));
assert.ok(VALID_TYPES.has('angebote'));
assert.ok(VALID_TYPES.has('katalog'));
assert.strictEqual(VALID_TYPES.size, 4);

// Tmp-Dir aufräumen
fs.rmSync(tmp, { recursive: true });

console.log('✓ data.js: alle Tests bestanden');
```

- [ ] **Step 2: Tests ausführen und Fehler bestätigen**

```bash
cd /home/tolga/Dokumente/Visual\ Studio\ Code/Objektrausch/angebots-tool
node server/tests/data.test.js
```

Erwartetes Ergebnis: `Error: Cannot find module '../data'`

- [ ] **Step 3: server/data.js implementieren**

```js
// server/data.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/data';
const VALID_TYPES = new Set(['firma', 'kunden', 'angebote', 'katalog']);

function dataFile(type) {
  return path.join(DATA_DIR, `${type}.json`);
}

function readData(type) {
  if (!VALID_TYPES.has(type)) throw new Error('Ungültiger Datentyp');
  try {
    return JSON.parse(fs.readFileSync(dataFile(type), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return type === 'firma' ? null : [];
    throw e;
  }
}

function writeData(type, data) {
  if (!VALID_TYPES.has(type)) throw new Error('Ungültiger Datentyp');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = dataFile(type) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, dataFile(type));
}

module.exports = { readData, writeData, VALID_TYPES };
```

- [ ] **Step 4: Tests bestätigen**

```bash
node server/tests/data.test.js
```

Erwartetes Ergebnis: `✓ data.js: alle Tests bestanden`

- [ ] **Step 5: Commit**

```bash
git add server/data.js server/tests/data.test.js
git commit -m "feat: add server/data.js — atomic JSON file I/O for app data"
```

---

## Task 2: server/index.js — Neue Routen + SSE

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: Failing-Test formulieren (manuell)**

Die neuen Routen sind vorhanden wenn curl folgendes liefert (nach dem nächsten Start):
- `curl -H "Authorization: Bearer <token>" http://localhost:3000/api/data/angebote` → `[]`
- `curl -X PUT -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '[]' http://localhost:3000/api/data/angebote` → `{"ok":true}`
- `curl "http://localhost:3000/api/events?token=invalid"` → `{"error":"Ungültiger Token"}`

- [ ] **Step 2: dataStore importieren und SSE-State in server/index.js einfügen**

Nach der letzten `require`-Zeile am Anfang der Datei einfügen:

```js
const dataStore = require('./data');
```

Nach `const JWT_SECRET = getJwtSecret();` folgende SSE-Infrastruktur einfügen:

```js
const sseClients = new Set();

function broadcastDataUpdate(dataType, excludeRes) {
  const msg = `data: ${JSON.stringify({ dataType })}\n\n`;
  for (const client of sseClients) {
    if (client === excludeRes) continue;
    try { client.write(msg); } catch { sseClients.delete(client); }
  }
}
```

- [ ] **Step 3: Drei neue Routen vor dem Static-Files-Block einfügen**

Den Block `// Static files + SPA fallback` suchen und direkt davor die neuen Routen einfügen:

```js
// ── Daten-API ────────────────────────────────────────────────────────────────

app.get('/api/events', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Token fehlt' });
  try { jwt.verify(token, JWT_SECRET); } catch {
    return res.status(401).json({ error: 'Ungültiger Token' });
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(':\n\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

app.get('/api/data/:type', requireAuth, (req, res) => {
  const { type } = req.params;
  if (!dataStore.VALID_TYPES.has(type)) return res.status(400).json({ error: 'Ungültiger Typ' });
  try {
    res.json(dataStore.readData(type));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/data/:type', requireAuth, (req, res) => {
  const { type } = req.params;
  if (!dataStore.VALID_TYPES.has(type)) return res.status(400).json({ error: 'Ungültiger Typ' });
  try {
    dataStore.writeData(type, req.body);
    broadcastDataUpdate(type, res);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

- [ ] **Step 4: Server starten und Routen manuell testen**

```bash
cd /home/tolga/Dokumente/Visual\ Studio\ Code/Objektrausch/angebots-tool
node server/index.js
```

In einer zweiten Shell:
```bash
# Login um Token zu holen
TOKEN=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tolga","password":"<dein-passwort>"}' | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token))")

# Daten lesen
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/data/angebote

# Daten schreiben
curl -s -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '[]' http://localhost:3000/api/data/angebote

# Ungültiger Token für SSE
curl -s "http://localhost:3000/api/events?token=invalid"
```

Erwartetes Ergebnis: GET → `[]`, PUT → `{"ok":true}`, SSE → `{"error":"Ungültiger Token"}`

- [ ] **Step 5: Commit**

```bash
git add server/index.js
git commit -m "feat: add GET/PUT /api/data/:type and GET /api/events SSE to server"
```

---

## Task 3: src/lib/storage.js — Kompletter Ersatz als async API-Client

**Files:**
- Modify: `src/lib/storage.js` (komplettes Ersetzen)

- [ ] **Step 1: Neue storage.js schreiben**

Den gesamten Inhalt von `src/lib/storage.js` ersetzen:

```js
// src/lib/storage.js

// ── HTTP-Helfer ───────────────────────────────────────────────────────────────

async function apiGet(token, endpoint) {
  const res = await fetch(`/api${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${endpoint} fehlgeschlagen (${res.status})`);
  return res.json();
}

async function apiPut(token, endpoint, body) {
  const res = await fetch(`/api${endpoint}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${endpoint} fehlgeschlagen (${res.status})`);
  return res.json();
}

// ── Laden ─────────────────────────────────────────────────────────────────────

export async function loadFirma(token) {
  return apiGet(token, '/data/firma');
}

export async function loadKunden(token) {
  return apiGet(token, '/data/kunden');
}

export async function loadAngebote(token) {
  return apiGet(token, '/data/angebote');
}

export async function loadKatalog(token) {
  return apiGet(token, '/data/katalog');
}

// ── Primitiv-Saves ────────────────────────────────────────────────────────────

export async function saveFirma(token, firma) {
  await apiPut(token, '/data/firma', firma);
}

export async function saveKunden(token, kunden) {
  await apiPut(token, '/data/kunden', kunden);
}

export async function saveKatalog(token, items) {
  await apiPut(token, '/data/katalog', items);
}

export async function saveAngebote(token, angebote) {
  await apiPut(token, '/data/angebote', angebote);
}

// ── Angebot-Mutations (lesen + mutieren + schreiben in einem Schritt) ─────────

function buildAngebotEintrag(data) {
  const netto = data.positionen.reduce((s, p) => s + Number(p.menge) * Number(p.einzelpreis), 0);
  const brutto = netto * (1 + Number(data.mwstSatz) / 100);
  return {
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
}

function applyPatch(angebote, id, updates) {
  return angebote.map(a => a.id === id ? { ...a, ...updates } : a);
}

async function mutateAngebote(token, fn) {
  const current = await loadAngebote(token);
  const updated = fn(current);
  await saveAngebote(token, updated);
  return updated;
}

// Neues Angebot anlegen — gibt { eintrag, updated } zurück
export async function saveAngebot(token, data) {
  const eintrag = buildAngebotEintrag(data);
  const updated = await mutateAngebote(token, arr => [eintrag, ...arr]);
  return { eintrag, updated };
}

// Bestehendes Angebot aktualisieren — gibt updated-Array zurück
export async function updateAngebot(token, id, data, status) {
  const netto = data.positionen.reduce((s, p) => s + Number(p.menge) * Number(p.einzelpreis), 0);
  const brutto = netto * (1 + Number(data.mwstSatz) / 100);
  return mutateAngebote(token, arr => applyPatch(arr, id, {
    updatedAt: new Date().toISOString(),
    angebotNr: data.angebotNr,
    datum: data.datum,
    betreff: data.betreff,
    kundeDisplay: data.kunde.firma || data.kunde.name || '—',
    kundeId: data.kunde?.id || null,
    netto,
    brutto,
    mwstSatz: data.mwstSatz,
    status,
    snapshot: data,
  }));
}

export async function setAngebotStatus(token, id, status) {
  return mutateAngebote(token, arr =>
    applyPatch(arr, id, { status, updatedAt: new Date().toISOString() })
  );
}

export async function deleteAngebot(token, id) {
  return mutateAngebote(token, arr => arr.filter(a => a.id !== id));
}

export async function setMahnung(token, id, mahnStufe, mahnungNr, mahndatum, mahnGebuehren) {
  return mutateAngebote(token, arr => applyPatch(arr, id, {
    mahnStufe, mahnungNr, mahndatum, mahnGebuehren,
    status: 'gemahnt',
    updatedAt: new Date().toISOString(),
  }));
}

export async function setBezahlt(token, id) {
  return mutateAngebote(token, arr => applyPatch(arr, id, {
    status: 'bezahlt',
    bezahltAm: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

export async function setAngebotRechnung(token, id, rechnungsNr, rechnungsDatum, rechnungsBetreff, rechnungsEinleitung, rechnungsHinweise) {
  return mutateAngebote(token, arr => applyPatch(arr, id, {
    rechnungsNr, rechnungsDatum, rechnungsBetreff, rechnungsEinleitung, rechnungsHinweise,
    updatedAt: new Date().toISOString(),
  }));
}

// ── Pure Helper-Funktionen (kein token, kein API-Call) ────────────────────────

export function nextAngebotNr(angebote) {
  const year = new Date().getFullYear();
  const prefix = `A-${year}-`;
  let max = 0;
  for (const a of angebote) {
    if (a.angebotNr?.startsWith(prefix)) {
      const n = parseInt(a.angebotNr.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export function nextRechnungsNr(angebote) {
  const year = new Date().getFullYear();
  const prefix = `R-${year}-`;
  let max = 0;
  for (const a of angebote) {
    if (a.rechnungsNr?.startsWith(prefix)) {
      const n = parseInt(a.rechnungsNr.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

function parseDEDate(str) {
  if (!str) return null;
  const [d, m, y] = str.split('.');
  if (!d || !m || !y) return null;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

// Gibt { updated: Angebot[], changed: boolean } zurück
export function autoMarkAbgelaufen(angebote) {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  let changed = false;
  const updated = angebote.map(a => {
    if (a.status !== 'entwurf' && a.status !== 'gesendet') return a;
    const datum = parseDEDate(a.snapshot?.gueltigBis);
    if (!datum) return a;
    datum.setHours(0, 0, 0, 0);
    if (datum < heute) {
      changed = true;
      return { ...a, status: 'abgelaufen', updatedAt: new Date().toISOString() };
    }
    return a;
  });
  return { updated, changed };
}

export function getAngeboteByKunde(angebote, kundeId, kundeDisplay) {
  return angebote.filter(a =>
    (kundeId && a.kundeId === kundeId) ||
    (kundeDisplay && a.kundeDisplay === kundeDisplay)
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/storage.js
git commit -m "feat: rewrite storage.js as async API client with pure helper functions"
```

---

## Task 4: src/App.jsx — Zentraler Daten-State + SSE-Verbindung

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: App.jsx komplett neu schreiben**

```jsx
// src/App.jsx
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import AngeboteListe from './views/AngeboteListe';
import AngebotEditor from './views/AngebotEditor';
import KundenListe from './views/KundenListe';
import Einstellungen from './views/Einstellungen';
import LoginScreen from './components/LoginScreen';
import SetupScreen from './components/SetupScreen';
import InviteScreen from './components/InviteScreen';
import ChangePasswordModal from './components/ChangePasswordModal';
import {
  loadFirma, loadKunden, loadAngebote, loadKatalog,
  saveAngebote, autoMarkAbgelaufen,
} from './lib/storage';
import { apiSetupRequired, apiMe, getToken, saveToken, clearToken } from './lib/auth';

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch { return null; }
}

export default function App() {
  const [auth, setAuth] = useState({ loading: true, setupRequired: false, token: null, user: null });
  const [nav, setNav] = useState({ view: 'dashboard', params: {} });

  // ── Zentraler Daten-State ──
  const [firma,    setFirma]    = useState(null);
  const [kunden,   setKunden]   = useState([]);
  const [angebote, setAngebote] = useState([]);
  const [katalog,  setKatalog]  = useState([]);

  const eventSourceRef = useRef(null);

  // ── Alle 4 Datentypen nach Login laden ──
  async function loadAllData(token) {
    const [f, k, a, kat] = await Promise.all([
      loadFirma(token),
      loadKunden(token),
      loadAngebote(token),
      loadKatalog(token),
    ]);
    setFirma(f);
    setKunden(k);
    setKatalog(kat);
    const { updated, changed } = autoMarkAbgelaufen(a);
    if (changed) {
      await saveAngebote(token, updated);
      setAngebote(updated);
    } else {
      setAngebote(a);
    }
  }

  // ── SSE-Verbindung öffnen ──
  function openSSE(token) {
    if (eventSourceRef.current) eventSourceRef.current.close();
    const es = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
    es.onmessage = async (e) => {
      const { dataType } = JSON.parse(e.data);
      if (dataType === 'firma')    setFirma(await loadFirma(token));
      if (dataType === 'kunden')   setKunden(await loadKunden(token));
      if (dataType === 'angebote') setAngebote(await loadAngebote(token));
      if (dataType === 'katalog')  setKatalog(await loadKatalog(token));
    };
    es.onerror = () => {};
    eventSourceRef.current = es;
  }

  // ── Auth-Gate beim Start ──
  useEffect(() => {
    const inviteMatch = window.location.pathname.match(/^\/invite\/(.+)$/);
    if (inviteMatch) {
      setAuth({ loading: false, setupRequired: false, token: null, user: null });
      return;
    }
    (async () => {
      const setupRequired = await apiSetupRequired();
      if (setupRequired) {
        setAuth({ loading: false, setupRequired: true, token: null, user: null });
        return;
      }
      const token = getToken();
      if (token) {
        const user = await apiMe(token);
        if (user) {
          setAuth({ loading: false, setupRequired: false, token, user });
          await loadAllData(token);
          openSSE(token);
          return;
        }
        clearToken();
      }
      setAuth({ loading: false, setupRequired: false, token: null, user: null });
    })();
    return () => { if (eventSourceRef.current) eventSourceRef.current.close(); };
  }, []);

  async function handleAuthComplete(token) {
    const payload = parseJwt(token);
    setAuth({ loading: false, setupRequired: false, token, user: payload });
    if (!payload?.mustChangePassword) {
      await loadAllData(token);
      openSSE(token);
    }
  }

  function handleLogout() {
    if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; }
    clearToken();
    setFirma(null);
    setKunden([]);
    setAngebote([]);
    setKatalog([]);
    setAuth({ loading: false, setupRequired: false, token: null, user: null });
  }

  const navigate = useCallback((view, params = {}) => setNav({ view, params }), []);

  const counts = useMemo(() => ({
    angebote: angebote.length,
    kunden: kunden.length,
  }), [angebote, kunden]);

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const inviteMatch = window.location.pathname.match(/^\/invite\/(.+)$/);
  if (inviteMatch) return <InviteScreen inviteToken={inviteMatch[1]} onComplete={handleAuthComplete} />;
  if (auth.setupRequired) return <SetupScreen onComplete={handleAuthComplete} />;
  if (!auth.token) return <LoginScreen onComplete={handleAuthComplete} />;
  if (auth.user?.mustChangePassword) return <ChangePasswordModal token={auth.token} onComplete={handleAuthComplete} />;

  const sharedProps = {
    navigate,
    token: auth.token,
    currentUser: auth.user,
    firma, setFirma,
    kunden, setKunden,
    angebote, setAngebote,
    katalog, setKatalog,
  };

  function renderView() {
    switch (nav.view) {
      case 'dashboard':      return <Dashboard {...sharedProps} />;
      case 'angebote':       return <AngeboteListe {...sharedProps} />;
      case 'angebot-editor': return <AngebotEditor {...sharedProps} params={nav.params} />;
      case 'kunden':         return <KundenListe {...sharedProps} />;
      case 'einstellungen':  return <Einstellungen {...sharedProps} onLogout={handleLogout} />;
      default:               return <Dashboard {...sharedProps} />;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentView={nav.view} onNavigate={navigate} counts={counts} />
      <main className="flex-1 overflow-y-auto">{renderView()}</main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: centralize data state in App.jsx + SSE connection"
```

---

## Task 5: src/views/Dashboard.jsx — Props statt loadAngebote/loadKunden

**Files:**
- Modify: `src/views/Dashboard.jsx`

- [ ] **Step 1: Import aus storage entfernen, Props-Signatur anpassen**

Zeile 7 (`import { loadAngebote, loadKunden } from '../lib/storage';`) entfernen.

Funktion-Signatur von:
```js
export default function Dashboard({ navigate }) {
```
zu:
```js
export default function Dashboard({ navigate, angebote, kunden }) {
```

- [ ] **Step 2: useMemo-Aufrufe die loadAngebote/loadKunden aufrufen ersetzen**

```js
// ALT (Zeilen 108–109):
const angebote = useMemo(() => loadAngebote(), []);
const kunden   = useMemo(() => loadKunden(),   []);

// NEU:
// angebote und kunden kommen als Props — kein useMemo nötig
```

Die beiden Zeilen komplett löschen. `useMemo` im Import behalten (wird noch für `stats`, `monate`, `handlung` genutzt).

- [ ] **Step 3: Manuell testen**

Server + Vite starten, Dashboard öffnen → KPI-Zahlen sollen korrekt angezeigt werden.

- [ ] **Step 4: Commit**

```bash
git add src/views/Dashboard.jsx
git commit -m "feat: Dashboard receives angebote/kunden as props instead of loading from storage"
```

---

## Task 6: src/views/AngeboteListe.jsx — Props + async Handler

**Files:**
- Modify: `src/views/AngeboteListe.jsx`

- [ ] **Step 1: Import und Props anpassen**

Import-Zeile:
```js
// ALT:
import { loadAngebote, deleteAngebot, setAngebotStatus } from '../lib/storage';

// NEU:
import { deleteAngebot, setAngebotStatus } from '../lib/storage';
```

Props-Signatur:
```js
// ALT:
export default function AngeboteListe({ navigate, onRefresh }) {

// NEU:
export default function AngeboteListe({ navigate, angebote, setAngebote, token }) {
```

- [ ] **Step 2: useState + Handler umstellen**

```js
// ALT (Zeile 19):
const [angebote, setAngebote] = useState(loadAngebote);

// NEU — Zeile komplett löschen (angebote kommt als Prop)
```

```js
// ALT handleDelete:
function handleDelete(id) {
  if (!confirm('Angebot endgültig löschen?')) return;
  deleteAngebot(id);
  setAngebote(loadAngebote());
  onRefresh?.();
}

// NEU:
async function handleDelete(id) {
  if (!confirm('Angebot endgültig löschen?')) return;
  const updated = await deleteAngebot(token, id);
  setAngebote(updated);
}
```

```js
// ALT handleStatusChange:
function handleStatusChange(id, status) {
  setAngebotStatus(id, status);
  setAngebote(loadAngebote());
}

// NEU:
async function handleStatusChange(id, status) {
  const updated = await setAngebotStatus(token, id, status);
  setAngebote(updated);
}
```

- [ ] **Step 3: Manuell testen**

Angebot löschen, Status ändern → Liste aktualisiert sich ohne Reload.

- [ ] **Step 4: Commit**

```bash
git add src/views/AngeboteListe.jsx
git commit -m "feat: AngeboteListe uses props and async storage handlers"
```

---

## Task 7: src/views/KundenListe.jsx + KundenPicker.jsx — Props + async Handler

**Files:**
- Modify: `src/views/KundenListe.jsx`
- Modify: `src/components/KundenPicker.jsx`

- [ ] **Step 1: KundenPicker.jsx umstellen**

```jsx
// ALT (Zeilen 3–9):
import { loadKunden } from '../lib/storage';

export default function KundenPicker({ onSelect, onManage }) {
  const [open, setOpen] = useState(false);
  const [suche, setSuche] = useState('');
  const ref = useRef(null);
  const kunden = loadKunden();

// NEU:
export default function KundenPicker({ onSelect, onManage, kunden = [] }) {
  const [open, setOpen] = useState(false);
  const [suche, setSuche] = useState('');
  const ref = useRef(null);
```

Import `loadKunden` entfernen.

- [ ] **Step 2: KundenListe.jsx Import und Props anpassen**

```js
// ALT:
import { loadKunden, saveKunden, loadAngebote } from '../lib/storage';

// NEU:
import { saveKunden } from '../lib/storage';
```

```js
// ALT:
export default function KundenListe({ navigate, onRefresh }) {
  const [kunden, setKunden] = useState(loadKunden);
  ...
  const angebote = loadAngebote();

// NEU:
export default function KundenListe({ navigate, kunden, setKunden, angebote, token }) {
```

Die Zeilen `const [kunden, setKunden] = useState(loadKunden);` und `const angebote = loadAngebote();` entfernen.

- [ ] **Step 3: handleSave + handleDelete in KundenListe async machen**

```js
// ALT handleSave:
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

// NEU:
async function handleSave(k) {
  const aktuell = kunden.some(c => c.id === k.id)
    ? kunden.map(c => c.id === k.id ? k : c)
    : [...kunden, k];
  await saveKunden(token, aktuell);
  setKunden(aktuell);
  setSelected(k);
  setDrawerMode('view');
}
```

```js
// ALT handleDelete:
function handleDelete(k) {
  if (!confirm(`...`)) return;
  const aktuell = kunden.filter(c => c.id !== k.id);
  setKunden(aktuell);
  saveKunden(aktuell);
  setSelected(null);
  onRefresh?.();
}

// NEU:
async function handleDelete(k) {
  if (!confirm(`Kunden "${k.firma || k.name}" löschen? Angebote bleiben erhalten.`)) return;
  const aktuell = kunden.filter(c => c.id !== k.id);
  await saveKunden(token, aktuell);
  setKunden(aktuell);
  setSelected(null);
}
```

- [ ] **Step 4: Manuell testen**

Neuen Kunden anlegen, bearbeiten, löschen → Liste aktualisiert sich.

- [ ] **Step 5: Commit**

```bash
git add src/views/KundenListe.jsx src/components/KundenPicker.jsx
git commit -m "feat: KundenListe and KundenPicker use props and async storage handlers"
```

---

## Task 8: src/views/AngebotEditor.jsx — Props + async Handler

**Files:**
- Modify: `src/views/AngebotEditor.jsx`

Das ist die komplexeste Datei: `initData` war synchron und hat `loadAngebote()` direkt aufgerufen. Die vielen `useState(() => loadAngebote().find(...))` werden durch einmaliges Berechnen aus den Props ersetzt.

- [ ] **Step 1: Imports anpassen**

```js
// ALT:
import {
  loadFirma, loadAngebote, saveAngebot, updateAngebot, setAngebotStatus,
  setAngebotRechnung, setMahnung, setBezahlt, nextAngebotNr, loadKatalog
} from '../lib/storage';

// NEU:
import {
  saveAngebot, updateAngebot, setAngebotStatus,
  setAngebotRechnung, setMahnung, setBezahlt, nextAngebotNr,
} from '../lib/storage';
```

- [ ] **Step 2: initData-Funktion auf Props umstellen**

```js
// ALT:
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
      id: k.id || null, firma: k.firma || '', name: k.name || '',
      strasse: k.strasse || '', plz: k.plz || '', ort: k.ort || '',
      email: k.email || '', telefon: k.telefon || '',
    };
  }
  return base;
}

// NEU:
function initData(params, firmaData, angeboteData) {
  const firma = firmaData || defaultData.firma;
  if (params?.angebotId) {
    const gespeichert = angeboteData.find(a => a.id === params.angebotId);
    if (gespeichert) return { ...gespeichert.snapshot, firma };
  }
  const datum = new Date().toLocaleDateString('de-DE');
  const base = {
    ...defaultData,
    angebotNr: nextAngebotNr(angeboteData),
    datum,
    gueltigBis: add14Days(datum),
    betreff: 'Angebot',
    firma,
    hinweise: firma.hinweiseAngebot ?? defaultData.firma.hinweiseAngebot,
  };
  if (params?.prefillKunde) {
    const k = params.prefillKunde;
    base.kunde = {
      id: k.id || null, firma: k.firma || '', name: k.name || '',
      strasse: k.strasse || '', plz: k.plz || '', ort: k.ort || '',
      email: k.email || '', telefon: k.telefon || '',
    };
  }
  return base;
}
```

- [ ] **Step 3: Komponenten-Signatur und useState-Initialisierung umstellen**

```js
// ALT:
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
  const [rechnungsBetreff, setRechnungsBetreff] = useState(() => {
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
  const [rechnungsHinweise, setRechnungsHinweise] = useState(() => {
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

// NEU:
export default function AngebotEditor({ navigate, params = {}, firma, kunden, angebote, setAngebote, katalog, token }) {
  const gespeichert = params?.angebotId ? angebote.find(a => a.id === params.angebotId) : null;

  const [data, setData] = useState(() => initData(params, firma, angebote));
  const [aktivesId, setAktivesId] = useState(params?.angebotId || null);
  const [status, setStatus] = useState(gespeichert?.status || 'entwurf');
  const [rechnungsNr, setRechnungsNr] = useState(gespeichert?.rechnungsNr || null);
  const [rechnungsDatum, setRechnungsDatum] = useState(gespeichert?.rechnungsDatum || null);
  const [rechnungsBetreff, setRechnungsBetreff] = useState(gespeichert?.rechnungsBetreff || null);
  const [rechnungsEinleitung, setRechnungsEinleitung] = useState(gespeichert?.rechnungsEinleitung || null);
  const [rechnungsHinweise, setRechnungsHinweise] = useState(gespeichert?.rechnungsHinweise || null);
  const [mahnStufe, setMahnStufe] = useState(gespeichert?.mahnStufe || 0);
  const [mahnGebuehren, setMahnGebuehren] = useState(gespeichert?.mahnGebuehren || []);
```

- [ ] **Step 4: handleSpeichern async machen**

```js
// ALT:
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

// NEU:
async function handleSpeichern() {
  if (aktivesId) {
    const updated = await updateAngebot(token, aktivesId, data, status);
    setAngebote(updated);
  } else {
    const { eintrag, updated } = await saveAngebot(token, data);
    setAktivesId(eintrag.id);
    setAngebote(updated);
  }
  setSavedHint(true);
  clearTimeout(savedTimer.current);
  savedTimer.current = setTimeout(() => setSavedHint(false), 2500);
}
```

- [ ] **Step 5: handleStatusChange async machen**

```js
// ALT:
function handleStatusChange(neuerStatus) {
  setStatus(neuerStatus);
  if (aktivesId) setAngebotStatus(aktivesId, neuerStatus);
}

// NEU:
async function handleStatusChange(neuerStatus) {
  setStatus(neuerStatus);
  if (aktivesId) {
    const updated = await setAngebotStatus(token, aktivesId, neuerStatus);
    setAngebote(updated);
  }
}
```

- [ ] **Step 6: handleRechnungBestaetigt async machen**

```js
// ALT:
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
  ...
}

// NEU:
async function handleRechnungBestaetigt({ rechnungsNr: nr, datum: rDatum, betreff: rBetreff, einleitung: rEinleitung, hinweise: rHinweise }) {
  setRechnungModalOffen(false);
  setRechnungsNr(nr);
  setRechnungsDatum(rDatum);
  setRechnungsBetreff(rBetreff);
  setRechnungsEinleitung(rEinleitung);
  setRechnungsHinweise(rHinweise);

  let id = aktivesId;
  if (!id) {
    const { eintrag, updated } = await saveAngebot(token, data);
    id = eintrag.id;
    setAktivesId(id);
    setAngebote(updated);
  }
  await setAngebotStatus(token, id, 'angenommen');
  const updated = await setAngebotRechnung(token, id, nr, rDatum, rBetreff, rEinleitung, rHinweise);
  setAngebote(updated);
  setStatus('angenommen');

  const rechnungData = { ...data, rechnungsNr: nr, rechnungsDatum: rDatum, betreff: rBetreff, einleitung: rEinleitung, hinweise: rHinweise };
  setPdfLoading(true);
  try { await generatePDF(rechnungData, 'rechnung'); }
  catch (e) { console.error(e); }
  finally { setPdfLoading(false); }
}
```

- [ ] **Step 7: handleMahnungBestaetigt async machen**

```js
// ALT:
async function handleMahnungBestaetigt({ stufe, mahnungNr, datum, frist, mahngebuehr, text }) {
  setMahnModalOffen(false);
  setMahnStufe(stufe);
  setStatus('gemahnt');
  const vorherigeGebuehren = mahnGebuehren.filter(g => g.stufe < stufe && g.betrag > 0);
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
  ...
}

// NEU:
async function handleMahnungBestaetigt({ stufe, mahnungNr, datum, frist, mahngebuehr, text }) {
  setMahnModalOffen(false);
  setMahnStufe(stufe);
  setStatus('gemahnt');
  const vorherigeGebuehren = mahnGebuehren.filter(g => g.stufe < stufe && g.betrag > 0);
  const neueGebuehren = [
    ...mahnGebuehren.filter(g => g.stufe !== stufe),
    { stufe, betrag: Number(mahngebuehr || 0) },
  ];
  setMahnGebuehren(neueGebuehren);

  let id = aktivesId;
  if (!id) {
    const { eintrag, updated } = await saveAngebot(token, data);
    id = eintrag.id;
    setAktivesId(id);
    setAngebote(updated);
  }
  const updated = await setMahnung(token, id, stufe, mahnungNr, datum, neueGebuehren);
  setAngebote(updated);

  const mahnungData = { stufe, mahnungNr, datum, frist, mahngebuehr, text, vorherigeGebuehren };
  setPdfLoading(true);
  try { await generatePDF({ ...data, rechnungsNr, rechnungsDatum }, 'mahnung', mahnungData); }
  catch (e) { console.error(e); }
  finally { setPdfLoading(false); }
}
```

- [ ] **Step 8: handleBezahltMarkieren async machen**

```js
// ALT:
function handleBezahltMarkieren() {
  if (!confirm('Angebot/Rechnung als bezahlt markieren?')) return;
  setStatus('bezahlt');
  if (aktivesId) setBezahlt(aktivesId);
  onRefresh?.();
}

// NEU:
async function handleBezahltMarkieren() {
  if (!confirm('Angebot/Rechnung als bezahlt markieren?')) return;
  setStatus('bezahlt');
  if (aktivesId) {
    const updated = await setBezahlt(token, aktivesId);
    setAngebote(updated);
  }
}
```

- [ ] **Step 9: handleReset und KatalogPicker anpassen**

```js
// ALT handleReset:
function handleReset() {
  if (confirm('Eingaben zurücksetzen?')) {
    setData({ ...defaultData, firma: loadFirma() || defaultData.firma });
    setAktivesId(null);
    setStatus('entwurf');
  }
}

// NEU:
function handleReset() {
  if (confirm('Eingaben zurücksetzen?')) {
    setData({ ...defaultData, firma: firma || defaultData.firma });
    setAktivesId(null);
    setStatus('entwurf');
  }
}
```

```jsx
// ALT KatalogPicker-Aufruf (um Zeile 620):
{katalogPickerOffen && (
  <KatalogPicker
    katalog={loadKatalog()}
    onAdd={...}
    onClose={() => setKatalogPickerOffen(false)}
  />
)}

// NEU:
{katalogPickerOffen && (
  <KatalogPicker
    katalog={katalog}
    onAdd={...}
    onClose={() => setKatalogPickerOffen(false)}
  />
)}
```

KundenPicker erhält `kunden` als Prop — in AngebotEditor (`<KundenPicker>`) ergänzen:
```jsx
// ALT:
<KundenPicker
  onSelect={handleKundeAuswahl}
  onManage={() => navigate('kunden')}
/>

// NEU:
<KundenPicker
  kunden={kunden}
  onSelect={handleKundeAuswahl}
  onManage={() => navigate('kunden')}
/>
```

- [ ] **Step 10: Manuell testen**

Neues Angebot anlegen und speichern. Bestehendes Angebot öffnen, ändern, speichern. Status-Dropdown ändern. Rechnung erstellen.

- [ ] **Step 11: Commit**

```bash
git add src/views/AngebotEditor.jsx
git commit -m "feat: AngebotEditor uses props and async storage handlers"
```

---

## Task 9: src/views/Einstellungen.jsx — Props + debounced async Saves

**Files:**
- Modify: `src/views/Einstellungen.jsx`

- [ ] **Step 1: Import anpassen**

```js
// ALT:
import { loadFirma, saveFirma, loadKatalog, saveKatalog, loadKunden, saveKunden, loadAngebote } from '../lib/storage';

// NEU:
import { saveFirma, saveKatalog, saveKunden, saveAngebote } from '../lib/storage';
```

- [ ] **Step 2: Props-Signatur und State-Initialisierung umstellen**

```js
// ALT:
export default function Einstellungen({ token, currentUser, onLogout }) {
  const [firma,   setFirma]   = useState(() => loadFirma() || defaultData.firma);
  const [katalog, setKatalog] = useState(() => loadKatalog());

// NEU:
export default function Einstellungen({ token, currentUser, onLogout, firma, setFirma, kunden, setKunden, angebote, setAngebote, katalog, setKatalog }) {
```

Die beiden `useState`-Zeilen für `firma` und `katalog` entfernen.

Für firma braucht Einstellungen einen lokalen `saved`-Indicator — der bleibt:
```js
const [saved, setSaved] = useState(false);
```

- [ ] **Step 3: Debounced Auto-Save für Firma einbauen**

```js
// ALT useEffect:
useEffect(() => {
  saveFirma(firma);
  triggerSaved();
  return () => clearTimeout(timer.current);
}, [firma]);

// NEU:
const saveTimer = useRef(null);
useEffect(() => {
  if (!token || !firma) return;
  clearTimeout(saveTimer.current);
  saveTimer.current = setTimeout(async () => {
    await saveFirma(token, firma);
    triggerSaved();
  }, 500);
  return () => clearTimeout(saveTimer.current);
}, [firma]);
```

Hinweis: `timer` (für den Saved-Indicator) bleibt wie bisher. `saveTimer` ist neu für den API-Debounce.

- [ ] **Step 4: Katalog-Funktionen async machen**

```js
// ALT:
function katalogUpdate(id, field, value) {
  const neu = katalog.map(item => item.id === id ? { ...item, [field]: value } : item);
  setKatalog(neu);
  saveKatalog(neu);
  triggerSaved();
}

function katalogAdd() {
  const neu = [...katalog, { id: crypto.randomUUID(), bezeichnung: '', beschreibung: '', einheit: 'Stk.', einzelpreis: 0 }];
  setKatalog(neu);
  saveKatalog(neu);
  triggerSaved();
}

function katalogDelete(id) {
  const neu = katalog.filter(item => item.id !== id);
  setKatalog(neu);
  saveKatalog(neu);
  triggerSaved();
}

// NEU:
async function katalogUpdate(id, field, value) {
  const neu = katalog.map(item => item.id === id ? { ...item, [field]: value } : item);
  setKatalog(neu);
  await saveKatalog(token, neu);
  triggerSaved();
}

async function katalogAdd() {
  const neu = [...katalog, { id: crypto.randomUUID(), bezeichnung: '', beschreibung: '', einheit: 'Stk.', einzelpreis: 0 }];
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
```

- [ ] **Step 5: Export auf Props umstellen**

```js
// ALT:
function handleExport() {
  const backup = {
    exportedAt: new Date().toISOString(),
    firma: loadFirma(),
    kunden: loadKunden(),
    angebote: loadAngebote(),
    katalog: loadKatalog(),
  };
  ...
}

// NEU:
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
```

- [ ] **Step 6: Import-Handler auf API umstellen**

```js
// ALT:
function handleImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.firma)    saveFirma(data.firma);
      if (data.kunden)   saveKunden(data.kunden);
      if (data.katalog)  saveKatalog(data.katalog);
      if (data.angebote) localStorage.setItem('objektrausch_angebote', JSON.stringify(data.angebote));
      window.location.reload();
    } catch {
      alert('Ungültige Backup-Datei.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// NEU:
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
```

- [ ] **Step 7: Manuell testen**

Firmendaten ändern → nach 500ms automatisch gespeichert (Saved-Indikator erscheint). Katalog hinzufügen/löschen. Export herunterladen. Import mit dem gerade exportierten Backup testen.

- [ ] **Step 8: Commit**

```bash
git add src/views/Einstellungen.jsx
git commit -m "feat: Einstellungen uses props and async saves with debounce for firma"
```

---

## Task 10: Integrations-Test + localStorage-Cleanup

**Files:**
- Modify: `src/App.jsx` (Zeile für `localStorage.removeItem` bereits korrekt im Task 4)

- [ ] **Step 1: Vite-Dev-Server starten**

```bash
cd /home/tolga/Dokumente/Visual\ Studio\ Code/Objektrausch/angebots-tool
npm run dev
```

Server in anderer Shell:
```bash
node server/index.js
```

- [ ] **Step 2: Integrations-Checkliste abarbeiten**

**Grundfunktionen:**
- [ ] Login → alle 4 Datentypen laden (Network-Tab: 4 × GET /api/data/...)
- [ ] Dashboard zeigt KPI-Zahlen
- [ ] Neues Angebot anlegen und speichern (Network-Tab: PUT /api/data/angebote)
- [ ] Angebot öffnen, Status ändern
- [ ] Neuen Kunden anlegen, speichern
- [ ] Katalog-Eintrag hinzufügen

**SSE-Sync:**
- [ ] Zwei Browser-Tabs öffnen (beide eingeloggt)
- [ ] In Tab 1 ein Angebot speichern → Tab 2 zeigt es in der Liste (ohne Reload)
- [ ] In Tab 2 einen Kunden anlegen → Tab 1 zeigt ihn in KundenListe (ohne Reload)

**Migration:**
- [ ] Einstellungen → Export → Backup-JSON herunterladen
- [ ] Import des Backups → Daten erscheinen sofort ohne Reload

**Kein localStorage mehr:**
- [ ] Browser-Konsole: `localStorage.getItem('objektrausch_angebote')` → `null`

- [ ] **Step 3: Finale Commit-Message**

```bash
git add .
git commit -m "feat: server-side storage + SSE real-time sync — complete implementation"
```

---

## Notizen für den Implementierer

**Race conditions in mutateAngebote:** Jede Angebot-Mutation lädt erst (`GET`) und schreibt dann (`PUT`). Bei zwei gleichzeitigen Writes (last-write-wins) ist das akzeptabel — im Scope-Dokument explizit als nicht kritisch definiert.

**Cloudflare / Proxy:** Der Express-Server hat bereits `app.set('trust proxy', 1)`. SSE-Verbindungen funktionieren hinter Cloudflare sobald `X-Accel-Buffering: no` gesetzt ist (bereits im GET /api/events Header).

**Einstellungen und firma:** `Einstellungen` bekommt `setFirma` als Prop aus App.jsx. Das bedeutet jede Keystroke ruft App.jsx's `setFirma` auf. Das ist Performance-mäßig unbedenklich, da React das effizient batchet. Der API-Save passiert erst nach 500ms Debounce.
