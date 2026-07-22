import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { HardHat, Flame, ShieldAlert, PersonStanding, Zap, TrendingUp } from 'lucide-react';
import { fetchNotifications, fetchModuleAnalytics } from '../services/api';
import AlertTable from '../components/AlertTable';
import { AlertDetail } from '../components/DetailModal';
import { DateFilter } from '../components/Header';

const MiniTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-2.5 text-xs glass-card">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      <p style={{ color: payload[0]?.stroke || payload[0]?.fill }}>
        {payload[0]?.value} <span className="text-slate-400">olay</span>
      </p>
    </div>
  );
};

interface ModuleConfig {
  type: string;
  title: string;
  sublabel: string;
  icon: React.ReactNode;
  description: string;
  accentColor: string;
  accentLight: string;
  stats: { label: string; getValue: (items: AlertDetail[]) => number }[];
  insights: { text: string; priority: 'high' | 'medium' | 'low' }[];
}

const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  ppe: {
    type: 'ppe', title: 'KKD Kontrolü', sublabel: 'PPE Check',
    icon: <HardHat size={20} />,
    description: 'Kişisel koruyucu donanım ihlallerini izleyin. Baret, yelek ve koruyucu ekipman eksikliklerini gerçek zamanlı tespit edin.',
    accentColor: '#F59E0B', accentLight: '#FEF3C7',
    stats: [
      { label: 'Toplam İhlal',   getValue: (i) => i.length },
      { label: 'Kritik',         getValue: (i) => i.filter((x) => x.severity === 'critical').length },
      { label: 'Açık Olaylar',   getValue: (i) => i.filter((x) => x.status === 'unresolved').length },
      { label: 'Çözüldü',        getValue: (i) => i.filter((x) => x.status === 'resolved').length },
    ],
    insights: [
      { text: 'Vardiya değişim saatlerinde (08:00–08:30) Kamera 02 - Metal Kaynak Atölyesi bölgesinde baret ihlali %34 artış gösteriyor. Bu saatlerde güvenlik uyarılarını yoğunlaştırın.', priority: 'high' },
      { text: 'Kamera 03 - Hammadde Depolama Alanı\'nda koruyucu gözlük eksikliği geçen haftaya göre %18 arttı. Saha eğitimini bu bölgeye yönlendirin.', priority: 'medium' },
      { text: 'Cuma günleri öğleden sonra (13:00–16:00) KKD uyumsuzluğu tüm hafta ortalamasının %22 üzerinde seyrediyor.', priority: 'medium' },
    ],
  },
  fire: {
    type: 'fire', title: 'Yangın & Duman', sublabel: 'Fire / Smoke Detection',
    icon: <Flame size={20} />,
    description: 'Termal ve görsel algılama sistemleriyle yangın ve duman tespitini anlık izleyin. Erken uyarı kritik önemdedir.',
    accentColor: '#EF4444', accentLight: '#FEE2E2',
    stats: [
      { label: 'Toplam Alarm',  getValue: (i) => i.length },
      { label: 'Yangın Alarmı', getValue: (i) => i.filter((x) => x.label === 'Yangın Alarmı').length },
      { label: 'Duman Tespiti', getValue: (i) => i.filter((x) => x.label === 'Duman Tespiti').length },
      { label: 'Çözüldü',      getValue: (i) => i.filter((x) => x.status === 'resolved').length },
    ],
    insights: [
      { text: 'Kamera 06 - Elektrik Pano Odası\'nda son 30 günde 5 kez duman tespiti yapıldı. Elektrik tesisatının acil denetimi önerilir.', priority: 'high' },
      { text: 'Kamera 07 - Kimyasal Madde Deposu\'nda yangın algılama gecikmesi ortalama 4.2 saniye. Sensör kalibrasyonu değerlendirilebilir.', priority: 'medium' },
      { text: 'Yüksek ısı anomalisi olaylarının %60\'ı 14:00–16:00 saatlerinde gerçekleşiyor; yaz aylarında özellikle dikkat edilmelidir.', priority: 'low' },
    ],
  },
  intrusion: {
    type: 'intrusion', title: 'Hırsızlık & İhlal', sublabel: 'Intrusion Detection',
    icon: <ShieldAlert size={20} />,
    description: 'Yetkisiz alan girişlerini ve güvenlik ihlallerini gerçek zamanlı tespit ve kayıt altına alın.',
    accentColor: '#F97316', accentLight: '#FFEDD5',
    stats: [
      { label: 'Toplam İhlal',  getValue: (i) => i.length },
      { label: 'Kritik Bölge',  getValue: (i) => i.filter((x) => x.severity === 'critical').length },
      { label: 'Açık',         getValue: (i) => i.filter((x) => x.status === 'unresolved').length },
      { label: 'Çözüldü',      getValue: (i) => i.filter((x) => x.status === 'resolved').length },
    ],
    insights: [
      { text: 'Kamera 04 - Arka Güvenlik Koridoru\'nda gece 22:00–02:00 saatlerinde yetkisiz giriş girişimleri %47 artıyor. Gece vardiyası önlemlerini güçlendirin.', priority: 'high' },
      { text: 'Kamera 01 - Ana Sevkiyat Kapısı\'nda mesai saatleri dışında araç hareketleri tespit edildi. Araç kayıt sistemiyle entegrasyon önerilir.', priority: 'medium' },
      { text: 'Hareket algılama hassasiyeti Kamera 03\'te diğer kameralara göre %15 düşük. Kamera açısı optimizasyonu değerlendirilebilir.', priority: 'low' },
    ],
  },
  fall: {
    type: 'fall', title: 'Düşme & Bayılma', sublabel: 'Fall / Faint Detection',
    icon: <PersonStanding size={20} />,
    description: 'İşçi düşme ve bayılma vakalarını anında tespit edin. Tıbbi acil durum uyarıları ve hızlı müdahale protokollerini etkinleştirin.',
    accentColor: '#EC4899', accentLight: '#FCE7F3',
    stats: [
      { label: 'Toplam Vaka', getValue: (i) => i.length },
      { label: 'Düşme',      getValue: (i) => i.filter((x) => x.label === 'Düşme Tespiti').length },
      { label: 'Bayılma',     getValue: (i) => i.filter((x) => x.label === 'Bayılma Tespiti').length },
      { label: 'Çözüldü',    getValue: (i) => i.filter((x) => x.status === 'resolved').length },
    ],
    insights: [
      { text: 'Kamera 02 - Metal Kaynak Atölyesi\'nde düşme vakalarının %72\'si kayma riski yüksek ıslak zemin bölgelerinde yaşanıyor. Zemin uyarı işaretçilerini güçlendirin.', priority: 'high' },
      { text: 'Sıcak yaz aylarında bayılma vakalarında belirgin artış gözlemleniyor. Hidrasyon istasyonları ve periyodik sağlık kontrolleri önerilebilir.', priority: 'medium' },
      { text: 'Düşme tespiti sonrası ortalama müdahale süresi 3.8 dakika. Acil müdahale ekibinin sahaya erişim süresi iyileştirilebilir.', priority: 'medium' },
    ],
  },
};

