import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Mail,
  Package,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { Panel, StatCard } from "../components/ui";

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
  const trend = (report?.trend || []).map((row) => ({
    ...row,
    gun: formatDay(row.tarih, locale),
  }));
  const kategori = (report?.kategori_dagilim || []).map((s) => ({
    ...s,
    kategori: translateCategory(locale, s.kategori),
  }));
  const urunHat = report?.urun?.hatlar || [];

  const sendDaily = async () => {
    try {
      const res = await api.dailyEmail();
      setEmailMsg(res.mesaj);
      setTimeout(() => setEmailMsg(null), 4000);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <>
      <FilterBar
        showSearch={false}
        date={date}
        onDateChange={setDate}
        dates={dates}
        showGranularity={false}
        extra={
          <button type="button" onClick={sendDaily} className="btn-secondary shrink-0">
            <Mail className="h-4 w-4" />
            {t.gunlukOzet}
          </button>
        }
      />

      {emailMsg && (
        <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
          {emailMsg}
        </p>
      )}

      {loading || !kpi ? (
        <Panel>
          <p className="text-sm text-[var(--text-muted)]">{t.kpiYukleniyor}</p>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title={t.trend30Gun} subtitle={t.trendDbAlt}>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="gun" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[80, 100]} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Line yAxisId="left" type="monotone" dataKey="urun_toplam" name={t.chartUrun} stroke="#38bdf8" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="verimlilik" name={t.verimlilik} stroke="#34d399" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title={t.kategoriDagilimi} subtitle={date}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={kategori}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="kategori" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="adet" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title={t.aktifPersonel} value={kpi.personel_aktif} icon={Users} accent="blue" />
            <StatCard
              title={t.kpiAktifKamera}
              value={`${data.summary.kameralar.aktif}/${data.summary.kameralar.toplam}`}
              icon={BarChart3}
              accent="green"
            />
            <StatCard title={t.hatBazliUretim} value={urunHat.length} subtitle={t.kayitliHat} accent="orange" />
          </div>

          {urunHat.length > 0 && (
            <Panel title={t.hatBazliUretim} subtitle={date} className="mt-6">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {urunHat.map((h) => (
                  <div
                    key={h.hat}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3"
                  >
                    <span className="text-sm text-[var(--text-muted)]">{h.hat}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{numFmt(h.adet)}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </>
      )}
    </>
  );
}
