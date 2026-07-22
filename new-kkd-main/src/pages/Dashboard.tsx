import React, { useEffect, useState, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  AlertTriangle, TrendingUp, CheckCircle, Camera,
  Flame, Activity, ArrowUpRight, ArrowDownRight, Zap,
  HardHat, ShieldAlert, PersonStanding, Award, Siren,
  Smartphone, MapPin, Radio, ShieldCheck, HelpCircle, ExternalLink
} from 'lucide-react';
import { fetchDashboardStats, fetchNotifications } from '../services/api';
import AlertTable from '../components/AlertTable';
import { AlertDetail } from '../components/DetailModal';
import { DateFilter } from '../components/Header';
import logoImg from '../assets/hypevisionlogo.png';

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);
  return value;
}

interface Stats {
  totalAlerts: number;
  criticalAlerts: number;
  resolvedToday: number;
  activeCameras: number;
  chartData: any[];
  pieData: any[];
  insights: any[];
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs min-w-[130px] glass-card">
      <p className="font-bold text-slate-700 mb-2 text-[11px]">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-bold text-slate-700">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-2.5 text-xs glass-card">
      <p className="font-bold" style={{ color: payload[0].payload.color }}>{payload[0].name}</p>
      <p className="text-slate-400">{payload[0].value} olay</p>
    </div>
  );
};

