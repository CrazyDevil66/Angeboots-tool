const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
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

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function sendInvite({ to, username, inviteUrl }) {
  const smtp = getSmtpConfig();
  if (!smtp?.host) return false;
  await createTransport(smtp).sendMail({
    from: smtp.from || smtp.user,
    to,
    subject: 'Einladung: AngebotsTool',
    text: `Hallo ${username},\n\ndu wurdest eingeladen. Setze dein Passwort unter:\n${inviteUrl}\n\nDer Link ist 48 Stunden gültig.`,
    html: `<p>Hallo <strong>${esc(username)}</strong>,</p><p>Setze dein Passwort:</p><p><a href="${esc(inviteUrl)}">${esc(inviteUrl)}</a></p><p>Gültig für 48 Stunden.</p>`,
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
