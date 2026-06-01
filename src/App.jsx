import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import {
  loadFirma, loadKunden, loadAngebote, loadKatalog,
  saveAngebote, autoMarkAbgelaufen,
} from './lib/storage';
import { apiSetupRequired, apiMe, getToken, saveToken, clearToken } from './lib/auth';
import { defaultData } from './lib/defaultData';

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch { return null; }
}

export default function App() {
  const [auth, setAuth] = useState({ loading: true, setupRequired: false, token: null, user: null });
  const [nav, setNav] = useState({ view: 'dashboard', params: {} });

  const [firma,    setFirma]    = useState(null);
  const [kunden,   setKunden]   = useState([]);
  const [angebote, setAngebote] = useState([]);
  const [katalog,  setKatalog]  = useState([]);

  const eventSourceRef = useRef(null);

  async function loadAllData(token) {
    const [f, k, a, kat] = await Promise.all([
      loadFirma(token),
      loadKunden(token),
      loadAngebote(token),
      loadKatalog(token),
    ]);
    setFirma(f || defaultData.firma);
    setKunden(k);
    setKatalog(kat);
    const { updated, changed } = autoMarkAbgelaufen(a);
    if (changed) {
      await saveAngebote(token, updated);
      setAngebote(updated);
    } else {
      setAngebote(a);
    }
  }

  function openSSE(token) {
    if (eventSourceRef.current) eventSourceRef.current.close();
    const es = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
    es.onmessage = async (e) => {
      const { dataType } = JSON.parse(e.data);
      if (dataType === 'firma')    setFirma(await loadFirma(token));
      if (dataType === 'kunden')   setKunden(await loadKunden(token));
      if (dataType === 'angebote') setAngebote(await loadAngebote(token));
      if (dataType === 'katalog')  setKatalog(await loadKatalog(token));
    };
    es.onerror = () => {};
    eventSourceRef.current = es;
  }

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
          await loadAllData(token);
          openSSE(token);
          setAuth({ loading: false, setupRequired: false, token, user });
          return;
        }
        clearToken();
      }
      setAuth({ loading: false, setupRequired: false, token: null, user: null });
    })();
    return () => { if (eventSourceRef.current) eventSourceRef.current.close(); };
  }, []);

  async function handleAuthComplete(token) {
    const payload = parseJwt(token);
    saveToken(token);
    if (!payload?.mustChangePassword) {
      await loadAllData(token);
      openSSE(token);
    }
    setAuth({ loading: false, setupRequired: false, token, user: payload });
  }

  function handleLogout() {
    if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; }
    clearToken();
    setFirma(null);
    setKunden([]);
    setAngebote([]);
    setKatalog([]);
    setAuth({ loading: false, setupRequired: false, token: null, user: null });
  }

  const navigate = useCallback((view, params = {}) => setNav({ view, params }), []);

  const counts = useMemo(() => ({
    angebote: angebote.length,
    kunden: kunden.length,
  }), [angebote, kunden]);

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

  const sharedProps = {
    navigate,
    token: auth.token,
    currentUser: auth.user,
    firma, setFirma,
    kunden, setKunden,
    angebote, setAngebote,
    katalog, setKatalog,
  };

  function renderView() {
    switch (nav.view) {
      case 'dashboard':      return <Dashboard {...sharedProps} />;
      case 'angebote':       return <AngeboteListe {...sharedProps} />;
      case 'angebot-editor': return <AngebotEditor {...sharedProps} params={nav.params} />;
      case 'kunden':         return <KundenListe {...sharedProps} />;
      case 'einstellungen':  return <Einstellungen {...sharedProps} onLogout={handleLogout} />;
      default:               return <Dashboard {...sharedProps} />;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentView={nav.view} onNavigate={navigate} counts={counts} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto">{renderView()}</main>
    </div>
  );
}
