import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Download,
  FileSpreadsheet,
  Mail,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";
import { useLocale } from "../context/LocaleContext";
import { translateCategory, localeTag } from "../i18n/helpers";
import FilterBar from "../components/FilterBar";
import { EmptyChart } from "../components/EmptyState";
import { DataTable, Panel, StatCard } from "../components/ui";
import { CHART, axisTick, chartTooltipStyle, gridStroke } from "../lib/chartTheme";

function formatDay(iso, locale) {
  return new Date(iso + "T12:00:00").toLocaleDateString(localeTag(locale), { day: "2-digit", month: "short" });
}

export default function ReportsView({ data }) {
  const { t, locale } = useLocale();
  const dates = data.dates || [];
  const [date, setDate] = useState(dates[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailMsg, setEmailMsg] = useState(null);
  const [exporting, setExporting] = useState(null);

  const numFmt = (n) => Number(n ?? 0).toLocaleString(localeTag(locale));
  const mes = data.productivity || {};
  const personeller = mes.personeller || [];

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    api
      .reportsKpis(date)
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [date]);

  const kpi = report?.kpi;
  const trend = useMemo(
    () => (report?.trend || []).map((row) => ({ ...row, gun: formatDay(row.tarih, locale) })),
    [report?.trend, locale]
  );
  const kategori = useMemo(
    () => (report?.kategori_dagilim || []).map((s) => ({
      ...s,
      kategori: translateCategory(locale, s.kategori),
    })),
    [report?.kategori_dagilim, locale]
  );

  const presenceByHat = useMemo(() => {
    const map = {};
    personeller.forEach((p) => {
      if (!map[p.hat]) map[p.hat] = { hat: p.hat, total: 0, count: 0, yok: 0 };
      map[p.hat].total += p.presence_pct || 0;
      map[p.hat].yok += Number(p.yok_saat) || 0;
      map[p.hat].count += 1;
    });
    return Object.values(map)
      .map((h) => ({
        hat: h.hat,
        yerinde: Math.round((h.total / h.count) * 10) / 10,
        yok: Math.round(h.yok * 10) / 10,
      }))
      .sort((a, b) => a.yerinde - b.yerinde);
  }, [personeller]);

  const topRisk = useMemo(
    () => [...personeller].sort((a, b) => (a.presence_pct || 100) - (b.presence_pct || 100)).slice(0, 5),
    [personeller]
  );

  const sendDaily = async () => {
    try {
      const res = await api.dailyEmail();
      setEmailMsg(res.mesaj);
      setTimeout(() => setEmailMsg(null), 4000);
    } catch (e) {
      alert(e.message);
    }
  };

  const downloadReport = async (format, kind = "isg_haftalik") => {
    setExporting(`${kind}-${format}`);
    try {
      const blob = await api.exportReport(
        kind === "mes" ? t.personelPresenceTablo : kind === "bildirimler" ? t.bildirimler : t.isgHaftalikPdf,
        format,
        { kind, period: kind === "mes" ? "hafta" : "hafta", tarih: date }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kind}_${date}.${format === "xlsx" ? "xlsx" : "pdf"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    } finally {
      setExporting(null);
    }
  };

  const avgPresence = mes.ortalama_yerinde
    ?? (personeller.length
      ? Math.round(personeller.reduce((a, p) => a + (p.presence_pct || 0), 0) / personeller.length * 10) / 10
      : null);

  return (
    <div className="module-page reports-page">
      <FilterBar
        showSearch={false}
        date={date}
        onDateChange={setDate}
        dates={dates}
        showGranularity={false}
        extra={
          <div className="reports-actions">
            <button type="button" onClick={() => downloadReport("pdf", "isg_haftalik")} className="btn-secondary shrink-0" disabled={!!exporting}>
              <Download className="h-4 w-4" />
              {exporting === "isg_haftalik-pdf" ? "…" : t.isgHaftalikPdf}
            </button>
            <button type="button" onClick={() => downloadReport("xlsx", "isg_haftalik")} className="btn-secondary shrink-0" disabled={!!exporting}>
              <FileSpreadsheet className="h-4 w-4" />
              {exporting === "isg_haftalik-xlsx" ? "…" : t.isgHaftalikExcel}
            </button>
            <button type="button" onClick={() => downloadReport("xlsx", "mes")} className="btn-secondary shrink-0" disabled={!!exporting}>
              <FileSpreadsheet className="h-4 w-4" />
              {exporting === "mes-xlsx" ? "…" : t.mesExcel}
            </button>
            <button type="button" onClick={() => downloadReport("xlsx", "bildirimler")} className="btn-secondary shrink-0" disabled={!!exporting}>
              <FileSpreadsheet className="h-4 w-4" />
              {exporting === "bildirimler-xlsx" ? "…" : t.bildirimExcel}
            </button>
            <button type="button" onClick={sendDaily} className="btn-secondary shrink-0">
              <Mail className="h-4 w-4" />
              {t.gunlukOzet}
            </button>
          </div>
        }
      />

      {emailMsg && <p className="module-toast">{emailMsg}</p>}

      {loading ? (
        <Panel><p className="text-sm text-[var(--text-muted)]">{t.kpiYukleniyor}</p></Panel>
      ) : !kpi ? (
        <Panel><EmptyChart title={t.raporEmptyTitle} subtitle={t.raporEmptySub} /></Panel>
      ) : (
        <>
          <section className="module-kpi-row" aria-label={t.kpiOzet}>
            <StatCard title={t.ortVerimli} value={avgPresence != null ? `%${avgPresence}` : "—"} subtitle={t.ortVerimliAlt} icon={TrendingUp} accent="green" />
            <StatCard title={t.isgIhlali} value={kpi.isg_ihlal} subtitle={t.seciliTarih} icon={ShieldAlert} accent="orange" />
            <StatCard title={t.bildirim} value={kpi.bildirim_sayisi} subtitle={`${kpi.log_sayisi} ${t.logKaydi}`} icon={Bell} accent="purple" />
            <StatCard title={t.aktifPersonel} value={personeller.length || kpi.personel_aktif || 0} subtitle={data.summary?.kameralar ? `${data.summary.kameralar.aktif}/${data.summary.kameralar.toplam} ${t.kpiAktifKamera}` : ""} icon={Users} accent="blue" />
          </section>

          <Panel title={t.raporOzetBaslik} subtitle={t.raporMusteriAlt} className="reports-summary-panel">
            <div className="reports-summary-grid">
              <div className="reports-summary-item">
                <Activity className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="reports-summary-lbl">{t.ortVerimli}</p>
                  <p className="reports-summary-val">{avgPresence != null ? `%${avgPresence}` : "—"}</p>
                </div>
              </div>
              <div className="reports-summary-item">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="reports-summary-lbl">{t.isgVeBildirim}</p>
                  <p className="reports-summary-val">{kpi.isg_ihlal} / {kpi.bildirim_sayisi}</p>
                </div>
              </div>
              <div className="reports-summary-item">
                <BarChart3 className="h-4 w-4 text-sky-500" />
                <div>
                  <p className="reports-summary-lbl">{t.kpiAktifKamera}</p>
                  <p className="reports-summary-val">{data.summary?.kameralar?.aktif}/{data.summary?.kameralar?.toplam}</p>
                </div>
              </div>
              <div className="reports-summary-item">
                <Users className="h-4 w-4 text-violet-500" />
                <div>
                  <p className="reports-summary-lbl">{t.mesDikkatGereken}</p>
                  <p className="reports-summary-val">{personeller.filter((p) => (p.presence_pct || 100) < 85).length}</p>
                </div>
              </div>
            </div>
          </Panel>

          <section className="module-charts-row">
            <Panel title={t.trend30Gun} subtitle={t.trendBildirimVerim} className="reports-trend-panel">
              {trend.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="repNotifGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART.violet} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={CHART.violet} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="gun" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[70, 100]} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle()} />
                    <Area yAxisId="left" type="monotone" dataKey="bildirim_sayisi" name={t.bildirim} stroke={CHART.violet} fill="url(#repNotifGrad)" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="verimlilik" name={t.verimlilik} stroke={CHART.emerald} strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </Panel>

            <Panel title={t.kategoriDagilimi} subtitle={date}>
              {kategori.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={kategori}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="kategori" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle()} />
                    <Bar dataKey="adet" radius={[6, 6, 0, 0]} barSize={36}>
                      {kategori.map((row, i) => (
                        <Cell key={i} fill={row.renk || CHART.violet} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </Panel>
          </section>

          <section className="module-charts-row">
            <Panel title={t.raporHatPresence} subtitle={t.raporHatPresenceAlt}>
              {presenceByHat.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={presenceByHat} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                    <XAxis type="number" domain={[60, 100]} tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="hat" width={110} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle()} formatter={(v) => [`%${v}`, t.ortVerimli]} />
                    <Bar dataKey="yerinde" fill={CHART.emerald} radius={[0, 6, 6, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart title={t.mesEmptyTitle} />
              )}
            </Panel>

            <Panel title={t.raporRiskPersonel} subtitle={t.raporRiskPersonelAlt} flush>
              <DataTable minWidth="420px">
                <thead>
                  <tr>
                    <th>{t.adSoyad}</th>
                    <th>{t.istasyon}</th>
                    <th>{t.yerindeOran}</th>
                    <th>{t.yokSure}</th>
                  </tr>
                </thead>
                <tbody>
                  {topRisk.length === 0 ? (
                    <tr className="empty-row"><td colSpan={4}>{t.personelBulunamadi}</td></tr>
                  ) : topRisk.map((p) => (
                    <tr key={p.id} className={(p.presence_pct || 100) < 85 ? "mes-row--warn" : ""}>
                      <td className="font-medium">{p.ad}</td>
                      <td className="text-[var(--text-muted)]">{p.masa}</td>
                      <td className="font-semibold">%{p.presence_pct}</td>
                      <td className="text-amber-500">{p.yok_saat}s</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </Panel>
          </section>
        </>
      )}
    </div>
  );
}
