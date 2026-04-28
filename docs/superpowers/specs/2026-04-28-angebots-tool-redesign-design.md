# AngebotsTool — Vollständiges UI-Redesign

**Datum:** 2026-04-28  
**Projekt:** `~/Dokumente/Visual Studio Code/Objektrausch/angebots-tool`  
**Stack:** React + Vite + Tailwind CSS + @react-pdf/renderer (Orbitron-Font) + localStorage

---

## Ziel

Professionelles, modernes SaaS-artiges UI mit vollständig durchdachtem Kunden- und Angebotsmanagement. Ersetzt das bisherige Single-Page-Formular durch ein strukturiertes Multi-View-Tool mit Sidebar-Navigation.

---

## Visuelle Entscheidungen (aus Brainstorming)

| Entscheidung | Wahl |
|---|---|
| Navigation | Breite Sidebar mit Labels |
| Sidebar-Farbe | Dark Slate (`#0f172a`) |
| Kunden-Detail | Drawer (schiebt von rechts) |
| Angebotsliste | Kompakte Tabelle mit Status-Tabs |
| Status-System | 5 Status (Entwurf, Gesendet, Angenommen, Abgelehnt, Abgelaufen) |

---

## Architektur

### Navigation
Kein React Router. Zentraler `nav` State in `App.jsx`:
```js
{ view: 'dashboard' | 'angebote' | 'angebot-editor' | 'kunden' | 'einstellungen', params: {} }
```
`navigate(view, params = {})` wird als Prop durch alle Views gereicht.

### Dateistruktur

```
src/
  views/
    Dashboard.jsx
    AngeboteListe.jsx
    AngebotEditor.jsx
    KundenListe.jsx
    Einstellungen.jsx
  components/
    Sidebar.jsx            (neu)
    StatusBadge.jsx        (neu)
    StatusDropdown.jsx     (neu)
    FormField.jsx          (bleibt)
    PositionenTabelle.jsx  (bleibt)
    PreviewPanel.jsx       (bleibt)
    SectionCard.jsx        (bleibt)
  lib/
    storage.js             (erweitert)
    statusConfig.js        (neu)
    pdfGenerator.jsx       (bleibt)
    defaultData.js         (bleibt)
  App.jsx                  (Rewrite: Router-Shell)

ENTFERNT:
  components/KundenVerwaltung.jsx
  components/AngebotArchiv.jsx
```

---

## Datenmodell

### Angebote (localStorage: `objektrausch_angebote`)
```js
{
  id: string,              // UUID
  savedAt: string,         // ISO-Datum
  updatedAt: string,       // ISO-Datum (bei Aktualisierung)
  angebotNr: string,
  datum: string,
  betreff: string,
  kundeDisplay: string,    // "Müller GmbH" (Anzeigename)
  kundeId: string | null,  // Verknüpfung mit Adressbuch-Kunden
  netto: number,
  brutto: number,
  mwstSatz: number,
  status: 'entwurf' | 'gesendet' | 'angenommen' | 'abgelehnt' | 'abgelaufen',
  snapshot: { ...vollständige Formulardaten }
}
```
Rückwärtskompatibilität: Einträge ohne `status` werden als `'entwurf'` behandelt.

### Kunden (localStorage: `objektrausch_kunden`)
```js
{
  id: string,
  createdAt: string,       // NEU: ISO-Datum
  firma: string,
  name: string,
  strasse: string,
  plz: string,
  ort: string,
  email: string,
  telefon: string,
}
```
Statistiken (Umsatz, Anzahl, Quote) werden live aus Angeboten berechnet.

### Neue Storage-Funktionen
```js
setAngebotStatus(id, status)     // Nur Status ändern
getAngeboteByKunde(kundeId, kundeDisplay)
  // Alle Angebote eines Kunden — matched per kundeId (neu) ODER kundeDisplay (Rückwärtskompatibilität)
```

### Status-Konfiguration (`statusConfig.js`)
```js
{
  entwurf:    { label: 'Entwurf',     bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400'  },
  gesendet:   { label: 'Gesendet',    bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500'   },
  angenommen: { label: 'Angenommen',  bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500'},
  abgelehnt:  { label: 'Abgelehnt',   bg: 'bg-red-50',      text: 'text-red-600',     dot: 'bg-red-400'    },
  abgelaufen: { label: 'Abgelaufen',  bg: 'bg-orange-50',   text: 'text-orange-700',  dot: 'bg-orange-400' },
}
```

---

## Views

### App.jsx (Router-Shell)
- Hält `nav` State
- Rendert `<Sidebar>` + aktive View
- Layout: `flex h-screen` — Sidebar fix links, Content scrollbar rechts

### Sidebar.jsx
- Hintergrund: `#0f172a` (Dark Slate)
- Logo + Brand oben
- Nav-Einträge: Dashboard · Angebote (mit Zähler) · Kunden (mit Zähler)
- Unten: Einstellungen
- Aktiver Eintrag: `bg-slate-800 border border-slate-700`, Indigo-Icon
- Inaktiver Eintrag: `text-slate-400`, hover `text-white bg-slate-800/50`

