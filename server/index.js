const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const users = require('./users');
const auth = require('./auth');
const mailer = require('./mailer');
const dataStore = require('./data');
const angeboteStore = require('./angeboteStore');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
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

angeboteStore.migrateIfNeeded();
angeboteStore.recalcBrutto();

const sseClients = new Set();

function broadcastDataUpdate(dataType, excludeRes) {
  const msg = `data: ${JSON.stringify({ dataType })}\n\n`;
  for (const client of sseClients) {
    if (client === excludeRes) continue;
    try { client.write(msg); } catch { sseClients.delete(client); }
  }
}

function makeToken(user) {
  return jwt.sign({
    userId: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: !!user.mustChangePassword,
  }, JWT_SECRET, { expiresIn: '7d' });
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
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));

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
  try {
    const user = await users.verifyPassword(username, password);
    if (!user) {
      auth.recordFailure(ip);
      return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
    }
    auth.clearLockout(ip);
    res.json({ token: makeToken(user) });
  } catch (e) {
    res.status(500).json({ error: 'Interner Fehler' });
  }
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
  try {
    await users.setPassword(user.id, password);
    res.json({ token: makeToken(users.findById(user.id)) });
  } catch (e) {
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// SMTP config
app.get('/api/config/smtp', requireAuth, requireAdmin, (req, res) => {
  const config = readConfig();
  const smtp = config.smtp || {};
  res.json({
    host: smtp.host || '', port: smtp.port || 587,
    user: smtp.user || '', pass: smtp.pass ? '***' : '',
    from: smtp.from || '', baseUrl: config.baseUrl || '',
  });
});

app.post('/api/config/smtp', requireAuth, requireAdmin, (req, res) => {
  const { host, port, user, pass, from, baseUrl } = req.body;
  const current = readConfig().smtp || {};
  writeConfig({
    smtp: {
      host: host ?? current.host,
      port: Number(port) || 587,
      user: user ?? current.user,
      pass: (pass && pass !== '***') ? pass : current.pass,
      from: from ?? current.from,
    },
    baseUrl: baseUrl ?? readConfig().baseUrl,
  });
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

// ── Angebote-API ────────────────────────────────────────────────────────────

app.get('/api/angebote', requireAuth, (_req, res) => {
  try {
    res.json(angeboteStore.readIndex());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/angebote', requireAuth, (req, res) => {
  try {
    const result = angeboteStore.createOffer(req.body);
    broadcastDataUpdate('angebote', res);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/angebote/:id', requireAuth, (req, res) => {
  try {
    const offer = angeboteStore.readOffer(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(offer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/angebote/:id', requireAuth, (req, res) => {
  const { snapshot, status } = req.body;
  try {
    const index = angeboteStore.updateOffer(req.params.id, snapshot, status);
    broadcastDataUpdate('angebote', res);
    res.json({ index });
  } catch (e) {
    res.status(e.message.includes('nicht gefunden') ? 404 : 500).json({ error: e.message });
  }
});

app.patch('/api/angebote/:id', requireAuth, (req, res) => {
  try {
    const index = angeboteStore.patchOffer(req.params.id, req.body);
    broadcastDataUpdate('angebote', res);
    res.json({ index });
  } catch (e) {
    res.status(e.message.includes('nicht gefunden') ? 404 : 500).json({ error: e.message });
  }
});

app.delete('/api/angebote/:id', requireAuth, (req, res) => {
  try {
    const index = angeboteStore.removeOffer(req.params.id);
    broadcastDataUpdate('angebote', res);
    res.json({ index });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Static files + SPA fallback (muss als letztes stehen)
app.use(express.static(DIST_DIR));
app.get('*', (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log(`AngebotsTool läuft auf Port ${PORT}`);
  console.log(`Datenspeicher: ${DATA_DIR}`);
});
