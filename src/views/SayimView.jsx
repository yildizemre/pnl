import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Clock, Download, FileSpreadsheet, Gauge, Package, TrendingUp, Video,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../api";
import { useLocale } from "../context/LocaleContext";
import { localeTag } from "../i18n/helpers";
import FilterBar from "../components/FilterBar";
import { EmptyChart } from "../components/EmptyState";
import { DataTable, Panel, StatCard } from "../components/ui";
import { CHART, axisTick, chartTooltipStyle, gridStroke } from "../lib/chartTheme";

const PERIODS = ["saat", "gun", "ay"];
const HAT_COLORS = [CHART.emerald, CHART.sky, CHART.violet, CHART.amber, CHART.cyan];

function formatCycle(sec, t) {
  if (sec == null || Number.isNaN(Number(sec))) return "—";
  const n = Number(sec);
  if (n < 60) return `${n.toFixed(n < 10 ? 1 : 0)} ${t.saniyeKisa || "sn"}`;
  const m = Math.floor(n / 60);
  const s = Math.round(n % 60);
  return `${m}${t.dakikaKisa || "dk"} ${s}${t.saniyeKisa || "sn"}`;
}

export default function SayimView({ data: initial }) {
  const { t, locale } = useLocale();
  const dates = initial.dates || initial.product_counts?.dates || [];
  const [date, setDate] = useState(dates[0]);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("saat");
  const [selectedId, setSelectedId] = useState(null);
  const [pc, setPc] = useState(initial.product_counts);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(null);

  const numFmt = (n) => Number(n ?? 0).toLocaleString(localeTag(locale));

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    api.sayimCounts(date, period)
      .then((res) => {
        setPc(res);
        const list = res?.istasyonlar || [];
        if (!selectedId && list[0]) setSelectedId(list[0].id);
        else if (selectedId && !list.find((s) => s.id === selectedId) && list[0]) {
          setSelectedId(list[0].id);
        }
      })
      .catch(() => setPc(initial.product_counts))
      .finally(() => setLoading(false));
  }, [date, period]); // eslint-disable-line react-hooks/exhaustive-deps

  const istasyonlar = useMemo(() => {
    const q = search.toLowerCase();
    return (pc?.istasyonlar || []).filter(
      (s) =>
        !q ||
        s.ad?.toLowerCase().includes(q) ||
        s.hat?.toLowerCase().includes(q) ||
        s.kamera?.toLowerCase().includes(q)
    );
  }, [pc, search]);

  const hatlar = pc?.hatlar || [];
  const selected = istasyonlar.find((s) => s.id === selectedId) || istasyonlar[0] || null;

  const compareChart = useMemo(() => {
    if (!selected?.saatlik?.length) return pc?.saatlik || [];
    return selected.saatlik.map((r) => ({
      saat: r.saat,
      gerceklesen: r.adet,
      beklenen: r.beklenen,
      cycle: r.ort_cycle_sn,
    }));
  }, [selected, pc]);

  const trendChart = period === "saat"
    ? (pc?.saatlik || []).map((r) => ({ label: r.saat, adet: r.adet, beklenen: r.beklenen }))
    : (pc?.gunluk_trend || []).map((r) => ({ label: r.gun || r.tarih, adet: r.adet }));

  const download = async (format) => {
    const key = `sayim-${format}`;
    setExporting(key);
    try {
      const blob = await api.exportReport(t.sayim || "Sayim", format, {
        kind: "sayim",
        period,
        tarih: date,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sayim_${period}_${date}.${format === "xlsx" ? "xlsx" : format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="module-page sayim-page">
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t.istasyonAra || t.hatAra}
        date={date}
        onDateChange={setDate}
        dates={dates}
        showGranularity={false}
        extra={
          <div className="sayim-toolbar">
            <div className="flex rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    period === p ? "bg-[var(--accent-bg)] text-[var(--accent)]" : "text-[var(--text-muted)]"
                  }`}
                >
                  {t[`period_${p}`] || t[`period_${p === "saat" ? "gun" : p}`] || p}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn-secondary mes-export-btn"
              disabled={!!exporting}
              onClick={() => download("xlsx")}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {exporting === "sayim-xlsx" ? "…" : "Excel"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!!exporting}
              onClick={() => download("csv")}
            >
              <Download className="h-3.5 w-3.5" />
              {exporting === "sayim-csv" ? "…" : "CSV"}
            </button>
          </div>
        }
      />

      {loading && (
        <div className="module-loading">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        </div>
      )}

      {!loading && (
        <>
          <section className="module-kpi-row" aria-label={t.kpiOzet}>
            <StatCard
              title={t.toplamSayim}
              value={numFmt(pc?.toplam || 0)}
              subtitle={`${t.beklenen}: ${numFmt(pc?.beklenen_toplam || 0)}`}
              icon={Package}
              accent="green"
            />
            <StatCard
              title={t.hatVerimlilik}
              value={`${pc?.verimlilik_pct ?? 0}%`}
              subtitle={t.gercekVsBeklenen}
              icon={Gauge}
              accent="cyan"
            />
            <StatCard
              title={t.aktifIstasyon}
              value={pc?.istasyon_sayisi ?? istasyonlar.length}
              subtitle={`${pc?.hat_sayisi ?? hatlar.length} ${t.hat}`}
              icon={BarChart3}
              accent="purple"
            />
            <StatCard
              title={t.ortCycle}
              value={formatCycle(
                istasyonlar.length
                  ? istasyonlar.reduce((a, s) => a + (s.ort_cycle_sn || 0), 0) / istasyonlar.filter((s) => s.ort_cycle_sn).length
                  : null,
                t
              )}
              subtitle={t.ortCycleAlt}
              icon={Clock}
              accent="orange"
            />
          </section>

          <section className="sayim-split">
            <Panel
              title={t.saatlikSayimKarsilastirma}
              subtitle={
                selected
                  ? `${selected.hat} — ${selected.ad} · ${t.gercekVsBeklenen}`
                  : t.gercekVsBeklenen
              }
            >
              {compareChart.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={compareChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="saat" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle()} />
                    <Legend />
                    <Bar dataKey="beklenen" name={t.beklenen} fill={CHART.sky} radius={[4, 4, 0, 0]} opacity={0.45} />
                    <Bar dataKey="gerceklesen" name={t.gerceklesen} fill={CHART.emerald} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </Panel>

            <Panel title={period === "saat" ? t.saatlikUretim : t.gunlukTrend} subtitle={date}>
              {trendChart.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trendChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle()} />
                    <Line type="monotone" dataKey="adet" name={t.adet} stroke={CHART.violet} strokeWidth={2} dot={false} />
                    {period === "saat" && (
                      <Line type="monotone" dataKey="beklenen" name={t.beklenen} stroke={CHART.sky} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </Panel>
          </section>

          <Panel title={t.hatVerimlilikKarsilastirma} subtitle={t.hatBazliSayim} flush>
            <DataTable minWidth="560px">
              <thead>
                <tr>
                  <th>{t.hat}</th>
                  <th className="text-right">{t.adet}</th>
                  <th className="text-right">{t.beklenen}</th>
                  <th>{t.verimlilik}</th>
                  <th className="text-right">{t.ortCycle}</th>
                  <th className="text-right">{t.istasyon}</th>
                </tr>
              </thead>
              <tbody>
                {hatlar.length === 0 ? (
                  <tr className="empty-row"><td colSpan={6}>{t.hatBulunamadi}</td></tr>
                ) : hatlar.map((h, i) => (
                  <tr key={h.hat}>
                    <td>
                      <span className="sayim-hat-dot" style={{ background: HAT_COLORS[i % HAT_COLORS.length] }} />
                      <span className="font-medium">{h.hat}</span>
                    </td>
                    <td className="text-right font-semibold">{numFmt(h.adet)}</td>
                    <td className="text-right text-[var(--text-muted)]">{numFmt(h.beklenen)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="progress-track h-2 flex-1 max-w-[120px]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, h.verimlilik_pct || 0)}%`,
                              background: HAT_COLORS[i % HAT_COLORS.length],
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold">{h.verimlilik_pct}%</span>
                      </div>
                    </td>
                    <td className="text-right text-sm">{formatCycle(h.ort_cycle_sn, t)}</td>
                    <td className="text-right text-[var(--text-muted)]">{h.istasyon_sayisi}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </Panel>

          <div className="sayim-stations">
            <Panel title={t.istasyonlar} subtitle={t.toplamSayimAlt} flush className="sayim-station-list">
              <div className="sayim-station-cards">
                {istasyonlar.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`sayim-station-card ${selected?.id === s.id ? "is-active" : ""}`}
                    onClick={() => setSelectedId(s.id)}
                  >
                    <div className="sayim-station-card-top">
                      <span className="sayim-station-hat">{s.hat}</span>
                      <span className="sayim-station-pct">{s.verimlilik_pct}%</span>
                    </div>
                    <strong className="sayim-station-name">{s.ad}</strong>
                    <div className="sayim-station-meta">
                      <span><Video className="h-3 w-3" />{s.kamera}</span>
                      <span><TrendingUp className="h-3 w-3" />{numFmt(s.adet)}</span>
                      <span><Clock className="h-3 w-3" />{formatCycle(s.ort_cycle_sn, t)}</span>
                    </div>
                  </button>
                ))}
                {!istasyonlar.length && (
                  <EmptyChart title={t.sayimEmptyTitle} subtitle={t.sayimEmptySub} />
                )}
              </div>
            </Panel>

            <Panel
              title={selected ? selected.ad : t.istasyonDetay}
              subtitle={selected ? `${selected.hat} · ${t.cycleSaatlik}` : ""}
              flush
            >
              {selected?.saatlik?.length ? (
                <DataTable minWidth="480px">
                  <thead>
                    <tr>
                      <th>{t.saat}</th>
                      <th className="text-right">{t.gerceklesen}</th>
                      <th className="text-right">{t.beklenen}</th>
                      <th className="text-right">{t.ortCycle}</th>
                      <th>{t.verimlilik}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.saatlik.map((r) => (
                      <tr key={r.saat}>
                        <td className="font-mono text-xs">{r.saat}</td>
                        <td className="text-right font-semibold">{numFmt(r.adet)}</td>
                        <td className="text-right text-[var(--text-muted)]">{numFmt(r.beklenen)}</td>
                        <td className="text-right">
                          <span className={`sayim-cycle ${r.ort_cycle_sn >= 25 ? "sayim-cycle--slow" : "sayim-cycle--fast"}`}>
                            {formatCycle(r.ort_cycle_sn, t)}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs font-semibold">{r.verimlilik_pct}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              ) : (
                <div className="p-6">
                  <EmptyChart title={t.cycleSaatlik} subtitle={period !== "saat" ? t.cycleSaatlikHint : t.sayimEmptySub} />
                </div>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