function DataInsight({ text, priority }: { text: string; priority: 'high' | 'medium' }) {
  const styles = {
    high:   { bar: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'Kritik Durum' },
    medium: { bar: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500',  label: 'Optimizasyon' },
  };
  const s = styles[priority];
  return (
    <div className={`relative rounded-2xl border border-slate-200/80 p-4 overflow-hidden ${s.bg}`}>
      <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${s.bar}`} />
      <div className="pl-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          <span className={`text-[9px] font-bold uppercase tracking-widest ${s.text} opacity-70`}>{s.label}</span>
        </div>
        <p className={`text-xs leading-relaxed ${s.text}`}>{text}</p>
      </div>
    </div>
  );
}

interface DashboardProps {
  dateFilter: DateFilter;
  onOpenModal: (a: AlertDetail) => void;
}

export default function Dashboard({ dateFilter, onOpenModal }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<AlertDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Emergency panel mock actions state
  const [sirenActive, setSirenActive] = useState(false);
  const [smsNotification, setSmsNotification] = useState(false);
  const [activeTabMap, setActiveTabMap] = useState<'A' | 'B' | 'C' | 'D'>('A');

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDashboardStats(), fetchNotifications({})]).then(([s, a]) => {
      setStats(s);
      setAlerts(a as AlertDetail[]);
      setLoading(false);
    });
  }, [dateFilter]);

  // Greeting text based on local time
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Günaydın';
    if (hrs < 18) return 'İyi Günler';
    return 'İyi Akşamlar';
  };

  if (loading || !stats) {
    return (
      <div className="space-y-5">
        <div className="card-premium h-40 skeleton w-full" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="card-premium p-5 h-28 skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const topCategory = stats.pieData.reduce((a: any, b: any) => a.value > b.value ? a : b);
  const totalPie = stats.pieData.reduce((s: number, d: any) => s + d.value, 0);

  return (
    <div className="space-y-5">
      {/* 1. Welcoming Hero Section */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 text-white border border-[#00BCD4]/25 shadow-premium-lg"
        style={{ background: 'linear-gradient(135deg, #0B3C5D 0%, #071E2E 100%)' }}>
        {/* Decorative background grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#00BCD4_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider">
              <Zap size={11} className="text-[#00BCD4] animate-pulse" />
              YAPAY ZEKA İSG DENETİMİ AKTİF
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight font-display">
              {getGreeting()}, Ahmet Yılmaz
            </h1>
            <p className="text-white/70 text-xs md:text-sm max-w-xl">
              HypeVision AI kamera gözetim sistemi tesisinizde aktif olarak çalışıyor. Bugün herhangi bir iş kazası bildirilmedi.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/8 p-4 rounded-2xl flex-shrink-0">
            <img src={logoImg} alt="HypeVision" className="w-12 h-12 object-contain drop-shadow-[0_0_8px_rgba(0,188,212,0.4)]" />
            <div>
              <p className="text-[#00BCD4] text-[10px] font-bold uppercase tracking-widest leading-none">Platform Modeli</p>
              <p className="text-white font-extrabold text-sm mt-1">HypeVision v2.1.0</p>
              <p className="text-white/40 text-[9px]">AI Vision Suite</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top-level HSE KPI Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tesis Güvenlik Endeksi */}
        <div className="card-premium p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400">TESİS GÜVENLİK ENDEKSİ</p>
            <p className="text-[26px] font-extrabold text-[#0B3C5D]">%94.2</p>
            <p className="text-[10px] text-emerald-600 flex items-center gap-0.5 font-bold">
              <ArrowUpRight size={12} /> geçen haftaya göre %1.8 artış
            </p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-[#00BCD4]/20 flex items-center justify-center relative">
            <span className="text-xs font-bold text-[#00BCD4]">%94</span>
            <div className="absolute inset-0 rounded-full border-4 border-t-[#00BCD4] border-r-[#00BCD4] animate-spin" style={{ animationDuration: '4s' }} />
          </div>
        </div>

        {/* LTI: Kazasız Gün Sayısı */}
        <div className="card-premium p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 flex-shrink-0 shadow-sm">
            <Award size={22} className="animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">KAZASIZ GÜN (LTI)</p>
            <p className="text-[26px] font-extrabold text-amber-500">184 GÜN</p>
            <p className="text-[10px] text-slate-400">Hedeflenen rekor: 200 gün</p>
          </div>
        </div>

        {/* Acil Durum Hızlı Aksiyon Paneli */}
        <div className="card-premium p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">ACİL DURUM KONTROLÜ</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSirenActive(!sirenActive)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                sirenActive 
                  ? 'bg-red-500 border-red-500 text-white shadow-[0_4px_16px_rgba(239,68,68,0.3)] animate-pulse' 
                  : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100'
              }`}
            >
              <Siren size={14} />
              {sirenActive ? 'Siren Kapat' : 'Siren Testi'}
            </button>
            <button
              onClick={() => setSmsNotification(!smsNotification)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                smsNotification 
                  ? 'bg-[#00BCD4] border-[#00BCD4] text-white shadow-glow-cyan' 
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Smartphone size={14} />
              {smsNotification ? 'Uygulama İletildi' : 'İSG Ekiplerine SMS'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Toplam İhlal', sublabel: 'Tüm modüller', value: stats.totalAlerts, icon: <AlertTriangle size={18} />, color: '#0B3C5D', trend: '+6.2%', neg: true, delay: 1 },
          { label: 'Kritik Durum', sublabel: 'Müdahale bekleyen', value: stats.criticalAlerts, icon: <Flame size={18} />, color: '#EF4444', trend: '-3.1%', neg: false, delay: 2 },
          { label: 'Bugün Çözüldü', sublabel: 'Kapatılan alarmlar', value: stats.resolvedToday, icon: <CheckCircle size={18} />, color: '#10B981', trend: '+18%', neg: false, delay: 3 },
          { label: 'Aktif Kameralar', sublabel: 'Canlı video yayını', value: stats.activeCameras, icon: <Camera size={18} />, color: '#00BCD4', trend: '8/8', neg: false, delay: 4 },
        ].map((c) => {
          const val = useCountUp(c.value, 1100);
          return (
            <div key={c.label} className={`card-premium p-4 animate-fade-up-${c.delay}`} style={{ borderTop: `2px solid ${c.color}40` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${c.color}15`, color: c.color }}>{c.icon}</div>
                <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.neg ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {c.trend}
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-800">{val.toLocaleString()}</p>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">{c.label}</p>
              <p className="text-[10px] text-slate-400">{c.sublabel}</p>
            </div>
          );
        })}
      </div>

      {/* 4. Interactive Radar Map & Live Activity Feed Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Interactive SVG Radar Kroki */}
        <div className="xl:col-span-3 card-premium flex flex-col justify-between">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100/80 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-display">Tesis Radar Krokisi</h3>
              <p className="text-xs text-slate-400 mt-0.5">Kameraların fiziksel konumları ve risk haritası</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200/80 p-0.5 rounded-lg text-[10px] font-bold">
              {['A', 'B', 'C', 'D'].map((sector) => (
                <button
                  key={sector}
                  onClick={() => setActiveTabMap(sector as any)}
                  className={`px-2 py-0.5 rounded ${
                    activeTabMap === sector ? 'bg-[#00BCD4] text-white shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Sektör {sector}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 flex flex-col md:flex-row items-center justify-center gap-6">
            {/* Interactive blueprint mock visualization */}
            <div className="relative w-full max-w-[340px] aspect-square rounded-full border border-dashed border-[#00BCD4]/40 flex items-center justify-center bg-slate-900 overflow-hidden shadow-inner">
              {/* Radar sweeps */}
              <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_50%,rgba(0,188,212,0.15))] animate-spin" style={{ animationDuration: '6s' }} />
              <div className="absolute w-3/4 h-3/4 rounded-full border border-dashed border-slate-800" />
              <div className="absolute w-1/2 h-1/2 rounded-full border border-slate-800" />
              <div className="absolute w-1/4 h-1/4 rounded-full border border-dashed border-slate-800" />

              {/* Grid axes */}
              <div className="absolute w-full h-px bg-slate-800" />
              <div className="absolute h-full w-px bg-slate-800" />

              {/* Active Pins */}
              <div className="absolute top-[25%] left-[30%] group cursor-pointer" title="Kamera 01">
                <span className="absolute -inset-1 rounded-full bg-emerald-500 animate-ping opacity-75" />
                <MapPin size={16} className="text-emerald-500 relative" />
              </div>
              <div className="absolute top-[40%] right-[25%] group cursor-pointer" title="Kamera 02">
                <span className="absolute -inset-1 rounded-full bg-red-500 animate-ping opacity-75" />
                <MapPin size={16} className="text-red-500 relative" />
              </div>
              <div className="absolute bottom-[30%] left-[45%] group cursor-pointer" title="Kamera 03">
                <span className="absolute -inset-1 rounded-full bg-emerald-500 animate-ping opacity-75" />
                <MapPin size={16} className="text-emerald-500 relative" />
              </div>
              <div className="absolute bottom-[20%] right-[30%] group cursor-pointer" title="Kamera 06">
                <span className="absolute -inset-1 rounded-full bg-emerald-500 animate-ping opacity-75" />
                <MapPin size={16} className="text-emerald-500 relative" />
              </div>

              {/* Central text overlay */}
              <div className="absolute text-[10px] font-bold font-mono text-white/50 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 uppercase tracking-widest">
                Merkez Kontrol
              </div>
            </div>

            {/* Kroki Legend and status details */}
            <div className="flex-1 space-y-3.5 w-full text-xs">
              <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1 border-b border-slate-100 pb-1.5">
                <Radio size={12} className="text-[#00BCD4]" /> Aktif Kamera Konumları
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <span className="font-semibold text-emerald-800">Giriş & Sevkiyat (Kam 01)</span>
                  <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full">GÜVENLİ</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-red-50/50 rounded-xl border border-red-100">
                  <span className="font-semibold text-red-800">Kaynak Atölyesi (Kam 02)</span>
                  <span className="text-[10px] bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">RİSKLİ</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <span className="font-semibold text-emerald-800">Hammadde Depo (Kam 03)</span>
                  <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full">GÜVENLİ</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Olay Kategorileri Pie & Progress Bars */}
        <div className="xl:col-span-2 card-premium">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100/80">
            <h3 className="text-sm font-bold text-slate-800 font-display">Olay Kategorileri</h3>
            <p className="text-xs text-slate-400 mt-0.5">Kümülatif olay dağılımları</p>
          </div>
          <div className="px-4 py-3">
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <defs>
                    {stats.pieData.map((d: any, i: number) => (
                      <linearGradient key={i} id={`pg${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={d.color} stopOpacity={1} />
                        <stop offset="100%" stopColor={d.color} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={stats.pieData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="rgba(255,255,255,0.9)"
                    isAnimationActive
                  >
                    {stats.pieData.map((e: any, i: number) => (
                      <Cell key={i} fill={`url(#pg${i})`} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1.5">
              {stats.pieData.map((d: any) => {
                const pct = Math.round((d.value / totalPie) * 100);
                return (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[10px] text-slate-500 truncate">{d.name}</span>
                        <span className="text-[10px] font-bold text-slate-700 ml-2">{d.value}</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Weekly breakdowns & Area trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Stacked Bar Chart */}
        <div className="card-premium">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100/80 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-display">Haftalık İhlal Dağılımı</h3>
              <p className="text-xs text-slate-400 mt-0.5">Günlük detaylı sayılar</p>
            </div>
          </div>
          <div className="px-4 pt-4 pb-2">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.chartData} barCategoryGap="30%" margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="ppe" name="KKD" fill="#0B3C5D" stackId="a" radius={[0,0,0,0]} />
                <Bar dataKey="fire" name="Yangın" fill="#EF4444" stackId="a" radius={[0,0,0,0]} />
                <Bar dataKey="intrusion" name="İhlal" fill="#F59E0B" stackId="a" radius={[0,0,0,0]} />
                <Bar dataKey="fall" name="Düşme" fill="#10B981" stackId="a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative Area trend */}
        <div className="card-premium">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100/80 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-display">İhlal Trend Analizi</h3>
              <p className="text-xs text-slate-400 mt-0.5">Kümülatif olay akış eğrisi</p>
            </div>
            <Activity size={14} className="text-[#00BCD4]" />
          </div>
          <div className="px-4 pt-4 pb-2">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats.chartData.map((d: any) => ({ ...d, toplam: d.ppe + d.fire + d.intrusion + d.fall }))} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00BCD4" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#00BCD4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="toplam" name="Toplam" stroke="#00BCD4" strokeWidth={2.5} fill="url(#totalG)" dot={{ r: 3, fill: '#00BCD4' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 6. AI Insights with priority styles */}
      <div className="card-premium p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center border"
            style={{ background: 'rgba(0, 188, 212, 0.08)', borderColor: 'rgba(0, 188, 212, 0.15)' }}>
            <Zap size={15} className="text-[#00BCD4]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-display">HypeVision AI İncelemeleri</h3>
            <p className="text-[11px] text-slate-400">Verilerden türetilen dinamik optimizasyon önerileri</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <DataInsight
            priority="high"
            text={`Son 24 saat içinde en yüksek ihlal "${topCategory.name}" kategorisinde gerçekleşti. Kamera 02 (Kaynak Atölyesi) denetim sıklığının artırılması İSG puanını yükseltecektir.`}
          />
          <DataInsight
            priority="medium"
            text="Haftalık İSG Uyum puanı %94.2 seviyesinde seyrediyor. Yangın ve Duman modüllerindeki çözüme kavuşturma oranları %100 başarısıyla devam ediyor."
          />
        </div>
      </div>

      {/* 7. Master Alert table */}
      <AlertTable
        alerts={alerts}
        loading={loading}
        title="Genel İhlal Kayıt Günlüğü"
        emptyMessage="Kayıt bulunamadı."
        onOpenModal={onOpenModal}
        onDeleteAlert={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
        onDeleteAll={() => setAlerts([])}
        defaultRowsPerPage={10}
        showPagination
      />
    </div>
  );
}
