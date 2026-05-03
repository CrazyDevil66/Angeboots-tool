const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
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
    throw new Error('Den letzten Admin kann man nicht löschen');
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
