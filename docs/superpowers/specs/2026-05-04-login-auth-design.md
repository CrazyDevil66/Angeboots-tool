# Login & Authentifizierung — Design-Dokument

**Datum:** 2026-05-04  
**Status:** Genehmigt  
**Scope:** Authentifizierungs-Backend + React-Login-UI + Benutzerverwaltung + Einladungs-Flow

---

## Überblick

Das AngebotsTool wird auf einem Unraid-Server betrieben und ist aus dem Internet erreichbar. Es erhält ein vollständiges Authentifizierungssystem mit:

- Express-Backend (ersetzt nginx) für Login-API + IP-Lockout
- React Login-Screen und Setup-Screen (Erster Start)
- Rollenbasiertes Benutzersystem (Admin / Benutzer)
- Einladungs-Flow per E-Mail oder kopierbarem Link
- Erzwungene Passwortänderung bei Initialpasswörtern
- SMTP-Konfiguration in den Einstellungen

---

## Architektur

### Komponenten

```
Browser (React SPA)
  └── GET /* → Express-Backend (statische Dateien aus dist/)
  └── POST /api/login
  └── POST /api/logout
  └── GET  /api/me
  └── POST /api/users          (Admin)
  └── PATCH /api/users/:id     (Admin)
  └── DELETE /api/users/:id    (Admin)
  └── POST /api/users/:id/invite
  └── POST /api/users/:id/reset-password
  └── GET  /invite/:token      (öffentlich, kein Auth)
  └── POST /invite/:token      (öffentlich, Passwort setzen)
```

### Persistenz

| Speicherort | Inhalt |
|---|---|
| `/data/users.json` | Benutzerliste mit gehashten Passwörtern |
| `/data/config.json` | SMTP-Konfiguration |
| In-Memory Map | IP-Lockout-Zähler (zurückgesetzt bei Server-Neustart) |
| `sessionStorage` (Browser) | JWT-Token |

`/data/` wird in Unraid als Volume gemountet (`/mnt/user/appdata/angebots-tool/data`).

---

## Datenmodell

### Benutzer (`/data/users.json`)

```json
[
  {
    "id": "uuid",
    "username": "tolga",
    "email": "tolga@beispiel.de",
    "passwordHash": "$2b$10$...",
    "role": "admin",
    "mustChangePassword": false,
    "inviteToken": null,
    "inviteExpiry": null,
    "createdAt": "2026-05-04T00:00:00.000Z"
  }
]
```

### JWT-Payload

```json
{
  "userId": "uuid",
  "username": "tolga",
  "role": "admin",
  "mustChangePassword": false,
  "iat": 1234567890
}
```

JWT wird in `sessionStorage` gespeichert — läuft ab wenn das Browser-Tab geschlossen wird. Kein serverseitiger Ablauf (kein `exp` im Token).

### IP-Lockout (In-Memory)

```js
{ "1.2.3.4": { attempts: 3, lockedUntil: null } }
```

- Nach 5 Fehlversuchen: `lockedUntil = Date.now() + 15 * 60 * 1000`
- Bei erfolgreichem Login: Zähler zurückgesetzt
- Antwort bei gesperrter IP: `429 Too Many Requests`

---

## Backend (`server/`)

### Dateien

| Datei | Zweck |
|---|---|
| `server/index.js` | Express-App, statische Dateien, JWT-Middleware |
| `server/auth.js` | Login-Logik, IP-Lockout |
| `server/users.js` | Benutzer-CRUD, bcrypt, Einladungs-Token |
| `server/mailer.js` | Nodemailer-Wrapper, SMTP-Konfiguration |
| `server/package.json` | Abhängigkeiten: express, bcrypt, jsonwebtoken, nodemailer |

### Abhängigkeiten

```json
{
  "express": "^4",
  "bcrypt": "^5",
  "jsonwebtoken": "^9",
  "nodemailer": "^6"
}
```

### Umgebungsvariablen

| Variable | Zweck | Standard |
|---|---|---|
| `JWT_SECRET` | Signierungsschlüssel für JWT | Pflicht |
| `PORT` | Server-Port | `3000` |
| `DATA_DIR` | Pfad zu `/data` | `/data` |

`JWT_SECRET` wird beim ersten Start automatisch generiert und in `/data/config.json` gespeichert, falls nicht als Env-Var gesetzt.

---

## Frontend

### Neue/geänderte Dateien

| Datei | Änderung |
|---|---|
| `src/lib/auth.js` | API-Calls: login, logout, me, user-CRUD | Neu |
| `src/components/LoginScreen.jsx` | Login-Formular (dunkles Theme) | Neu |
| `src/components/SetupScreen.jsx` | Erster-Start-Admin-Anlegen | Neu |
| `src/components/ChangePasswordModal.jsx` | Erzwungener Passwort-Wechsel | Neu |
| `src/views/BenutzerVerwaltung.jsx` | Benutzerliste + Formulare | Neu |
| `src/App.jsx` | Auth-Gate ergänzt | Geändert |
| `src/views/Einstellungen.jsx` | Tab „Benutzer" + Tab „E-Mail" hinzugefügt | Geändert |

