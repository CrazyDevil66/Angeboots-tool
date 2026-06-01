import { useState, useEffect, useCallback, useRef } from 'react';
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
  const resultTimer = useRef(null);

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
        if (inv.emailSent) {
          clearTimeout(resultTimer.current);
          resultTimer.current = setTimeout(() => setResult(null), 5000);
        }
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
