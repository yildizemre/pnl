import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Download,
  FileSpreadsheet,
  Mail,
  Package,
  TrendingUp,
  Users,
} from "lucide-react";
import {
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

  const numFmt = (n) => Number(n).toLocaleString(localeTag(locale));

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
  const urunHat = useMemo(
    () => [...(report?.urun?.hatlar || [])].sort((a, b) => b.adet - a.adet),
    [report?.urun?.hatlar]
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

  const downloadReport = async (format) => {
    setExporting(format);
    try {
      const blob = await api.exportReport(t.raporOzetBaslik, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hypevision-rapor-${date}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    } finally {
      setExporting(null);
    }
  };

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
            <button type="button" onClick={() => downloadReport("pdf")} className="btn-secondary shrink-0" disabled={!!exporting}>
              <Download className="h-4 w-4" />
              {exporting === "pdf" ? "…" : t.raporExportPdf}
            </button>
            <button type="button" onClick={() => downloadReport("xlsx")} className="btn-secondary shrink-0" disabled={!!exporting}>
              <FileSpreadsheet className="h-4 w-4" />
              {exporting === "xlsx" ? "…" : t.raporExportExcel}
            </button>
            <button type="button" onClick={sendDaily} className="btn-secondary shrink-0">
              <Mail className="h-4 w-4" />
              {t.gunlukOzet}
            </button>
          </div>
        }
      />

      {emailMsg && (
        <p className="module-toast">{emailMsg}</p>
      )}

      {loading ? (
        <Panel>
          <p className="text-sm text-[var(--text-muted)]">{t.kpiYukleniyor}</p>
        </Panel>
      ) : !kpi ? (
        <Panel>
          <EmptyChart title={t.raporEmptyTitle} subtitle={t.raporEmptySub} />
        </Panel>
      ) : (
        <>
          <section className="module-kpi-row" aria-label={t.kpiOzet}>
            <StatCard
              title={t.urunSayimi}
              value={numFmt(kpi.urun_toplam)}
              subtitle={report.kurulum || t.seciliGun}
              icon={Package}
              accent="blue"
            />
            <StatCard
              title={t.ortVerimlilikMes}
              value={`%${kpi.verimlilik}`}
              subtitle={t.mesPersonel}
              icon={TrendingUp}
              accent="green"
            />
            <StatCard
              title={t.isgIhlali}
              value={kpi.isg_ihlal}
              subtitle={t.seciliTarih}
              icon={AlertTriangle}
              accent="orange"
            />
            <StatCard
              title={t.bildirim}
              value={kpi.bildirim_sayisi}
              subtitle={`${kpi.log_sayisi} ${t.logKaydi}`}
              icon={Activity}
              accent="purple"
            />
          </section>

          <Panel title={t.raporOzetBaslik} subtitle={t.raporOzetAlt} className="reports-summary-panel">
            <div className="reports-summary-grid">
              <div className="reports-summary-item">
                <Users className="h-4 w-4 text-sky-500" />
                <div>
                  <p className="reports-summary-lbl">{t.aktifPersonel}</p>
                  <p className="reports-summary-val">{kpi.personel_aktif}</p>
                </div>
              </div>
              <div className="reports-summary-item">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="reports-summary-lbl">{t.kpiAktifKamera}</p>
                  <p className="reports-summary-val">{data.summary.kameralar.aktif}/{data.summary.kameralar.toplam}</p>
                </div>
              </div>
              <div className="reports-summary-item">
                <Package className="h-4 w-4 text-violet-500" />
                <div>
                  <p className="reports-summary-lbl">{t.hatBazliUretim}</p>
                  <p className="reports-summary-val">{urunHat.length} {t.hat}</p>
                </div>
              </div>
              <div className="reports-summary-item">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="reports-summary-lbl">{t.isgVeBildirim}</p>
                  <p className="reports-summary-val">{kpi.isg_ihlal} / {kpi.bildirim_sayisi}</p>
                </div>
              </div>
            </div>
          </Panel>

          <section className="module-charts-row">
            <Panel title={t.trend30Gun} subtitle={t.trendDbAlt} className="reports-trend-panel">
              {trend.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="gun" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[80, 100]} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle()} />
                    <Line yAxisId="left" type="monotone" dataKey="urun_toplam" name={t.chartUrun} stroke={CHART.sky} strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="verimlilik" name={t.verimlilik} stroke={CHART.emerald} strokeWidth={2} dot={false} />
                  </LineChart>
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

          {urunHat.length > 0 && (
            <Panel title={t.hatBazliUretim} subtitle={date} flush>
              <DataTable minWidth="480px">
                <thead>
                  <tr>
                    <th>{t.sira}</th>
                    <th>{t.hat}</th>
                    <th className="text-right">{t.adet}</th>
                    <th>{t.pay}</th>
                  </tr>
                </thead>
                <tbody>
                  {urunHat.map((h, i) => {
                    const pay = kpi.urun_toplam ? Math.round((h.adet / kpi.urun_toplam) * 100) : 0;
                    return (
                      <tr key={h.hat}>
                        <td className="font-mono text-xs text-[var(--text-muted)]">#{i + 1}</td>
                        <td className="font-medium">{h.hat}</td>
                        <td className="text-right font-semibold text-sky-500">{numFmt(h.adet)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="progress-track h-2 flex-1 max-w-[120px]">
                              <div className="h-full rounded-full bg-sky-500" style={{ width: `${pay}%` }} />
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
          )}
        </>
      )}
    </div>
  );
}
