import { useEffect, useMemo, useState } from "react";
import { BarChart3, Clock, Package, TrendingUp } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../api";
import { useAuth } from "../hooks/useAuth";
import { useLocale } from "../context/LocaleContext";
import { localeTag } from "../i18n/helpers";
import FilterBar from "../components/FilterBar";
import { EmptyChart } from "../components/EmptyState";
import { DataTable, Panel, StatCard } from "../components/ui";
import { CHART, axisTick, chartTooltipStyle, gridStroke } from "../lib/chartTheme";

const TYPE_COLORS = [CHART.violet, "#8b5cf6", CHART.sky, CHART.cyan];
const HAT_COLORS = [CHART.violet, CHART.sky, CHART.emerald, CHART.cyan, CHART.amber];

export default function ProductView({ data: initial }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const dates = initial.dates || initial.product_counts?.dates || [];
  const [date, setDate] = useState(dates[0]);
  const [search, setSearch] = useState("");
  const [granularity, setGranularity] = useState("saat");
  const [pc, setPc] = useState(initial.product_counts);
  const [loading, setLoading] = useState(false);

  const numFmt = (n) => Number(n).toLocaleString(localeTag(locale));

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    api.productCounts(date)
      .then(setPc)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  const hatlar = useMemo(() => {
    const q = search.toLowerCase();
    const list = (pc?.hatlar || []).filter((h) => !q || h.hat.toLowerCase().includes(q));
    return [...list].sort((a, b) => b.adet - a.adet);
  }, [pc, search]);

  const chartData = granularity === "saat" ? pc?.saatlik || [] : pc?.gunluk_trend || [];

  const peakHour = useMemo(() => {
    const saatlik = pc?.saatlik || [];
    if (!saatlik.length) return null;
    return saatlik.reduce((max, s) => (s.adet > max.adet ? s : max), saatlik[0]);
  }, [pc]);

  const topHat = hatlar[0] || null;

  const ortSaatlik = useMemo(() => {
    const saatlik = pc?.saatlik || [];
    if (!saatlik.length) return 0;
    return Math.round(saatlik.reduce((a, s) => a + s.adet, 0) / saatlik.length);
  }, [pc]);

  if (loading) {
    return (
      <div className="module-page product-page">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t.hatAra}
          date={date}
          onDateChange={setDate}
          dates={dates}
          granularity={granularity}
          onGranularityChange={setGranularity}
        />
        <div className="module-loading">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  const hasUrunModule = user?.moduller?.includes("urun");
  const hasProductData = (pc?.toplam || 0) > 0 || hatlar.length > 0;

  if (!hasUrunModule) {
    return (
      <div className="module-page product-page">
        <Panel><EmptyChart title={t.urunModuleOff} subtitle={t.urunEmptySub} /></Panel>
      </div>
    );
  }

  if (!hasProductData) {
    return (
      <div className="module-page product-page">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t.hatAra}
          date={date}
          onDateChange={setDate}
          dates={dates}
          granularity={granularity}
          onGranularityChange={setGranularity}
        />
        <Panel><EmptyChart title={t.urunEmptyTitle} subtitle={t.urunEmptySub} /></Panel>
      </div>
    );
  }

  return (
    <div className="module-page product-page">
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t.hatAra}
        date={date}
        onDateChange={setDate}
        dates={dates}
        granularity={granularity}
        onGranularityChange={setGranularity}
      />

      <section className="module-kpi-row" aria-label={t.kpiOzet}>
        <StatCard
          title={t.gunlukToplamSayim}
          value={numFmt(pc?.toplam || 0)}
          subtitle={initial.summary?.urun_sayim_bugun?.degisim}
          icon={Package}
          accent="purple"
        />
        <StatCard
          title={t.aktifHatSayisi}
          value={hatlar.length}
          subtitle={t.hatBazliSayim}
          icon={BarChart3}
          accent="cyan"
        />
        <StatCard
          title={t.urunEnYogunHat}
          value={topHat ? topHat.hat : "—"}
          subtitle={topHat ? `${numFmt(topHat.adet)} ${t.adet}` : t.seciliGun}
          icon={TrendingUp}
          accent="green"
        />
        <StatCard
          title={t.urunPikSaat}
          value={peakHour ? numFmt(peakHour.adet) : "—"}
          subtitle={peakHour ? peakHour.saat : `${t.urunOrtSaatlik}: ${numFmt(ortSaatlik)}`}
          icon={Clock}
          accent="orange"
        />
      </section>

      <section className="module-charts-row">
        <Panel title={granularity === "saat" ? t.saatlikUretim : t.gunlukTrend} subtitle={date}>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              {granularity === "saat" ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.violet} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={CHART.violet} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="saat" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle()} />
                  <Area type="monotone" dataKey="adet" stroke={CHART.violet} strokeWidth={2} fill="url(#prodGrad)" />
                </AreaChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="gun" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle()} />
                  <Bar dataKey="adet" fill={CHART.violet} radius={[6, 6, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Panel>

        <Panel title={t.urunTuruDagilimi} subtitle={t.seciliGun}>
          {(pc?.urun_turleri || []).length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pc.urun_turleri} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="tur" width={100} tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle()} />
                <Bar dataKey="adet" radius={[0, 6, 6, 0]} barSize={18}>
                  {(pc.urun_turleri || []).map((_, i) => (
                    <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Panel>
      </section>

      {hatlar.length > 0 && (
        <Panel title={t.urunHatKartlari} subtitle={t.urunHatKartlariAlt}>
          <div className="product-hat-grid">
            {hatlar.map((h, i) => {
              const pay = pc?.toplam ? Math.round((h.adet / pc.toplam) * 100) : 0;
              return (
                <div key={h.hat} className="product-hat-card">
                  <div className="product-hat-card-top">
                    <span className="product-hat-rank">#{i + 1}</span>
                    <span className="product-hat-name">{h.hat}</span>
                    <span className="product-hat-val">{numFmt(h.adet)}</span>
                  </div>
                  <div className="progress-track h-2">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pay}%`, background: HAT_COLORS[i % HAT_COLORS.length] }}
                    />
                  </div>
                  <span className="product-hat-pay">%{pay} {t.pay}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <Panel title={t.hatBazliSayimTablo} subtitle={t.herHatAyri} flush>
        <DataTable minWidth="560px">
          <thead>
            <tr>
              <th>{t.sira}</th>
              <th>{t.hat}</th>
              <th className="text-right">{t.adet}</th>
              <th>{t.pay}</th>
            </tr>
          </thead>
          <tbody>
            {hatlar.length === 0 ? (
              <tr className="empty-row"><td colSpan={4}>{t.hatBulunamadi}</td></tr>
            ) : hatlar.map((h, i) => {
              const pay = pc?.toplam ? Math.round((h.adet / pc.toplam) * 100) : 0;
              return (
                <tr key={h.hat}>
                  <td className="font-mono text-xs text-[var(--text-muted)]">#{i + 1}</td>
                  <td className="font-medium">{h.hat}</td>
                  <td className="text-right font-semibold text-violet-500">{numFmt(h.adet)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="progress-track h-2 flex-1 max-w-[140px]">
                        <div
                          className="h-full rounded-full bg-violet-500"
                          style={{ width: `${pay}%` }}
                        />
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">%{pay}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </Panel>
    </div>
  );
}
