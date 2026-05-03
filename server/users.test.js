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
