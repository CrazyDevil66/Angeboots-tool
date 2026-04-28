import { useState, useCallback, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import AngeboteListe from './views/AngeboteListe';
import AngebotEditor from './views/AngebotEditor';
import KundenListe from './views/KundenListe';
import Einstellungen from './views/Einstellungen';
import { loadAngebote, loadKunden } from './lib/storage';

export default function App() {
  const [nav, setNav] = useState({ view: 'dashboard', params: {} });
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = useCallback((view, params = {}) => {
    setNav({ view, params });
  }, []);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const counts = useMemo(() => ({
    angebote: loadAngebote().length,
    kunden: loadKunden().length,
  }), [refreshKey]);

  function renderView() {
    const props = { navigate, onRefresh: refresh };
    switch (nav.view) {
      case 'dashboard':      return <Dashboard {...props} />;
      case 'angebote':       return <AngeboteListe {...props} />;
      case 'angebot-editor': return <AngebotEditor {...props} params={nav.params} />;
      case 'kunden':         return <KundenListe {...props} />;
      case 'einstellungen':  return <Einstellungen />;
      default:               return <Dashboard {...props} />;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        currentView={nav.view}
        onNavigate={navigate}
        counts={counts}
      />
      <main className="flex-1 overflow-y-auto">
        {renderView()}
      </main>
    </div>
  );
}
