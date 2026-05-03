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
