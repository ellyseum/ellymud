import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './components/LoginPage';
import { OverviewPanel } from './components/panels/OverviewPanel';
import { PlayersPanel } from './components/panels/PlayersPanel';
import { MonitorPanel } from './components/panels/MonitorPanel';
import { ConfigPanel } from './components/panels/ConfigPanel';
import { PipelinePanel } from './components/panels/PipelinePanel';
import { WorldBuilderPanel } from './components/panels/WorldBuilderPanel';

type TabId = 'dashboard' | 'client' | 'players' | 'config' | 'pipeline' | 'worldbuilder';

function Dashboard() {
  const { isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  useEffect(() => {
    // Handle hash routing
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').replace('-tab', '');
      const validTabs: TabId[] = ['dashboard', 'client', 'players', 'config', 'pipeline', 'worldbuilder'];
      if (validTabs.includes(hash as TabId)) {
        setActiveTab(hash as TabId);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    window.history.pushState(null, '', `#${tabId}-tab`);
  };

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPanel = () => {
    switch (activeTab) {
      case 'dashboard':
        return <OverviewPanel />;
      case 'client':
        return <MonitorPanel />;
      case 'players':
        return <PlayersPanel />;
      case 'config':
        return <ConfigPanel />;
      case 'pipeline':
        return <PipelinePanel />;
      case 'worldbuilder':
        return <WorldBuilderPanel />;
      default:
        return <OverviewPanel />;
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header onLogout={logout} />
      <div className="d-flex flex-grow-1">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
        <main className="flex-grow-1 p-4 main-content">
          {renderPanel()}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}

export default App;
