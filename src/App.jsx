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
