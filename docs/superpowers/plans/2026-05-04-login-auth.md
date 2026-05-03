# Login & Authentifizierung — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Express-Backend mit IP-Lockout, JWT-Auth und rollenbasierter Benutzerverwaltung inkl. Einladungs-Flow in das bestehende React-Frontend integrieren.

**Architecture:** Ein Node.js/Express-Server ersetzt nginx — er liefert die gebaute React-App statisch aus und stellt alle `/api/`-Routen bereit. Benutzer werden mit bcrypt-Hashes in `/data/users.json` gespeichert. Das Frontend speichert den JWT-Token in `sessionStorage` und prüft beim Start den Auth-Status.

**Tech Stack:** Node.js 22, Express 4, bcrypt 5, jsonwebtoken 9, nodemailer 6, React 19, Vite 8, Tailwind CSS 3

---

## Dateiübersicht

| Datei | Status | Verantwortlichkeit |
|---|---|---|
| `server/package.json` | Neu | Backend-Abhängigkeiten |
| `server/users.js` | Neu | Benutzer-CRUD, bcrypt, Invite-Token |
| `server/auth.js` | Neu | IP-Lockout-Logik |
| `server/mailer.js` | Neu | Nodemailer-Wrapper |
| `server/index.js` | Neu | Express-App, alle API-Routen, statische Dateien |
| `server/users.test.js` | Neu | Tests für users.js |
| `server/auth.test.js` | Neu | Tests für auth.js |
| `vite.config.js` | Geändert | Dev-Proxy für `/api` und `/invite` |
| `src/lib/auth.js` | Neu | API-Client-Funktionen |
| `src/components/LoginScreen.jsx` | Neu | Login-Formular |
| `src/components/SetupScreen.jsx` | Neu | Erster-Start-Admin-Anlegen |
| `src/components/InviteScreen.jsx` | Neu | Passwort-Setzen via Einladungslink |
| `src/components/ChangePasswordModal.jsx` | Neu | Erzwungener Passwort-Wechsel |
| `src/views/BenutzerVerwaltung.jsx` | Neu | Benutzerliste + Verwaltungsformulare |
| `src/App.jsx` | Geändert | Auth-Gate vorschalten |
| `src/views/Einstellungen.jsx` | Geändert | Tabs Benutzer + E-Mail ergänzen |
| `Dockerfile` | Geändert | Node statt nginx |
| `.dockerignore` | Geändert | server/node_modules ausschließen |
| `nginx.conf` | Gelöscht | Nicht mehr benötigt |

---

## Task 1: Backend-Verzeichnis und Abhängigkeiten

**Files:**
- Create: `server/package.json`

- [ ] **Schritt 1: server/package.json anlegen**

```json
{
  "name": "angebots-tool-server",
  "version": "1.0.0",
  "type": "commonjs",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "node --test"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2",
    "nodemailer": "^6.9.16"
  }
}
```

- [ ] **Schritt 2: Abhängigkeiten installieren**

```bash
cd server && npm install
```

Erwartete Ausgabe: `added N packages` ohne Fehler.

- [ ] **Schritt 3: Committen**

```bash
git add server/package.json server/package-lock.json
git commit -m "feat: server dependencies setup"
```

---

## Task 2: User-Storage-Modul

**Files:**
- Create: `server/users.js`
- Create: `server/users.test.js`

- [ ] **Schritt 1: Testdatei schreiben**

Erstelle `server/users.test.js`:

```js
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'users-test-'));
process.env.DATA_DIR = tmpDir;

const users = require('./users');

after(() => fs.rmSync(tmpDir, { recursive: true }));

test('createUser legt einen neuen Benutzer an', async () => {
  const user = await users.createUser({ username: 'alice', email: 'alice@test.de', role: 'admin' });
  assert.equal(user.username, 'alice');
  assert.equal(user.role, 'admin');
  assert.ok(user.id);
});

test('createUser wirft bei doppeltem Benutzernamen', async () => {
  await assert.rejects(() => users.createUser({ username: 'alice' }), /vergeben/);
});

test('setPassword und verifyPassword funktionieren', async () => {
  const user = await users.createUser({ username: 'bob' });
  await users.setPassword(user.id, 'geheim123');
  const result = await users.verifyPassword('bob', 'geheim123');
  assert.ok(result);
  assert.equal(result.username, 'bob');
});

test('verifyPassword gibt null bei falschem Passwort', async () => {
  const result = await users.verifyPassword('bob', 'falsch');
  assert.equal(result, null);
});

test('setInitialPassword setzt mustChangePassword=true', async () => {
  const user = await users.createUser({ username: 'carol' });
  const pw = await users.setInitialPassword(user.id);
  assert.equal(typeof pw, 'string');
  assert.equal(pw.length, 12);
  const fresh = users.findById(user.id);
  assert.equal(fresh.mustChangePassword, true);
});

test('setPassword setzt mustChangePassword=false', async () => {
  const user = users.findByUsername('carol');
  await users.setPassword(user.id, 'neuespasswort');
  const fresh = users.findById(user.id);
  assert.equal(fresh.mustChangePassword, false);
});

test('deleteUser verhindert Löschen des letzten Admins', async () => {
  const admin = users.findByUsername('alice');
  assert.throws(() => users.deleteUser(admin.id), /letzten Admin/);
});

test('deleteUser löscht normale Benutzer', async () => {
  const carol = users.findByUsername('carol');
  users.deleteUser(carol.id);
  assert.equal(users.findByUsername('carol'), undefined);
});

test('generateInviteToken erstellt gültigen Token', () => {
  const user = users.findByUsername('bob');
  const token = users.generateInviteToken(user.id);
  assert.ok(token);
  const found = users.findByInviteToken(token);
  assert.equal(found.username, 'bob');
});
```

