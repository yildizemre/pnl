import React, { useState, useCallback, useEffect } from 'react';
import Sidebar, { Module } from './components/Sidebar';
import Header, { DateFilter } from './components/Header';
import LiveNotification from './components/LiveNotification';
import Chatbot from './components/Chatbot';
import DetailModal, { AlertDetail } from './components/DetailModal';
import Dashboard from './pages/Dashboard';
import ModulePage from './pages/ModulePage';
import ProductCounting from './pages/ProductCounting';
import Personnel from './pages/Personnel';
import Settings from './pages/Settings';

const MODULE_NAMES: Record<Module, string> = {
  dashboard: 'Genel Bakış',
  ppe: 'KKD Kontrolü',
  fire: 'Yangın & Duman',
  intrusion: 'Hırsızlık & İhlal',
  fall: 'Düşme & Bayılma',
  counting: 'Ürün Sayım',
  personnel: 'Personel Verimliliği',
  settings: 'Ayarlar',
};

export default function App() {
  const [activeModule, setActiveModule] = useState<Module>('dashboard');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [modalAlert, setModalAlert] = useState<AlertDetail | null>(null);
  const [notifCount, setNotifCount] = useState(3);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) { setSidebarCollapsed(true); setMobileSidebarOpen(false); }
    };
    if (mq.matches) setSidebarCollapsed(true);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Simulate live notification count updates
  useEffect(() => {
    const iv = setInterval(() => {
      setNotifCount(prev => Math.min(prev + 1, 12));
    }, 45000);
    return () => clearInterval(iv);
  }, []);

  const openModal = useCallback((alert: AlertDetail) => setModalAlert(alert), []);
  const closeModal = useCallback(() => setModalAlert(null), []);

  const handleModuleChange = (m: Module) => {
    setActiveModule(m);
    setMobileSidebarOpen(false);
  };

  const sidebarWidth = sidebarCollapsed ? '76px' : '264px';

  const renderPage = () => {
    switch (activeModule) {
      case 'dashboard':  return <Dashboard dateFilter={dateFilter} onOpenModal={openModal} />;
      case 'ppe':        return <ModulePage module="ppe" dateFilter={dateFilter} onOpenModal={openModal} />;
      case 'fire':       return <ModulePage module="fire" dateFilter={dateFilter} onOpenModal={openModal} />;
      case 'intrusion':  return <ModulePage module="intrusion" dateFilter={dateFilter} onOpenModal={openModal} />;
      case 'fall':       return <ModulePage module="fall" dateFilter={dateFilter} onOpenModal={openModal} />;
      case 'counting':   return <ProductCounting dateFilter={dateFilter} onOpenModal={openModal} />;
      case 'personnel':  return <Personnel dateFilter={dateFilter} />;
      case 'settings':   return <Settings />;
      default:           return <Dashboard dateFilter={dateFilter} onOpenModal={openModal} />;
    }
  };

  return (
    <div className="min-h-screen relative bg-mesh-gradient">
      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-[#071E2E]/40 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`md:block transition-transform duration-300 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 30, width: sidebarWidth }}
      >
        <Sidebar
          active={activeModule}
          onChange={handleModuleChange}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      {/* Header */}
      <Header
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        notifCount={notifCount}
        moduleName={MODULE_NAMES[activeModule]}
        sidebarCollapsed={sidebarCollapsed}
        onOpenModal={openModal}
        onMobileMenuToggle={() => setMobileSidebarOpen((v) => !v)}
        onNavigate={(m) => handleModuleChange(m as Module)}
      />

      {/* Main content */}
      <main
        className="pt-16 min-h-screen transition-all duration-300 relative z-10"
        style={{ marginLeft: sidebarWidth }}
      >
        <style>{`
          @media (max-width: 767px) { main { margin-left: 0 !important; } }
        `}</style>
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
          {renderPage()}
        </div>
      </main>

      <LiveNotification onOpenModal={openModal} />
      <Chatbot />
      <DetailModal alert={modalAlert} onClose={closeModal} />
    </div>
  );
}