const PRIORITY_STYLES = {
  high:   { bar: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50',    dot: 'bg-red-500',    label: 'Yüksek' },
  medium: { bar: 'bg-amber-500',  text: 'text-amber-700',  bg: 'bg-amber-50',  dot: 'bg-amber-500',  label: 'Orta'   },
  low:    { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500', label: 'Düşük' },
};

interface ModulePageProps {
  module: 'ppe' | 'fire' | 'intrusion' | 'fall';
  dateFilter: DateFilter;
  onOpenModal: (a: AlertDetail) => void;
}

export default function ModulePage({ module, dateFilter, onOpenModal }: ModulePageProps) {
  const [alerts, setAlerts] = useState<AlertDetail[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const config = MODULE_CONFIGS[module];

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchNotifications({ type: config.type }),
      fetchModuleAnalytics(config.type),
    ]).then(([items, ana]) => {
      setAlerts(items as AlertDetail[]);
      setAnalytics(ana);
      setLoading(false);
    });
  }, [module, dateFilter]);

  const gradId = `mod-${module}`;
  const accent = config.accentColor;

  return (
    <div className="space-y-5">
      {/* Module header */}
      <div className="card-premium animate-fade-up" style={{ borderTop: `3px solid ${accent}` }}>
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
              style={{ backgroundColor: accent }}
            >
              {config.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-slate-800 font-display">{config.title}</h2>
                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">{config.sublabel}</span>
              </div>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">{config.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {config.stats.map((stat, i) => (
          <div key={stat.label} className={`card-premium p-4 animate-fade-up-${i + 1}`} style={{ borderTop: `2px solid ${accent}40` }}>
            <p className="text-[11px] text-slate-400 font-medium">{stat.label}</p>
            <p className="text-2xl font-extrabold mt-1" style={{ color: accent }}>
              {loading ? '—' : stat.getValue(alerts).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Monthly trend */}
          <div className="md:col-span-2 card-premium">
            <div className="px-5 pt-4 pb-3 border-b border-slate-100/80">
              <h3 className="text-sm font-bold text-slate-800 font-display">Aylık Trend</h3>
              <p className="text-xs text-slate-400">Son 12 ay olay sayısı</p>
            </div>
            <div className="px-4 pb-4 pt-3">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={analytics.monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<MiniTooltip />} />
                  <Area
                    type="monotone" dataKey="value" name="Olay"
                    stroke={accent} strokeWidth={2.5}
                    fill={`url(#${gradId})`}
                    dot={{ fill: accent, r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: accent, stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly bar */}
          <div className="card-premium">
            <div className="px-5 pt-4 pb-3 border-b border-slate-100/80">
              <h3 className="text-sm font-bold text-slate-800 font-display">Haftalık Dağılım</h3>
              <p className="text-xs text-slate-400">Bu haftaki günlük sayılar</p>
            </div>
            <div className="px-4 pb-4 pt-3">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={analytics.weekly} barCategoryGap="35%" margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<MiniTooltip />} cursor={{ fill: `${accent}10`, rx: 6, ry: 6 }} />
                  <Bar dataKey="value" name="Olay" fill={accent} radius={[5, 5, 0, 0]} isAnimationActive animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hourly line */}
          <div className="md:col-span-3 card-premium">
            <div className="px-5 pt-4 pb-3 border-b border-slate-100/80 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 font-display">Saatlik Olay Yoğunluğu</h3>
                <p className="text-xs text-slate-400">Günün 24 saatine göre dağılım</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-0.5">
                <TrendingUp size={12} />
                <span>Pik: 09:00–10:00</span>
              </div>
            </div>
            <div className="px-4 pb-4 pt-3">
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={analytics.hourly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<MiniTooltip />} />
                  <Line
                    type="monotone" dataKey="value" name="Olay"
                    stroke={accent} strokeWidth={2.5}
                    dot={false} activeDot={{ r: 5, fill: accent, stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive animationDuration={1300}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights */}
      <div className="card-premium p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: config.accentLight, borderColor: `${accent}30` }}>
            <Zap size={15} style={{ color: accent }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-display">HypeVision AI Analiz</h3>
            <p className="text-[11px] text-slate-400">{config.title} modülüne özel bağlamsal analiz</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {config.insights.map((insight, idx) => {
            const s = PRIORITY_STYLES[insight.priority];
            return (
              <div key={idx} className={`relative rounded-xl border border-slate-200/80 p-3.5 overflow-hidden ${s.bg}`}>
                <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${s.bar}`} />
                <div className="pl-2.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${s.text} opacity-70`}>{s.label} Öncelik</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${s.text}`}>{insight.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts table */}
      <AlertTable
        alerts={alerts}
        loading={loading}
        title={`${config.title} Kayıtları`}
        emptyMessage="Bu dönemde olay kaydı bulunmuyor."
        onOpenModal={onOpenModal}
        onDeleteAlert={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
        onDeleteAll={() => setAlerts([])}
        showPagination
      />
    </div>
  );
}
