import React, { useState, useEffect } from 'react';
import { Calendar, Bell, ChevronDown, Cpu, AlertCircle, User, LogOut, Clock, AlertTriangle, Flame, ShieldAlert, HardHat, PersonStanding, Wifi, Menu, Search, X } from 'lucide-react';
import { fetchSystemHealth, fetchNotifications } from '../services/api';
import { AlertDetail } from './DetailModal';

export type DateFilter = 'today' | 'week' | 'month' | 'custom';

interface SystemHealth {
  frontendActive: boolean;
  backendActive: boolean;
  aiPipelineActive: boolean;
  uptime: string;
  processedFrames: number;
  detectedEvents: number;
}

interface HeaderProps {
  dateFilter: DateFilter;
  onDateFilterChange: (f: DateFilter) => void;
  notifCount: number;
  moduleName: string;
  sidebarCollapsed: boolean;
  onOpenModal: (alert: AlertDetail) => void;
  onMobileMenuToggle?: () => void;
  onNavigate?: (module: string) => void;
}

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'today', label: 'Bugün' },
  { value: 'week', label: 'Bu Hafta' },
  { value: 'month', label: 'Bu Ay' },
  { value: 'custom', label: 'Özel Aralık' },
];

const TYPE_META: Record<string, { icon: React.ReactNode; color: string }> = {
  ppe: { icon: <HardHat size={13} />, color: 'text-amber-600' },
  fire: { icon: <Flame size={13} />, color: 'text-red-600' },
  intrusion: { icon: <ShieldAlert size={13} />, color: 'text-orange-600' },
  fall: { icon: <PersonStanding size={13} />, color: 'text-pink-600' },
  counting: { icon: <AlertTriangle size={13} />, color: 'text-cyan-600' },
};

