import React from 'react';
import {
  LayoutDashboard, HardHat, Flame, ShieldAlert, PersonStanding,
  Package, Settings as SettingsIcon, ChevronRight, ChevronLeft, Users as Users2
} from 'lucide-react';
import logoImg from '../assets/hypevisionlogo.png';

export type Module =
  | 'dashboard'
  | 'ppe'
  | 'fire'
  | 'intrusion'
  | 'fall'
  | 'counting'
  | 'personnel'
  | 'settings';

interface NavItem {
  id: Module;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  lightColor: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard',  label: 'Genel Bakış',        sublabel: 'Dashboard',       icon: <LayoutDashboard size={18} />, color: '#00BCD4', lightColor: '#00BCD430' },
  { id: 'ppe',        label: 'KKD Kontrolü',       sublabel: 'PPE Check',       icon: <HardHat size={18} />,         color: '#F59E0B', lightColor: '#F59E0B30' },
  { id: 'fire',       label: 'Yangın & Duman',     sublabel: 'Fire / Smoke',    icon: <Flame size={18} />,           color: '#EF4444', lightColor: '#EF444430' },
  { id: 'intrusion',  label: 'Hırsızlık & İhlal', sublabel: 'Intrusion',       icon: <ShieldAlert size={18} />,     color: '#F97316', lightColor: '#F9731630' },
  { id: 'fall',       label: 'Düşme & Bayılma',    sublabel: 'Fall / Faint',    icon: <PersonStanding size={18} />,  color: '#EC4899', lightColor: '#EC489930' },
  { id: 'counting',   label: 'Ürün Sayım',         sublabel: 'Object Counting', icon: <Package size={18} />,         color: '#06B6D4', lightColor: '#06B6D430' },
  { id: 'personnel',  label: 'Personel',            sublabel: 'Productivity',    icon: <Users2 size={18} />,          color: '#8B5CF6', lightColor: '#8B5CF630' },
  { id: 'settings',   label: 'Ayarlar',             sublabel: 'Settings',        icon: <SettingsIcon size={18} />,    color: '#94A3B8', lightColor: '#94A3B830' },
];

interface SidebarProps {
  active: Module;
  onChange: (m: Module) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ active, onChange, collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 flex flex-col z-30 transition-all duration-300 ease-in-out select-none ${
        collapsed ? 'w-[76px]' : 'w-64'
      }`}
      style={{
        background: 'linear-gradient(180deg, #0B3C5D 0%, #071E2E 100%)',
        borderRight: '1px solid rgba(0, 188, 212, 0.08)',
        boxShadow: '2px 0 24px rgba(7, 30, 46, 0.3)',
      }}
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-white/8 transition-all duration-300 flex-shrink-0 ${
        collapsed ? 'justify-center px-0 py-4' : 'px-4 py-4 gap-3'
      }`}>
        <div className={`flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-9 h-9' : 'w-10 h-10'}`}>
          <img
            src={logoImg}
            alt="HypeVision Logo"
            className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(0,188,212,0.3)]"
          />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-[13px] leading-tight tracking-wide font-display whitespace-nowrap">
              HypeVision
            </p>
            <p className="text-[#00BCD4] text-[9px] font-semibold tracking-widest uppercase whitespace-nowrap">
              ISG Analytics
            </p>
          </div>
        )}
      </div>

      {/* Nav — vertically centered */}
      <nav className="flex-1 flex flex-col justify-center gap-1 px-2.5 overflow-y-auto overflow-x-hidden py-4">
        {navItems.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={`relative w-full flex items-center rounded-xl transition-all duration-200 group ${
                collapsed
                  ? 'justify-center py-3 px-0'
                  : 'px-3 py-2.5 gap-3'
              } ${
                isActive
                  ? ''
                  : 'hover:bg-white/5'
              }`}
              style={isActive ? {
                background: `${item.color}15`,
                boxShadow: `inset 0 0 0 1px ${item.color}25`,
              } : undefined}
            >
              {/* Active left glow bar */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full transition-all"
                  style={{
                    backgroundColor: item.color,
                    boxShadow: `0 0 8px ${item.color}80`,
                  }}
                />
              )}

              <span
                className="flex-shrink-0 transition-colors"
                style={{ color: isActive ? item.color : 'rgba(255,255,255,0.5)' }}
              >
                {item.icon}
              </span>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-[12.5px] font-semibold leading-tight truncate ${
                      isActive ? 'text-white' : 'text-white/60 group-hover:text-white/80'
                    }`}>{item.label}</p>
                    <p className={`text-[9.5px] leading-tight mt-0.5 truncate ${
                      isActive ? '' : 'text-white/30 group-hover:text-white/40'
                    }`}
                      style={isActive ? { color: item.color } : undefined}
                    >{item.sublabel}</p>
                  </div>
                  {isActive && <ChevronRight size={12} style={{ color: item.color }} className="flex-shrink-0" />}
                </>
              )}
              {collapsed && isActive && (
                <span
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full"
                  style={{
                    backgroundColor: item.color,
                    boxShadow: `0 0 6px ${item.color}60`,
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mx-3 h-px bg-white/8 flex-shrink-0" />

      {/* User + collapse toggle */}
      <div className={`px-2.5 py-3 flex items-center flex-shrink-0 ${collapsed ? 'flex-col gap-2' : 'gap-2.5'}`}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-sm ring-2 ring-white/10"
          style={{ background: 'linear-gradient(135deg, #00BCD4, #0B3C5D)' }}
        >
          AY
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-white/90 text-[11px] font-semibold truncate">Ahmet Yılmaz</p>
            <p className="text-white/40 text-[9.5px] truncate">ISG Sorumlusu</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex-shrink-0 w-6 h-6 rounded-lg bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/50 hover:text-white/80 transition-all"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Version */}
      {!collapsed && (
        <div className="px-4 pb-3">
          <p className="text-[9px] text-white/20 text-center tracking-wider">
            v2.1.0 · HypeVision Lab
          </p>
        </div>
      )}
    </aside>
  );
}