- [ ] **Schritt 2: Test ausführen — muss fehlschlagen**

```bash
cd server && node --test users.test.js 2>&1 | head -5
```

Erwartete Ausgabe: `Error: Cannot find module './users'`

- [ ] **Schritt 3: server/users.js implementieren**

Erstelle `server/users.js`:

```js
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || '/data';
const USERS_FILE = () => path.join(DATA_DIR, 'users.json');

function readUsers() {
  try {
    const f = USERS_FILE();
    if (!fs.existsSync(f)) return [];
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch { return []; }
}

function writeUsers(users) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE(), JSON.stringify(users, null, 2));
}

function findById(id) {
  return readUsers().find(u => u.id === id) || null;
}

function findByUsername(username) {
  return readUsers().find(u => u.username === username);
}

function findByInviteToken(token) {
  return readUsers().find(u => u.inviteToken === token && u.inviteExpiry > Date.now()) || null;
}

async function createUser({ username, email = null, role = 'user' }) {
  const all = readUsers();
  if (all.find(u => u.username === username)) throw new Error('Benutzername bereits vergeben');
  const user = {
    id: crypto.randomUUID(),
    username,
    email,
    passwordHash: null,
    role,
    mustChangePassword: false,
    inviteToken: null,
    inviteExpiry: null,
    createdAt: new Date().toISOString(),
  };
  writeUsers([...all, user]);
  return user;
}

async function setPassword(id, password) {
  const all = readUsers();
  const idx = all.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('Benutzer nicht gefunden');
  all[idx].passwordHash = await bcrypt.hash(password, 10);
  all[idx].mustChangePassword = false;
  all[idx].inviteToken = null;
  all[idx].inviteExpiry = null;
  writeUsers(all);
}

async function setInitialPassword(id) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const password = Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  const all = readUsers();
  const idx = all.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('Benutzer nicht gefunden');
  all[idx].passwordHash = await bcrypt.hash(password, 10);
  all[idx].mustChangePassword = true;
  writeUsers(all);
  return password;
}

function generateInviteToken(id) {
  const all = readUsers();
  const idx = all.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('Benutzer nicht gefunden');
  const token = crypto.randomUUID();
  all[idx].inviteToken = token;
  all[idx].inviteExpiry = Date.now() + 48 * 60 * 60 * 1000;
  writeUsers(all);
  return token;
}

function updateUser(id, updates) {
  const all = readUsers();
  const idx = all.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('Benutzer nicht gefunden');
  for (const key of ['role', 'email']) {
    if (key in updates) all[idx][key] = updates[key];
  }
  writeUsers(all);
  return all[idx];
}

function deleteUser(id) {
  const all = readUsers();
  const target = all.find(u => u.id === id);
  if (!target) throw new Error('Benutzer nicht gefunden');
  if (target.role === 'admin' && all.filter(u => u.role === 'admin').length <= 1) {
    throw new Error('Letzten Admin kann man nicht löschen');
  }
  writeUsers(all.filter(u => u.id !== id));
}

async function verifyPassword(username, password) {
  const user = findByUsername(username);
  if (!user || !user.passwordHash) return null;
  return (await bcrypt.compare(password, user.passwordHash)) ? user : null;
}

module.exports = {
  readUsers, findById, findByUsername, findByInviteToken,
  createUser, setPassword, setInitialPassword,
  generateInviteToken, updateUser, deleteUser, verifyPassword,
};
```

- [ ] **Schritt 4: Tests ausführen — müssen grün sein**

```bash
cd server && node --test users.test.js
```

Erwartete Ausgabe: `9 tests passed`

- [ ] **Schritt 5: Committen**

```bash
git add server/users.js server/users.test.js
git commit -m "feat: user storage module with bcrypt and invite tokens"
```

---

## Task 3: IP-Lockout-Modul

**Files:**
- Create: `server/auth.js`
- Create: `server/auth.test.js`

- [ ] **Schritt 1: Testdatei schreiben**

Erstelle `server/auth.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const auth = require('./auth');

test('neue IP ist nicht gesperrt', () => {
  assert.equal(auth.checkLockout('10.0.0.1'), false);
});

test('IP wird nach 5 Fehlversuchen gesperrt', () => {
  for (let i = 0; i < 5; i++) auth.recordFailure('10.0.0.2');
  assert.equal(auth.checkLockout('10.0.0.2'), true);
});

test('IP ist nach 4 Versuchen noch nicht gesperrt', () => {
  for (let i = 0; i < 4; i++) auth.recordFailure('10.0.0.3');
  assert.equal(auth.checkLockout('10.0.0.3'), false);
});

test('clearLockout hebt Sperre auf', () => {
  for (let i = 0; i < 5; i++) auth.recordFailure('10.0.0.4');
  auth.clearLockout('10.0.0.4');
  assert.equal(auth.checkLockout('10.0.0.4'), false);
});

test('remainingLockoutSeconds > 0 bei gesperrter IP', () => {
  for (let i = 0; i < 5; i++) auth.recordFailure('10.0.0.5');
  assert.ok(auth.remainingLockoutSeconds('10.0.0.5') > 0);
});
```

