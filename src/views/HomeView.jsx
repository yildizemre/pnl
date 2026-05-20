import { Camera, ChevronDown, ChevronUp, LayoutDashboard, Package, Settings2, ShieldAlert, Users } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { translateCategory, localeTag } from "../i18n/helpers";
import CompareToggle from "../components/CompareToggle";
import { ChartTooltipTraffic, Panel, StatCard } from "../components/ui";

const DEFAULT_LAYOUT = { showKpis: true, showTraffic: true, showNotifChart: true };

function ChangeBadge({ pct }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-emerald-500" : "text-red-500"}`}>
      {up ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export default function HomeView({ data, compare, onCompareChange, onLayoutSave }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const [layoutOpen, setLayoutOpen] = useState(false);
  const layout = { ...DEFAULT_LAYOUT, ...(user?.dashboard_layout || data?.user?.dashboard_layout || {}) };

  const [localLayout, setLocalLayout] = useState(layout);
  const s = data.summary;
  const cmp = data.compare;
  const stats = (data.notification_stats || []).map((x) => ({
    ...x,
    kategori: translateCategory(locale, x.kategori),
  }));

  const numFmt = (n) => Number(n).toLocaleString(localeTag(locale));

  const kpis = useMemo(() => {
    const base = [
      { key: "kameralar", title: t.kpiAktifKamera, value: <>{s.kameralar.aktif}<span className="text-lg font-normal text-[var(--text-muted)]"> / {s.kameralar.toplam}</span></>, sub: s.kameralar.degisim, accent: "cyan", icon: Camera },
      { key: "personel", title: t.kpiAktifPersonel, value: s.aktif_personel.sayi, sub: s.aktif_personel.degisim, accent: "blue", icon: Users },
      { key: "isg", title: t.kpiIsgIhlal, value: s.isg_ihlaller.bugun, sub: s.isg_ihlaller.alt_metin, accent: "red", icon: ShieldAlert },
      { key: "urun", title: t.kpiUrunSayim, value: numFmt(data.product_counts?.toplam || 0), sub: s.urun_sayim_bugun?.degisim || "", accent: "purple", icon: Package },
      { key: "verim", title: t.kpiOrtVerimlilik, value: `%${s.hat_verimlilik.ortalama}`, sub: s.hat_verimlilik.alt_metin, accent: "green", icon: LayoutDashboard },
      { key: "bildirim", title: t.kpiOkunmamisBildirim, value: s.bildirim_sayisi, sub: t.sonBildirimler, accent: "orange", icon: ShieldAlert },
    ];
    if (!cmp?.summary) return base;
    const map = {
      personel: "aktif_personel",
      isg: "isg_ihlaller",
      urun: "urun_sayim",
      verim: "verimlilik",
      bildirim: "bildirim",
    };
    return base.map((k) => {
      const ck = map[k.key];
      const c = cmp.summary[ck];
      if (!c) return k;
      return {
        ...k,
        sub: (
          <span className="flex flex-wrap items-center gap-2">
            <span>{t.oncekiDonem}: {c.previous}</span>
            <ChangeBadge pct={c.change_pct} />
          </span>
        ),
      };
    });
  }, [s, data, cmp, t, locale]);

  const trafficData = cmp?.traffic || data.traffic;
  const hasCompareTraffic = cmp?.traffic?.some((x) => x.kisi_once != null);

  const saveLayout = () => {
    onLayoutSave?.(localLayout);
    setLayoutOpen(false);
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CompareToggle value={compare || ""} onChange={onCompareChange} />
        <button type="button" onClick={() => setLayoutOpen(!layoutOpen)} className="btn-ghost self-start sm:self-auto">
          <Settings2 className="h-4 w-4" />
          {t.dashboardDuzenle}
        </button>
      </div>

      {layoutOpen && (
        <div className="panel panel-body flex flex-wrap gap-4">
          {[
            { key: "showKpis", label: t.layoutKpi },
            { key: "showTraffic", label: t.layoutTraffic },
            { key: "showNotifChart", label: t.layoutCharts },
          ].map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={localLayout[key] !== false}
                onChange={(e) => setLocalLayout({ ...localLayout, [key]: e.target.checked })}
                className="rounded border-[var(--border)]"
              />
              {label}
            </label>
          ))}
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <button type="button" onClick={() => setLayoutOpen(false)} className="btn-ghost">{t.iptal}</button>
            <button type="button" onClick={saveLayout} className="btn-primary">{t.kaydet}</button>
          </div>
        </div>
      )}

      {localLayout.showKpis !== false && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kpis.map((k) => (
            <StatCard key={k.key} title={k.title} value={k.value} subtitle={k.sub} subtitleClass="text-[var(--accent)]" icon={k.icon} accent={k.accent} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {localLayout.showTraffic !== false && (
          <Panel title={t.sistemAktivitesi} subtitle={hasCompareTraffic ? t.bugunDun : t.son24Saat}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trafficData}>
                <defs>
                  <linearGradient id="homeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="saat" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltipTraffic />} />
                {hasCompareTraffic && <Legend />}
                <Area type="monotone" dataKey="kisi" name={t.simdi} stroke="#34d399" strokeWidth={2} fill="url(#homeGrad)" />
                {hasCompareTraffic && (
                  <Area type="monotone" dataKey="kisi_once" name={t.oncekiDonem} stroke="#94a3b8" strokeWidth={2} fill="transparent" strokeDasharray="4 4" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {localLayout.showNotifChart !== false && (
          <Panel title={t.bildirimOzeti} subtitle={t.kategoriDagilimi}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="kategori" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="adet" radius={[6, 6, 0, 0]}>
                  {(data.notification_stats || []).map((x) => <Cell key={x.kategori} fill={x.renk} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}
      </div>
    </>
  );
}
