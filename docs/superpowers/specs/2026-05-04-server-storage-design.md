# Server-seitiger Datenspeicher mit SSE-Echtzeit-Sync — Design-Dokument

**Datum:** 2026-05-04  
**Status:** Genehmigt  
**Scope:** Verlagerung von localStorage → Server-JSON + SSE-Echtzeit-Sync zwischen Browsern

---

## Problem

App-Daten (Angebote, Kunden, Firmendaten, Katalog) liegen im `localStorage` des Browsers. Da `localStorage` origin-gebunden ist, sind Daten die über die interne IP gespeichert wurden nicht sichtbar wenn die App über die externe Domain aufgerufen wird — und umgekehrt. Außerdem sehen mehrere gleichzeitig angemeldete Benutzer keine Änderungen der anderen.

---

## Ziel

- Alle App-Daten liegen auf dem Server (`/data/`)
- Jeder Browser zeigt immer denselben Stand
- Änderungen eines Users erscheinen bei allen anderen Usern sofort (ohne Neuladen)

---

## Architektur

```
Browser A                    Express-Server              Browser B
─────────                    ──────────────              ─────────
PUT /api/data/angebote  →    schreibt angebote.json
                             broadcast SSE-Event    →    empfängt Event
                                                         GET /api/data/angebote
                                                         aktualisiert State
```

### Neue Server-Datei

| Datei | Zweck |
|---|---|
| `server/data.js` | Lesen/Schreiben der 4 JSON-Datendateien |

### Neue API-Routen (in `server/index.js`)

| Route | Auth | Beschreibung |
|---|---|---|
| `GET  /api/data/:type` | requireAuth | Daten laden (`firma`, `kunden`, `angebote`, `katalog`) |
| `PUT  /api/data/:type` | requireAuth | Daten speichern (vollständiges Ersetzen) |
| `GET  /api/events` | Token als Query-Param | SSE-Stream, bleibt offen |

### Persistenz

| Datei | Inhalt |
|---|---|
| `/data/firma.json` | Firmenobjekt |
| `/data/kunden.json` | Array von Kunden |
| `/data/angebote.json` | Array von Angeboten (inkl. Snapshots) |
| `/data/katalog.json` | Array von Katalogeinträgen |

Alle Dateien liegen im selben `/data/`-Volume wie `users.json` und `config.json`.

---

## SSE-Mechanismus

- Server hält ein `Set<Response>` aller verbundenen SSE-Clients (in-memory)
- `GET /api/events?token=<jwt>` — Token wird serverseitig verifiziert, dann wird die Response in das Set eingefügt
- Bei jedem `PUT /api/data/:type` broadcastet der Server:
  ```
  data: {"dataType":"angebote"}
  ```
  an alle verbundenen Clients außer dem Sender
- Bei Verbindungsabbruch wird die Response automatisch aus dem Set entfernt (`res.on('close', ...)`)
- Browser reconnectet automatisch (SSE-Standard)

**Token-Übergabe:** `EventSource` unterstützt keine Custom-Header. Der Token wird als Query-Parameter übergeben: `/api/events?token=<jwt>`.

---

## Frontend-Änderungen

### `src/lib/storage.js` — komplett neu

Alle Funktionen werden async und erhalten `token` als ersten Parameter:

```js
// vorher (synchron, localStorage):
export function loadAngebote() { ... }
export function saveAngebot(data) { ... }

// nachher (async, API):
export async function loadAngebote(token) { ... }
export async function saveAngebot(token, data) { ... }
```

Berechnungen (netto/brutto in `saveAngebot`, `updateAngebot`) bleiben im Frontend.  
`nextAngebotNr(token)` und `nextRechnungsNr(token)` lesen die Angebote vom Server und berechnen lokal.  
`autoMarkAbgelaufen(token)` lädt Angebote, markiert abgelaufene, schreibt zurück.

### `src/App.jsx` — zentraler Daten-State + SSE

App.jsx übernimmt das zentrale Laden aller 4 Datentypen nach dem Login:

```js
const [firma, setFirma] = useState(null);
const [kunden, setKunden] = useState([]);
const [angebote, setAngebote] = useState([]);
const [katalog, setKatalog] = useState([]);
```

Nach erfolgreichem Login: alle 4 Typen vom Server laden.  
SSE-Verbindung öffnen — bei eingehendem Event den betroffenen Datentyp neu laden.

Alle Views erhalten die Daten und Setter als Props:

```jsx
<AngeboteListe
  angebote={angebote}
  kunden={kunden}
  onAngeboteChange={setAngebote}
  token={auth.token}
  ...
/>
```

### Geänderte Views

Alle Views, die aktuell `loadXxx()` / `saveXxx()` direkt aufrufen, werden umgestellt:
- `loadXxx()` → Props statt direkter Aufruf
- `saveXxx(data)` → `await saveXxx(token, data)` + lokalen State per Prop-Setter aktualisieren

Betroffene Dateien:
- `src/views/AngeboteListe.jsx`
- `src/views/AngebotEditor.jsx`
- `src/views/KundenListe.jsx`
- `src/views/Einstellungen.jsx`
- `src/views/Dashboard.jsx`

---

## Datenmigration

Kein automatischer Migrations-Code. Bestehende `localStorage`-Daten werden einmalig manuell übertragen:

1. Einstellungen → Export → Backup-JSON herunterladen
2. App-Update einspielen
3. Einstellungen → Import → Backup-JSON hochladen

Der Import-Handler in `Einstellungen.jsx` wird aktualisiert: statt `localStorage.setItem` ruft er die neuen API-Endpunkte auf.

---

## Nicht im Scope

- Konflikterkennung bei gleichzeitigen Writes (last-write-wins)
- Versionierung / Audit-Log der Datenänderungen
- Paginierung für große Angebotslisten
- Per-User-Datenisolierung (alle User sehen dieselben Daten)