### Auth-Gate in `App.jsx`

```
App startet
  → GET /api/me (JWT aus sessionStorage)
  → 401: kein Benutzer vorhanden? → SetupScreen
  → 401: Benutzer vorhanden?      → LoginScreen
  → 200: mustChangePassword=true? → ChangePasswordModal (blockierend)
  → 200: alles ok                 → normale App
```

### Einstellungen-Tabs (nach Erweiterung)

- Firmendaten (unverändert)
- Textvorlagen (unverändert)
- Leistungen (unverändert)
- **Benutzer** *(neu, nur für Admins sichtbar)*
- **E-Mail** *(neu, nur für Admins sichtbar)*

---

## Benutzer-Tab

### Benutzerliste

Pro Eintrag:
- Avatar-Initial (farbig nach Rolle)
- Benutzername + Rolle-Badge (Admin / Benutzer) + „Du"-Badge
- Aktionen: Passwort ändern, zum Admin befördern, löschen
- Letzter Admin kann nicht gelöscht werden (Button deaktiviert)

### Neuen Benutzer anlegen

Felder: Benutzername, E-Mail-Adresse  
Buttons:
- **„Einladung senden"** — generiert Token (48h gültig), verschickt E-Mail oder zeigt Link
- **„Initialpasswort generieren"** — generiert zufälliges Passwort, zeigt es einmalig im UI, setzt `mustChangePassword: true`

---

## Einladungs-Flow

### Ablauf „Einladung senden"

1. Backend generiert `inviteToken` (UUID) und setzt `inviteExpiry = now + 48h`
2. SMTP konfiguriert → `nodemailer` verschickt E-Mail mit Link `https://<host>/invite/<token>`
3. SMTP nicht konfiguriert → Link wird im UI angezeigt (mit Kopieren-Button)
4. Benutzer öffnet Link → React-App zeigt „Passwort setzen"-Formular
5. Benutzer setzt Passwort → Token wird gelöscht, Benutzer eingeloggt

### Ablauf „Initialpasswort generieren"

1. Backend generiert zufälliges Passwort (12 Zeichen, alphanumerisch + Sonderzeichen)
2. Passwort wird gehasht gespeichert, `mustChangePassword: true` gesetzt
3. Passwort einmalig im UI angezeigt (Kopieren-Button), danach nicht mehr abrufbar
4. Beim nächsten Login: JWT enthält `mustChangePassword: true`
5. React zeigt `ChangePasswordModal` — App-Nutzung bis zur Änderung blockiert

---

## E-Mail-Tab (SMTP-Konfiguration)

Felder: SMTP-Host, Port, Benutzername, Passwort, Absender-Adresse  
Gespeichert in `/data/config.json`.  
Test-Button sendet eine Test-Mail an die eigene Adresse.  
Wenn leer → Einladungslinks werden immer im UI angezeigt.

---

## Docker

### Dockerfile (aktualisiert)

```dockerfile
# Stage 1: Frontend bauen
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Produktions-Image
FROM node:22-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY --from=frontend-builder /app/dist ./dist
COPY server/ ./server/
RUN mkdir -p /data
EXPOSE 3000
CMD ["node", "server/index.js"]
```

### Unraid Container-Einstellungen

| Feld | Wert |
|---|---|
| Repository | `DEINNAME/angebots-tool:latest` |
| Port | Host: `8765` → Container: `3000` |
| Volume | Host: `/mnt/user/appdata/angebots-tool/data` → Container: `/data` |
| Env: `JWT_SECRET` | Langer zufälliger String |

---

## Sicherheitsüberlegungen

- Passwörter mit **bcrypt** gehasht (cost factor 10)
- IP-Lockout nach **5 Fehlversuchen**, Sperre **15 Minuten**
- JWT ohne Ablaufzeit (Sitzung endet mit Browser-Tab)
- Einladungstoken nach einmaliger Nutzung sofort ungültig
- `JWT_SECRET` niemals im Image — Pflicht als Env-Var oder auto-generiert in `/data`
- Keine CSRF-Tokens nötig (SPA mit JWT-Header-Auth, kein Cookie)
- Admin-Endpunkte prüfen `role === 'admin'` serverseitig

---

## Nicht im Scope

- Passwort-Komplexitäts-Anforderungen (kein Minimum außer „nicht leer")
- Account-Lockout nach X Versuchen (nur IP-Lockout)
- Audit-Log (wer hat sich wann eingeloggt)
- Zwei-Faktor-Authentifizierung
- OAuth / SSO