- [ ] **Schritt 2: Test ausführen — muss fehlschlagen**

```bash
cd server && node --test auth.test.js 2>&1 | head -3
```

Erwartete Ausgabe: `Error: Cannot find module './auth'`

- [ ] **Schritt 3: server/auth.js implementieren**

Erstelle `server/auth.js`:

```js
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const lockouts = new Map();

function checkLockout(ip) {
  const entry = lockouts.get(ip);
  if (!entry?.lockedUntil) return false;
  if (Date.now() < entry.lockedUntil) return true;
  lockouts.delete(ip);
  return false;
}

function recordFailure(ip) {
  const entry = lockouts.get(ip) || { attempts: 0, lockedUntil: null };
  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS) entry.lockedUntil = Date.now() + LOCKOUT_MS;
  lockouts.set(ip, entry);
}

function clearLockout(ip) {
  lockouts.delete(ip);
}

function remainingLockoutSeconds(ip) {
  const entry = lockouts.get(ip);
  if (!entry?.lockedUntil) return 0;
  return Math.ceil((entry.lockedUntil - Date.now()) / 1000);
}

module.exports = { checkLockout, recordFailure, clearLockout, remainingLockoutSeconds };
```

- [ ] **Schritt 4: Tests ausführen — müssen grün sein**

```bash
cd server && node --test auth.test.js
```

Erwartete Ausgabe: `5 tests passed`

- [ ] **Schritt 5: Committen**

```bash
git add server/auth.js server/auth.test.js
git commit -m "feat: IP lockout module"
```

---

## Task 4: Mailer-Modul

**Files:**
- Create: `server/mailer.js`

- [ ] **Schritt 1: server/mailer.js erstellen**

```js
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/data';
const CONFIG_FILE = () => path.join(DATA_DIR, 'config.json');

function readConfig() {
  try {
    const f = CONFIG_FILE();
    if (!fs.existsSync(f)) return {};
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch { return {}; }
}

function getSmtpConfig() {
  return readConfig().smtp || null;
}

function createTransport(smtp) {
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port || 587,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });
}

async function sendInvite({ to, username, inviteUrl }) {
  const smtp = getSmtpConfig();
  if (!smtp?.host) return false;
  await createTransport(smtp).sendMail({
    from: smtp.from || smtp.user,
    to,
    subject: 'Einladung: AngebotsTool',
    text: `Hallo ${username},\n\ndu wurdest eingeladen. Setze dein Passwort unter:\n${inviteUrl}\n\nDer Link ist 48 Stunden gültig.`,
    html: `<p>Hallo <strong>${username}</strong>,</p><p>Setze dein Passwort:</p><p><a href="${inviteUrl}">${inviteUrl}</a></p><p>Gültig für 48 Stunden.</p>`,
  });
  return true;
}

async function sendTestMail({ to }) {
  const smtp = getSmtpConfig();
  if (!smtp?.host) throw new Error('SMTP nicht konfiguriert');
  await createTransport(smtp).sendMail({
    from: smtp.from || smtp.user,
    to,
    subject: 'Test-Mail: AngebotsTool',
    text: 'SMTP-Konfiguration funktioniert.',
  });
}

module.exports = { getSmtpConfig, sendInvite, sendTestMail };
```

- [ ] **Schritt 2: Committen**

```bash
git add server/mailer.js
git commit -m "feat: nodemailer wrapper"
```

---

## Task 5: Express-Server

**Files:**
- Create: `server/index.js`

- [ ] **Schritt 1: server/index.js erstellen**

