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
