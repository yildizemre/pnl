import { useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { LayoutDashboard, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocale } from "../context/LocaleContext";
import { translateCategory } from "../i18n/helpers";
import { api } from "../api";
import { CHART, axisTick, chartTooltipStyle, gridStroke } from "../lib/chartTheme";
import { computeRiskScore } from "../data/operationsCenter";
import CompareToggle from "../components/CompareToggle";
import CameraCapabilityList from "../components/CameraCapabilityList";
import { EmptyChart } from "../components/EmptyState";
import { ChartTooltipTraffic, Panel } from "../components/ui";
import AiAssistant from "../components/experience/AiAssistant";
import { HomeInsightsPanel, HomeSystemPanel } from "../components/operations/VocPanels";
import HomeKpiBoard from "../components/HomeKpiBoard";

const VIEWS = [
  { id: "main", icon: LayoutDashboard, labelKey: "homeViewMain" },
  { id: "ai", icon: MessageSquare, labelKey: "modeAssistant" },
];

function ChangeBadge({ pct, invert = false }) {
  if (pct == null) return null;
  const good = invert ? pct <= 0 : pct >= 0;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${good ? "text-emerald-500" : "text-red-500"}`}>
      {up ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export default function HomeView({ data, compare, onCompareChange }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const [view, setView] = useState("main");
  const [trend, setTrend] = useState([]);

  const s = data.summary;
  const cmp = data.compare;
  const compareActive = !!compare;
  const risk = useMemo(
    () => computeRiskScore(s, data.today_notifications || data.notifications),
    [s, data.today_notifications, data.notifications]
  );

  const stats = (data.notification_stats || []).map((x) => ({
    ...x,
    kategori: translateCategory(locale, x.kategori),
  }));

  const traffic = useMemo(() => {
    if (compareActive && cmp?.traffic?.length) return cmp.traffic;
    return data.traffic || [];
  }, [compareActive, cmp, data.traffic]);

  useEffect(() => {
    const tarih = data.dates?.[0];
    if (!tarih) return;
    api.reportsKpis(tarih).then((r) => setTrend(r.trend || [])).catch(() => setTrend([]));
  }, [data.dates, user?.id]);

  const sparklines = useMemo(() => {
    const last7 = trend.slice(-7);
    const pick = (key) => last7.map((row) => row[key]);
    const camBase = s.kameralar?.toplam ?? 0;
    if (!last7.length) {
      return { kameralar: [], personel: [], isg: [], verim: [] };
    }
    return {
      kameralar: last7.map(() => camBase),
      personel: pick("verimlilik").map((v) => Math.round((v || 0) * 0.42)),
      isg: pick("bildirim_sayisi").map((v) => Math.max(0, v || 0)),
      verim: pick("verimlilik"),
    };
  }, [trend, s]);

  const riskLabel = locale === "EN"
    ? (risk.level === "low" ? "Low risk" : risk.level === "mid" ? "Medium risk" : "High risk")
    : (risk.level === "low" ? "Düşük risk" : risk.level === "mid" ? "Orta risk" : "Yüksek risk");

  const presenceAvg = data.productivity?.ortalama_yerinde;

  return (
    <div className="dash-home">
      <div className="dash-home-bar">
        <CompareToggle value={compare} onChange={onCompareChange} compare={cmp} />
        <div className="dash-view-pills" role="tablist">
          {VIEWS.map(({ id, icon: Icon, labelKey }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              className={view === id ? "dash-pill dash-pill--active" : "dash-pill"}
              onClick={() => setView(id)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{t[labelKey]}</span>
            </button>
          ))}
        </div>
      </div>

      {view === "main" && (
        <>
          <HomeKpiBoard
            summary={s}
            compare={cmp}
            compareActive={compareActive}
            sparklines={sparklines}
            risk={risk}
            riskLabel={riskLabel}
            unread={s.bildirim_sayisi ?? 0}
            presenceAvg={presenceAvg}
            ChangeBadge={ChangeBadge}
          />

          <section className="dash-charts">
            <Panel
              title={t.sistemAktivitesi}
              subtitle={compareActive ? t.compareTrafficSub : t.son24Saat}
              badge={<span className="live-pill">{t.canli}</span>}
            >
              {traffic.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={traffic}>
                    <defs>
                      <linearGradient id="dashTrafficGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART.emerald} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={CHART.emerald} stopOpacity={0} />
                      </linearGradient>
                      {compareActive && (
                        <linearGradient id="dashTrafficPrev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART.sky} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={CHART.sky} stopOpacity={0} />
                        </linearGradient>
                      )}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="saat" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltipTraffic />} />
                    {compareActive && (
                      <Area
                        type="monotone"
                        dataKey="kisi_once"
                        name={t.oncekiDonem}
                        stroke={CHART.sky}
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        fill="url(#dashTrafficPrev)"
                      />
                    )}
                    <Area type="monotone" dataKey="kisi" name={t.buDonem} stroke={CHART.emerald} strokeWidth={2} fill="url(#dashTrafficGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </Panel>

            <Panel title={t.bildirimler} subtitle={t.tumKategoriler}>
              {stats.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="kategori" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle()} />
                    <Bar dataKey="adet" radius={[6, 6, 0, 0]}>
                      {stats.map((row) => <Cell key={row.kategori} fill={row.renk} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </Panel>
          </section>

          <section className="dash-footer">
            <HomeInsightsPanel data={data} />
            <Panel title={t.kameraOzellikler} subtitle={t.kameraKonum} className="dash-footer-cameras">
              <CameraCapabilityList trackedCameras={data.tracked_cameras} compact />
            </Panel>
            <HomeSystemPanel data={data} />
          </section>
        </>
      )}

      {view === "ai" && (
        <AiAssistant summary={s} notifications={data.notifications} />
      )}
    </div>
  );
}