```js
const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const users = require('./users');
const auth = require('./auth');
const mailer = require('./mailer');

const DATA_DIR = process.env.DATA_DIR || '/data';
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, '..', 'dist');

function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch { return {}; }
}

function writeConfig(update) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...readConfig(), ...update }, null, 2));
}

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const config = readConfig();
  if (!config.jwtSecret) {
    config.jwtSecret = crypto.randomBytes(48).toString('hex');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }
  return config.jwtSecret;
}

const JWT_SECRET = getJwtSecret();

function makeToken(user) {
  return jwt.sign({
    userId: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: !!user.mustChangePassword,
  }, JWT_SECRET);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Nicht authentifiziert' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Ungültiger Token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Kein Zugriff' });
  next();
}

const app = express();
app.use(express.json());

// Setup
app.get('/api/setup', (_req, res) => {
  res.json({ setupRequired: users.readUsers().length === 0 });
});

app.post('/api/setup', async (req, res) => {
  if (users.readUsers().length > 0) return res.status(400).json({ error: 'Bereits eingerichtet' });
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
  try {
    const user = await users.createUser({ username, role: 'admin' });
    await users.setPassword(user.id, password);
    res.json({ token: makeToken(users.findById(user.id)) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Auth
app.post('/api/login', async (req, res) => {
  const ip = req.ip;
  if (auth.checkLockout(ip)) {
    const secs = auth.remainingLockoutSeconds(ip);
    return res.status(429).json({ error: `IP gesperrt. Bitte ${Math.ceil(secs / 60)} Minuten warten.` });
  }
  const { username, password } = req.body;
  const user = await users.verifyPassword(username, password);
  if (!user) {
    auth.recordFailure(ip);
    return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
  }
  auth.clearLockout(ip);
  res.json({ token: makeToken(user) });
});

app.post('/api/logout', (_req, res) => res.json({ ok: true }));

app.get('/api/me', requireAuth, (req, res) => {
  const user = users.findById(req.user.userId);
  if (!user) return res.status(401).json({ error: 'Benutzer nicht gefunden' });
  res.json({ userId: user.id, username: user.username, role: user.role, mustChangePassword: !!user.mustChangePassword });
});

app.post('/api/me/password', requireAuth, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Passwort darf nicht leer sein' });
  await users.setPassword(req.user.userId, password);
  res.json({ token: makeToken(users.findById(req.user.userId)) });
});

// Users (Admin only)
app.get('/api/users', requireAuth, requireAdmin, (_req, res) => {
  res.json(users.readUsers().map(u => ({
    id: u.id, username: u.username, email: u.email, role: u.role,
    mustChangePassword: !!u.mustChangePassword, createdAt: u.createdAt,
    hasPassword: !!u.passwordHash,
  })));
});

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const { username, email } = req.body;
  if (!username) return res.status(400).json({ error: 'Benutzername fehlt' });
  try {
    const user = await users.createUser({ username, email });
    res.json({ id: user.id, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt, hasPassword: false });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const user = users.updateUser(req.params.id, req.body);
    res.json({ id: user.id, username: user.username, role: user.role, email: user.email });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    users.deleteUser(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/users/:id/invite', requireAuth, requireAdmin, async (req, res) => {
  try {
    const token = users.generateInviteToken(req.params.id);
    const config = readConfig();
    const baseUrl = process.env.BASE_URL || config.baseUrl || `http://localhost:${PORT}`;
    const inviteUrl = `${baseUrl}/invite/${token}`;
    const user = users.findById(req.params.id);
    let emailSent = false;
    if (user?.email) {
      emailSent = await mailer.sendInvite({ to: user.email, username: user.username, inviteUrl });
    }
    res.json({ inviteUrl, emailSent });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/users/:id/reset-password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const password = await users.setInitialPassword(req.params.id);
    res.json({ password });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Invite redemption
app.post('/invite/:token', async (req, res) => {
  const user = users.findByInviteToken(req.params.token);
  if (!user) return res.status(400).json({ error: 'Link ungültig oder abgelaufen' });
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Passwort fehlt' });
  await users.setPassword(user.id, password);
  res.json({ token: makeToken(users.findById(user.id)) });
});

// SMTP config
app.get('/api/config/smtp', requireAuth, requireAdmin, (req, res) => {
  const config = readConfig();
  const smtp = config.smtp || {};
  res.json({
    host: smtp.host || '', port: smtp.port || 587,
    user: smtp.user || '', pass: smtp.pass || '',
    from: smtp.from || '', baseUrl: config.baseUrl || '',
  });
});

app.post('/api/config/smtp', requireAuth, requireAdmin, (req, res) => {
  const { host, port, user, pass, from, baseUrl } = req.body;
  writeConfig({ smtp: { host, port: Number(port) || 587, user, pass, from }, baseUrl });
  res.json({ ok: true });
});