export default function Header({ dateFilter, onDateFilterChange, notifCount, moduleName, sidebarCollapsed, onOpenModal, onMobileMenuToggle, onNavigate }: HeaderProps) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentNotifs, setRecentNotifs] = useState<AlertDetail[]>([]);

  useEffect(() => {
    fetchSystemHealth().then(setHealth);
    const iv = setInterval(() => fetchSystemHealth().then(setHealth), 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    fetchNotifications({}).then((items: AlertDetail[]) => setRecentNotifs(items.slice(0, 5)));
  }, []);

  const allHealthy = health?.frontendActive && health?.backendActive && health?.aiPipelineActive;
  const sidebarW = sidebarCollapsed ? '76px' : '264px';

  const closeAll = () => { setDateOpen(false); setProfileOpen(false); setHealthOpen(false); setNotifOpen(false); setSearchOpen(false); };

  const filteredNotifs = searchQuery
    ? recentNotifs.filter(n => n.label.toLowerCase().includes(searchQuery.toLowerCase()) || n.cameraName.toLowerCase().includes(searchQuery.toLowerCase()))
    : recentNotifs;

  return (
    <header
      className="fixed top-0 right-0 h-16 z-20 flex items-center gap-2 md:gap-3 transition-all duration-300"
      style={{
        left: 0,
        paddingLeft: `max(${sidebarW} + 16px, 16px)`,
        paddingRight: '16px',
        background: 'rgba(240, 244, 248, 0.8)',
        backdropFilter: 'blur(20px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        borderBottom: '1px solid rgba(11, 60, 93, 0.06)',
      }}
    >
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden -ml-2 p-2 rounded-xl hover:bg-navy-900/5 text-slate-600 flex-shrink-0 transition-colors"
      >
        <Menu size={18} />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-slate-800 font-bold text-[15px] font-display truncate">{moduleName}</p>
        <p className="text-slate-400 text-[11px] leading-none mt-0.5">HypeVision ISG Analytics</p>
      </div>

      {/* Global Search */}
      <div className="relative">
        {searchOpen ? (
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm animate-fade-in">
            <Search size={13} className="text-[#00BCD4] flex-shrink-0" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Olay, kamera ara..."
              className="w-36 md:w-48 text-xs text-slate-700 placeholder-slate-400 focus:outline-none bg-transparent"
            />
            <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="text-slate-400 hover:text-slate-600">
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setSearchOpen(true); closeAll(); }}
            className="p-2 rounded-xl hover:bg-white/80 transition-colors text-slate-500 hover:text-[#0B3C5D]"
          >
            <Search size={16} />
          </button>
        )}
      </div>

      {/* System Health */}
      <div className="relative hidden md:block">
        <button
          onClick={() => { setHealthOpen(!healthOpen); setDateOpen(false); setProfileOpen(false); setNotifOpen(false); setSearchOpen(false); }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
            allHealthy
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${allHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
          {allHealthy ? 'Sistem Aktif' : 'Sistem Sorunu'}
          <ChevronDown size={11} className={`transition-transform ${healthOpen ? 'rotate-180' : ''}`} />
        </button>

        {healthOpen && health && (
          <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl p-4 z-50 glass-card">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Sistem Durumu</p>
            <div className="space-y-2.5">
              <HealthRow icon={<Wifi size={13} />} label="Frontend" active={health.frontendActive} />
              <HealthRow icon={<Cpu size={13} />} label="Backend API" active={health.backendActive} />
              <HealthRow icon={<Cpu size={13} />} label="AI Pipeline" active={health.aiPipelineActive} />
            </div>
            {!health.backendActive && (
              <div className="mt-3 p-2.5 bg-red-50 rounded-xl flex items-start gap-2 border border-red-100">
                <AlertCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-600">Backend bağlantısı sağlanamadı.</p>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-slate-100/80 grid grid-cols-3 gap-2 text-center">
              <StatPill label="Uptime" value={health.uptime} />
              <StatPill label="Frame" value={(health.processedFrames / 1e6).toFixed(1) + 'M'} />
              <StatPill label="Olay" value={health.detectedEvents.toLocaleString()} />
            </div>
          </div>
        )}
      </div>

      {/* Date Filter */}
      <div className="relative">
        <button
          onClick={() => { setDateOpen(!dateOpen); setProfileOpen(false); setHealthOpen(false); setNotifOpen(false); setSearchOpen(false); }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-all"
        >
          <Calendar size={13} className="text-[#00BCD4]" />
          <span className="text-xs">{DATE_OPTIONS.find((d) => d.value === dateFilter)?.label}</span>
          <ChevronDown size={11} className={`text-slate-400 transition-transform ${dateOpen ? 'rotate-180' : ''}`} />
        </button>
        {dateOpen && (
          <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl overflow-hidden z-50 glass-card">
            {DATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onDateFilterChange(opt.value); setDateOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors ${
                  dateFilter === opt.value
                    ? 'bg-[#00BCD4]/10 text-[#0B3C5D]'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setNotifOpen(!notifOpen); setDateOpen(false); setProfileOpen(false); setHealthOpen(false); setSearchOpen(false); }}
          className="relative p-2 rounded-xl hover:bg-white/80 transition-colors"
        >
          <Bell size={17} className="text-slate-600" />
          {notifCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-[#EF4444] rounded-full text-white text-[9px] font-bold flex items-center justify-center leading-none px-0.5">
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50 glass-card">
            <div className="px-4 py-3 border-b border-slate-100/80 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700">Son Bildirimler</p>
              <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">{notifCount} yeni</span>
            </div>
            <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
              {filteredNotifs.map((n) => {
                const meta = TYPE_META[n.type] || TYPE_META.ppe;
                return (
                  <button
                    key={n.id}
                    onClick={() => { onOpenModal(n); setNotifOpen(false); }}
                    className="w-full text-left hover:bg-slate-50/80 transition-colors px-4 py-3 flex items-start gap-3"
                  >
                    <img src={n.imageUrl} alt={n.label} className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-slate-100 shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center gap-1 ${meta.color}`}>
                        {meta.icon}
                        <span className="text-xs font-bold truncate text-slate-700">{n.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{n.cameraName}</p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-300 mt-0.5">
                        <Clock size={9} />
                        {new Date(n.timestamp).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100/80">
              <button
                className="text-xs font-semibold text-[#00BCD4] hover:text-[#0B3C5D] transition-colors"
                onClick={() => { setNotifOpen(false); onNavigate?.('dashboard'); }}
              >
                Tümünü Gör
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="relative">
        <button
          onClick={() => { setProfileOpen(!profileOpen); setDateOpen(false); setHealthOpen(false); setNotifOpen(false); setSearchOpen(false); }}
          className="flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-xl hover:bg-white/80 transition-colors"
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-sm"
            style={{ background: 'linear-gradient(135deg, #00BCD4, #0B3C5D)' }}>
            AY
          </div>
          <ChevronDown size={11} className="text-slate-400 hidden sm:block" />
        </button>
        {profileOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden z-50 glass-card">
            <div className="px-4 py-3 border-b border-slate-100/80">
              <p className="text-sm font-bold text-slate-700">Ahmet Yılmaz</p>
              <p className="text-xs text-slate-400">ISG Sorumlusu</p>
            </div>
            <button
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-50/80 transition-colors"
              onClick={() => { setProfileOpen(false); onNavigate?.('settings'); }}
            >
              <User size={13} /> Profil Ayarları
            </button>
            <button
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-500 hover:bg-red-50/80 transition-colors"
              onClick={() => { setProfileOpen(false); window.location.reload(); }}
            >
              <LogOut size={13} /> Çıkış Yap
            </button>
          </div>
        )}
      </div>

      {(dateOpen || profileOpen || healthOpen || notifOpen) && (
        <div className="fixed inset-0 z-40" onClick={closeAll} />
      )}
    </header>
  );
}

function HealthRow({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-slate-600">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
        {active ? 'AKTİF' : 'PASİF'}
      </span>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-slate-400">{label}</p>
      <p className="text-xs font-bold text-[#00BCD4]">{value}</p>
    </div>
  );
}