### Dashboard
**KPI-Kacheln (4x):**
- Gesamtumsatz (Brutto aller angenommenen Angebote)
- Offene Angebote (Status: Entwurf + Gesendet)
- Erfolgsquote (Angenommen / (Angenommen + Abgelehnt) × 100%)
- Kunden gesamt

**Letzte Angebote:** Tabelle mit letzten 5 Einträgen (Nr., Kunde, Betrag, Status-Badge)

**Quick Action:** „+ Neues Angebot" Button navigiert zu `angebot-editor`

### AngeboteListe
**Header:** Titel „Angebote" + „+ Neues Angebot"-Button

**Filter-Leiste:**
- Suchfeld (Nummer, Kunde, Betreff)
- Kunden-Filter Dropdown

**Status-Tabs:** Alle · Entwurf · Gesendet · Angenommen · Abgelehnt · Abgelaufen (je mit Anzahl)

**Tabelle:**
| Spalte | Inhalt |
|---|---|
| Nr. | Angebotsnummer, klickbar |
| Kunde | Firmenname / Name |
| Betreff | Angebotsbetreff |
| Datum | Erstellungsdatum |
| Betrag | Brutto in € |
| Status | `<StatusBadge>` |
| Aktionen | Bearbeiten · PDF · Status-Dropdown · Löschen |

Status per `<StatusDropdown>` direkt in der Zeile änderbar (kein Öffnen des Editors nötig).

### AngebotEditor
**Breadcrumb:** `Angebote > Neues Angebot` oder `Angebote > A-2026-003`

**Header-Aktionsleiste:**
- `<StatusDropdown>` — aktueller Status, änderbar
- „Speichern" / „Aktualisieren" Button (kontextabhängig)
- „PDF exportieren" Button

**Formular-Sektionen (aufklappbar):**
1. Angebots-Informationen (Nr., Datum, Gültig bis, MwSt.)
2. Ihre Firmendaten (read-only aus Einstellungen, Link zu Einstellungen)
3. Kundendaten (Adressbuch-Button + manuelle Felder)
4. Anschreiben (Betreff, Einleitungstext)
5. Positionen (PositionenTabelle)
6. Hinweise & Zahlungsbedingungen

**Rechte Spalte:** Live-Vorschau (PreviewPanel) bleibt erhalten.

**Laden:** Wenn `params.angebotId` gesetzt → Snapshot aus Storage laden.  
**Prefill:** Wenn `params.prefillKunde` gesetzt → Kundendaten vorausfüllen.

### KundenListe
**Header:** Titel „Kunden" + „+ Neuer Kunde"-Button

**Suchleiste:** Filter nach Firma, Name, Ort, E-Mail

**Tabelle:**
| Spalte | Inhalt |
|---|---|
| Name | Firma (fett) + Ansprechpartner |
| Ort | PLZ + Ort |
| E-Mail | klickbar (mailto) |
| Angebote | Anzahl gesamt |
| Umsatz | Summe angenommener Angebote |
| Aktionen | Bearbeiten · Löschen |

„Bearbeiten" in der Tabellenzeile öffnet den Drawer im Edit-Modus (kein separates Modal).
„Löschen" zeigt Bestätigungsdialog; verhindert kein Löschen bei vorhandenen Angeboten — Angebote bleiben erhalten (kundeId bleibt, kundeDisplay zeigt gespeicherten Namen).

**Kunden-Drawer (von rechts, 380px):**
- Header: Firmenname + Schließen-Button
- Kundendaten-Block (kompakt, mit „Bearbeiten"-Button)
- Stats: Angebote gesamt · Umsatz · Erfolgsquote
- Angebots-Verlauf: kompakte Liste aller Angebote mit Status-Badge, klickbar zum Öffnen
- CTA: „+ Neues Angebot für diesen Kunden" → navigiert zu Editor mit prefillKunde

**Kunden-Formular:** Inline als Drawer-Zustand (nicht separates Modal). „Neu anlegen" und „Bearbeiten" öffnen Formularfelder im selben Drawer.

### Einstellungen
- Firmendaten-Formular (identisch wie bisher)
- Auto-Speicherung in localStorage bei jeder Änderung
- „Gespeichert"-Badge (2,5s sichtbar)

---

## Komponenten

### StatusBadge
```jsx
<StatusBadge status="angenommen" />
// → grüner Badge: "Angenommen"
```
Rendert farbigen Pill mit Dot-Indikator. Liest Farben aus `statusConfig.js`.

### StatusDropdown
```jsx
<StatusDropdown status="gesendet" onChange={s => setAngebotStatus(id, s)} />
// → Klickbarer Badge öffnet Dropdown mit allen 5 Optionen
```
Ersetzt den bisherigen Status in der Tabellen-Zeile und im Editor-Header.

---

## Beibehaltene Funktionen
- PDF-Export mit Orbitron-Font (unverändert)
- Firmendaten persistent in localStorage
- Kunden im Adressbuch speichern/bearbeiten
- Live-Vorschau im Angebot-Editor
- Angebote speichern/aktualisieren mit Status-History

---

## Was entfällt
- `KundenVerwaltung.jsx` (Modal) → KundenListe-View
- `AngebotArchiv.jsx` (Modal) → AngeboteListe-View
- „Zurücksetzen"-Button im globalen Header → nur noch im Editor selbst
- Archiv-Zähler-Badge im Header → Navigation über Sidebar