app.post('/api/config/smtp/test', requireAuth, requireAdmin, async (req, res) => {
  try {
    await mailer.sendTestMail({ to: req.body.to });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Static files + SPA fallback (muss als letztes stehen)
app.use(express.static(DIST_DIR));
app.get('*', (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));

app.listen(PORT, () => console.log(`AngebotsTool läuft auf Port ${PORT}`));
```

- [ ] **Schritt 2: Manuell testen (Server starten)**

Zuerst Frontend bauen, dann Server starten:

```bash
npm run build && node server/index.js &
```

Erwartete Ausgabe: `AngebotsTool läuft auf Port 3000`

- [ ] **Schritt 3: Setup-Endpoint prüfen**

```bash
curl -s http://localhost:3000/api/setup
```

Erwartete Ausgabe: `{"setupRequired":true}`

- [ ] **Schritt 4: Server beenden und committen**

```bash
kill %1 2>/dev/null; git add server/index.js
git commit -m "feat: express server with all API routes"
```

---

## Task 6: Vite-Proxy für Entwicklung

**Files:**
- Modify: `vite.config.js`

- [ ] **Schritt 1: vite.config.js anpassen**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/invite': 'http://localhost:3000',
    },
  },
})
```

- [ ] **Schritt 2: Committen**

```bash
git add vite.config.js
git commit -m "feat: vite dev proxy for backend API"
```

---

## Task 7: Frontend Auth-Client

**Files:**
- Create: `src/lib/auth.js`

- [ ] **Schritt 1: src/lib/auth.js erstellen**

```js
const BASE = '';

async function post(url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler');
  return data;
}

async function get(url, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + url, { headers });
  if (!res.ok) return null;
  return res.json();
}

async function del(url, token) {
  const res = await fetch(BASE + url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler');
  return data;
}

async function patch(url, body, token) {
  const res = await fetch(BASE + url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler');
  return data;
}

export const apiSetupRequired  = ()              => get('/api/setup').then(d => d?.setupRequired ?? false);
export const apiSetup          = (u, p)          => post('/api/setup', { username: u, password: p });
export const apiLogin          = (u, p)          => post('/api/login', { username: u, password: p });
export const apiMe             = (t)             => get('/api/me', t);
export const apiChangePassword = (t, p)          => post('/api/me/password', { password: p }, t);
export const apiGetUsers       = (t)             => get('/api/users', t);
export const apiCreateUser     = (t, d)          => post('/api/users', d, t);
export const apiUpdateUser     = (t, id, d)      => patch(`/api/users/${id}`, d, t);
export const apiDeleteUser     = (t, id)         => del(`/api/users/${id}`, t);
export const apiInviteUser     = (t, id)         => post(`/api/users/${id}/invite`, {}, t);
export const apiResetPassword  = (t, id)         => post(`/api/users/${id}/reset-password`, {}, t);
export const apiGetSmtp        = (t)             => get('/api/config/smtp', t);
export const apiSaveSmtp       = (t, d)          => post('/api/config/smtp', d, t);
export const apiTestSmtp       = (t, to)         => post('/api/config/smtp/test', { to }, t);
export const apiRedeemInvite   = (token, p)      => post(`/invite/${token}`, { password: p });

export const getToken  = ()  => sessionStorage.getItem('auth_token');
export const saveToken = (t) => sessionStorage.setItem('auth_token', t);
export const clearToken = () => sessionStorage.removeItem('auth_token');
```

- [ ] **Schritt 2: Committen**

```bash
git add src/lib/auth.js
git commit -m "feat: frontend API client"
```

---

## Task 8: LoginScreen-Komponente

**Files:**
- Create: `src/components/LoginScreen.jsx`

- [ ] **Schritt 1: src/components/LoginScreen.jsx erstellen**

```jsx
import { useState } from 'react';
import { FileText } from 'lucide-react';
import { apiLogin, saveToken } from '../lib/auth';

export default function LoginScreen({ onComplete }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await apiLogin(username, password);
      saveToken(token);
      onComplete(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="relative">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <form
          onSubmit={handleSubmit}
          className="relative bg-slate-800 border border-slate-700 rounded-2xl p-10 w-80 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/50">
              <FileText size={16} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm leading-tight">AngebotsTool</div>
              <div className="text-[11px] text-slate-500">by Objektrausch</div>
            </div>
          </div>

          <h1 className="text-lg font-bold text-white mb-1">Anmelden</h1>
          <p className="text-slate-400 text-sm mb-6">Bitte melde dich mit deinen Zugangsdaten an.</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-300 text-xs mb-4">
              {error}
            </div>
          )}

          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
            Benutzername
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm mb-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            placeholder="z. B. tolga"
            autoFocus
            required
          />

          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
            Passwort
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm mb-6 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            placeholder="••••••••"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? 'Wird geprüft…' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Schritt 2: Committen**

```bash
git add src/components/LoginScreen.jsx
git commit -m "feat: login screen component"
```

---

## Task 9: SetupScreen-Komponente

**Files:**
- Create: `src/components/SetupScreen.jsx`

- [ ] **Schritt 1: src/components/SetupScreen.jsx erstellen**

```jsx
import { useState } from 'react';
import { FileText } from 'lucide-react';
import { apiSetup, saveToken } from '../lib/auth';

export default function SetupScreen({ onComplete }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) return setError('Passwörter stimmen nicht überein.');
    setError('');
    setLoading(true);
    try {
      const { token } = await apiSetup(username, password);
      saveToken(token);
      onComplete(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="relative">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <form
          onSubmit={handleSubmit}
          className="relative bg-slate-800 border border-slate-700 rounded-2xl p-10 w-80 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/50">
              <FileText size={16} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm leading-tight">AngebotsTool</div>
              <div className="text-[11px] text-slate-500">by Objektrausch</div>
            </div>
          </div>

          <h1 className="text-lg font-bold text-white mb-1">Erstkonfiguration</h1>
          <p className="text-slate-400 text-sm mb-6">Lege den ersten Admin-Account an.</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-300 text-xs mb-4">
              {error}
            </div>
          )}

          {[
            { label: 'Benutzername', value: username, set: setUsername, type: 'text', placeholder: 'admin' },
            { label: 'Passwort', value: password, set: setPassword, type: 'password', placeholder: '••••••••' },
            { label: 'Passwort bestätigen', value: confirm, set: setConfirm, type: 'password', placeholder: '••••••••' },
          ].map(({ label, value, set, type, placeholder }) => (
            <div key={label} className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                {label}
              </label>
              <input
                type={type}
                value={value}
                onChange={e => set(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder={placeholder}
                required
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? 'Wird angelegt…' : 'Admin anlegen & starten'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Schritt 2: Committen**

```bash
git add src/components/SetupScreen.jsx
git commit -m "feat: setup screen for first-run admin creation"
```

---

## Task 10: InviteScreen-Komponente

**Files:**
- Create: `src/components/InviteScreen.jsx`

- [ ] **Schritt 1: src/components/InviteScreen.jsx erstellen**

```jsx
import { useState } from 'react';
import { FileText } from 'lucide-react';
import { apiRedeemInvite, saveToken } from '../lib/auth';

export default function InviteScreen({ inviteToken, onComplete }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) return setError('Passwörter stimmen nicht überein.');
    setError('');
    setLoading(true);
    try {
      const { token } = await apiRedeemInvite(inviteToken, password);
      saveToken(token);
      onComplete(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="relative">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <form
          onSubmit={handleSubmit}
          className="relative bg-slate-800 border border-slate-700 rounded-2xl p-10 w-80 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/50">
              <FileText size={16} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm leading-tight">AngebotsTool</div>
              <div className="text-[11px] text-slate-500">by Objektrausch</div>
            </div>
          </div>

          <h1 className="text-lg font-bold text-white mb-1">Passwort setzen</h1>
          <p className="text-slate-400 text-sm mb-6">Wähle ein Passwort für deinen neuen Account.</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-300 text-xs mb-4">
              {error}
            </div>
          )}

          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Passwort</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm mb-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            placeholder="Mindestens 8 Zeichen"
            required
          />

          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Bestätigen</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm mb-6 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            placeholder="••••••••"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? 'Wird gespeichert…' : 'Passwort speichern & einloggen'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Schritt 2: Committen**

```bash
git add src/components/InviteScreen.jsx
git commit -m "feat: invite redemption screen"
```

---

## Task 11: ChangePasswordModal-Komponente

**Files:**
- Create: `src/components/ChangePasswordModal.jsx`

- [ ] **Schritt 1: src/components/ChangePasswordModal.jsx erstellen**

```jsx
import { useState } from 'react';
import { apiChangePassword, saveToken } from '../lib/auth';

export default function ChangePasswordModal({ token, onComplete }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) return setError('Passwörter stimmen nicht überein.');
    setError('');
    setLoading(true);
    try {
      const { token: newToken } = await apiChangePassword(token, password);
      saveToken(newToken);
      onComplete(newToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 border border-slate-700 rounded-2xl p-10 w-80 shadow-2xl"
      >
        <div className="text-3xl mb-4">🔐</div>
        <h1 className="text-lg font-bold text-white mb-1">Passwort ändern</h1>
        <p className="text-slate-400 text-sm mb-4">
          Du verwendest ein temporäres Passwort. Wähle jetzt ein eigenes.
        </p>

        <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2 text-amber-300 text-xs mb-5">
          ⚠ Du kannst die App erst nutzen, wenn du dein Passwort geändert hast.
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-300 text-xs mb-4">
            {error}
          </div>
        )}

        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Neues Passwort</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm mb-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          placeholder="Mindestens 8 Zeichen"
          required
          autoFocus
        />

        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Bestätigen</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm mb-6 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          placeholder="••••••••"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
        >
          {loading ? 'Wird gespeichert…' : 'Passwort speichern & weiter'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Schritt 2: Committen**

```bash
git add src/components/ChangePasswordModal.jsx
git commit -m "feat: forced password change modal"
```

---

## Task 12: App.jsx Auth-Gate

**Files:**
- Modify: `src/App.jsx`

- [ ] **Schritt 1: App.jsx ersetzen**

```jsx
import { useState, useCallback, useMemo, useEffect } from 'react';
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
import { loadAngebote, loadKunden, autoMarkAbgelaufen } from './lib/storage';
import { apiSetupRequired, apiMe, getToken, saveToken, clearToken } from './lib/auth';

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch { return null; }
}

export default function App() {
  const [auth, setAuth] = useState({ loading: true, setupRequired: false, token: null, user: null });
  const [nav, setNav] = useState({ view: 'dashboard', params: {} });
  const [refreshKey, setRefreshKey] = useState(0);

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
          return;
        }
        clearToken();
      }
      setAuth({ loading: false, setupRequired: false, token: null, user: null });
    })();
  }, []);

  useEffect(() => { if (auth.user) autoMarkAbgelaufen(); }, [auth.user]);

  function handleAuthComplete(token) {
    const payload = parseJwt(token);
    setAuth({ loading: false, setupRequired: false, token, user: payload });
  }

  function handleLogout() {
    clearToken();
    setAuth({ loading: false, setupRequired: false, token: null, user: null });
  }

  const navigate = useCallback((view, params = {}) => setNav({ view, params }), []);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);
  const counts = useMemo(() => ({
    angebote: loadAngebote().length,
    kunden: loadKunden().length,
  }), [refreshKey]);

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

  function renderView() {
    const props = { navigate, onRefresh: refresh, token: auth.token, currentUser: auth.user };
    switch (nav.view) {
      case 'dashboard':      return <Dashboard {...props} />;
      case 'angebote':       return <AngeboteListe {...props} />;
      case 'angebot-editor': return <AngebotEditor {...props} params={nav.params} />;
      case 'kunden':         return <KundenListe {...props} />;
      case 'einstellungen':  return <Einstellungen token={auth.token} currentUser={auth.user} onLogout={handleLogout} />;
      default:               return <Dashboard {...props} />;
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

- [ ] **Schritt 2: Visuell testen**

Backend starten: `node server/index.js`  
Frontend starten: `npm run dev`  
Browser öffnen: `http://localhost:5173`

Erwartete Anzeige: Setup-Screen (da noch keine Benutzer angelegt sind).

Admin anlegen, einloggen → normale App erscheint.

- [ ] **Schritt 3: Committen**

```bash
git add src/App.jsx
git commit -m "feat: auth gate in App.jsx"
```

---

## Task 13: BenutzerVerwaltung-View

**Files:**
- Create: `src/views/BenutzerVerwaltung.jsx`

- [ ] **Schritt 1: src/views/BenutzerVerwaltung.jsx erstellen**

```jsx
import { useState, useEffect, useCallback } from 'react';
import { Trash2, RefreshCw, Mail, Shield, Key, Copy, Check } from 'lucide-react';
import {
  apiGetUsers, apiCreateUser, apiUpdateUser, apiDeleteUser,
  apiInviteUser, apiResetPassword,
} from '../lib/auth';

function Avatar({ username, role }) {
  const colors = role === 'admin'
    ? 'bg-gradient-to-br from-indigo-600 to-violet-600'
    : 'bg-gradient-to-br from-slate-500 to-slate-600';
  return (
    <div className={`w-9 h-9 rounded-full ${colors} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
      {username[0].toUpperCase()}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function handle() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handle} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Kopiert' : 'Kopieren'}
    </button>
  );
}

export default function BenutzerVerwaltung({ token, currentUser }) {
  const [userList, setUserList] = useState([]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    const data = await apiGetUsers(token);
    setUserList(Array.isArray(data) ? data : []);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(mode) {
    if (!username.trim()) return setError('Benutzername darf nicht leer sein.');
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const user = await apiCreateUser(token, { username: username.trim(), email: email.trim() || null });
      if (mode === 'invite') {
        const inv = await apiInviteUser(token, user.id);
        setResult({ type: 'invite', emailSent: inv.emailSent, url: inv.inviteUrl, username: user.username });
      } else {
        const pw = await apiResetPassword(token, user.id);
        setResult({ type: 'password', password: pw.password, username: user.username });
      }
      setUsername('');
      setEmail('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Benutzer wirklich löschen?')) return;
    try {
      await apiDeleteUser(token, id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handlePromote(id) {
    try {
      await apiUpdateUser(token, id, { role: 'admin' });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const adminCount = userList.filter(u => u.role === 'admin').length;

  return (
    <div className="flex flex-col gap-4">

      {/* Benutzerliste */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <Shield size={15} className="text-indigo-500" />
          <h2 className="font-semibold text-slate-700 text-sm">Benutzer</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {userList.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar username={u.username} role={u.role} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800">{u.username}</span>
                  {u.role === 'admin' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 border border-indigo-200">★ Admin</span>
                  )}
                  {u.id === currentUser?.userId && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200">Du</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {u.email || 'Keine E-Mail'} · Seit {new Date(u.createdAt).toLocaleDateString('de-DE')}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {u.role !== 'admin' && (
                  <button
                    onClick={() => handlePromote(u.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Shield size={11} />
                    Admin
                  </button>
                )}
                <button
                  onClick={() => handleDelete(u.id)}
                  disabled={u.role === 'admin' && adminCount <= 1}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                  title={u.role === 'admin' && adminCount <= 1 ? 'Letzten Admin kann man nicht löschen' : 'Löschen'}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Neuen Benutzer anlegen */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <Key size={15} className="text-indigo-500" />
          <h2 className="font-semibold text-slate-700 text-sm">Neuen Benutzer anlegen</h2>
        </div>
        <div className="p-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          {result?.type === 'invite' && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
              <div className="text-sm font-semibold text-indigo-700 mb-1">
                {result.emailSent ? `✉ Einladungsmail an ${result.username} gesendet.` : `🔗 Einladungslink für ${result.username}`}
              </div>
              {!result.emailSent && (
                <>
                  <div className="font-mono text-xs text-indigo-600 bg-white border border-indigo-200 rounded px-2 py-1.5 break-all mb-2">{result.url}</div>
                  <CopyButton text={result.url} />
                </>
              )}
              <div className="text-xs text-indigo-500 mt-1">Gültig für 48 Stunden.</div>
            </div>
          )}

          {result?.type === 'password' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="text-sm font-semibold text-amber-700 mb-1">Initialpasswort für {result.username}</div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm bg-white border border-amber-200 rounded px-2 py-1">{result.password}</span>
                <CopyButton text={result.password} />
              </div>
              <div className="text-xs text-amber-600 mt-2">Nur einmal angezeigt. Benutzer muss es beim ersten Login ändern.</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Benutzername</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                placeholder="z. B. anna"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">E-Mail (optional)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                placeholder="anna@beispiel.de"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleCreate('invite')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Mail size={14} />
              Einladung senden
            </button>
            <button
              onClick={() => handleCreate('password')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 text-sm font-medium rounded-lg transition-colors"
            >
              <RefreshCw size={14} />
              Initialpasswort generieren
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            <strong>Einladung:</strong> Benutzer setzt Passwort selbst via Link. &nbsp;
            <strong>Initialpasswort:</strong> Einmaliges Passwort, muss beim ersten Login geändert werden.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Schritt 2: Committen**

```bash
git add src/views/BenutzerVerwaltung.jsx
git commit -m "feat: user management view"
```

---

## Task 14: Einstellungen erweitern

**Files:**
- Modify: `src/views/Einstellungen.jsx`

- [ ] **Schritt 1: TABS-Array und Imports aktualisieren**

Am Anfang von `Einstellungen.jsx` die Imports ergänzen:

```jsx
import { useState, useEffect, useRef } from 'react';
import { Building2, CheckCircle2, ImagePlus, Trash2, FileText, CreditCard, Settings2, AlignLeft, BookOpen, Plus, Download, Upload, Users, Mail } from 'lucide-react';
import FormField, { Input, Textarea, Select } from '../components/FormField';
import FirmenPreview from '../components/FirmenPreview';
import BenutzerVerwaltung from './BenutzerVerwaltung';
import { loadFirma, saveFirma, loadKatalog, saveKatalog, loadKunden, saveKunden, loadAngebote } from '../lib/storage';
import { apiGetSmtp, apiSaveSmtp, apiTestSmtp, clearToken } from '../lib/auth';
import { defaultData, einheiten } from '../lib/defaultData';
```

- [ ] **Schritt 2: TABS-Konstante und Funktions-Signatur aktualisieren**

```jsx
const TABS = [
  { id: 'firma',    label: 'Firmendaten',   icon: Building2 },
  { id: 'texte',    label: 'Textvorlagen',  icon: AlignLeft },
  { id: 'katalog',  label: 'Leistungen',    icon: BookOpen  },
  { id: 'benutzer', label: 'Benutzer',      icon: Users,    adminOnly: true },
  { id: 'email',    label: 'E-Mail',        icon: Mail,     adminOnly: true },
];

export default function Einstellungen({ token, currentUser, onLogout }) {
```

- [ ] **Schritt 3: SMTP-State und -Logik hinzufügen**

Nach dem bestehenden `const timer = useRef(null);` Block einfügen:

```jsx
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
```

- [ ] **Schritt 4: Grid-Style für neue Tabs anpassen**

Das `style`-Attribut am Grid-Container so aktualisieren, dass Benutzer- und E-Mail-Tab einspaltig sind:

```jsx
<div className="grid gap-6" style={{ gridTemplateColumns: (['katalog', 'benutzer', 'email'].includes(tab)) ? 'minmax(0,1fr)' : 'minmax(0,1fr) 340px' }}>
```

- [ ] **Schritt 5: Tabs nach Rolle filtern**

Das TABS-Rendering im JSX anpassen — ersetze `{TABS.map(...)}` mit:

```jsx
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
```

- [ ] **Schritt 5: Benutzer-Tab-Inhalt ergänzen**

Im `renderView()`-Switch (wo die anderen `tab === 'firma'` usw. stehen), zwei neue Blöcke ergänzen — nach dem bestehenden `{tab === 'katalog' && ...}`:

```jsx
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
```

- [ ] **Schritt 6: Visuell testen**

`npm run dev` starten, in Einstellungen navigieren.  
Als Admin: Tabs „Benutzer" und „E-Mail" sichtbar.  
Als normaler Benutzer: Tabs nicht sichtbar.

- [ ] **Schritt 7: Committen**

```bash
git add src/views/Einstellungen.jsx
git commit -m "feat: Benutzer and Email tabs in Einstellungen"
```

---

## Task 15: Dockerfile aktualisieren und nginx entfernen

**Files:**
- Modify: `Dockerfile`
- Modify: `.dockerignore`
- Delete: `nginx.conf`

- [ ] **Schritt 1: Dockerfile ersetzen**

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

- [ ] **Schritt 2: .dockerignore aktualisieren**

```
node_modules
server/node_modules
dist
.git
.gitignore
*.md
.superpowers
nginx.conf
```

- [ ] **Schritt 3: nginx.conf löschen**

```bash
rm nginx.conf
```

- [ ] **Schritt 4: Docker-Image bauen und testen**

```bash
docker build -t angebots-tool-test .
docker run -p 3001:3000 -e JWT_SECRET=testsecret angebots-tool-test
```

Browser öffnen: `http://localhost:3001` → Setup-Screen erscheint.

- [ ] **Schritt 5: Test-Container beenden**

```bash
docker stop $(docker ps -q --filter ancestor=angebots-tool-test)
```

- [ ] **Schritt 6: Committen**

```bash
git add Dockerfile .dockerignore
git rm nginx.conf
git commit -m "feat: replace nginx with express server in Docker"
```

---

## Abschluss: Image auf Docker Hub pushen und Unraid aktualisieren

- [ ] Image bauen und pushen

```bash
docker build -t DEINNAME/angebots-tool:latest .
docker push DEINNAME/angebots-tool:latest
```

- [ ] In Unraid: Container stoppen → „Force Update" → Container neu starten

- [ ] Volume in Unraid eintragen:
  - Host: `/mnt/user/appdata/angebots-tool/data`
  - Container: `/data`

- [ ] Env-Variable `JWT_SECRET` setzen (langer zufälliger String, z.B. `openssl rand -hex 32`)

- [ ] Port von `80` auf `3000` im Container anpassen (Host-Port bleibt `8765`)
