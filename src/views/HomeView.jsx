import {
  Camera, ChevronDown, ChevronUp, Clock, LayoutDashboard, MessageSquare,
  ShieldAlert,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLocale } from "../context/LocaleContext";
import { translateCategory, localeTag } from "../i18n/helpers";
import { api } from "../api";
import { CHART, axisTick, chartTooltipStyle, gridStroke } from "../lib/chartTheme";
import { computeRiskScore } from "../data/operationsCenter";
import CompareToggle from "../components/CompareToggle";
import CameraCapabilityList from "../components/CameraCapabilityList";
import { EmptyChart } from "../components/EmptyState";
import { ChartTooltipTraffic, Panel, StatCard } from "../components/ui";
import FloorPlanCanvas from "../components/experience/FloorPlanCanvas";
import OperationsTimeline from "../components/experience/OperationsTimeline";
import AiAssistant from "../components/experience/AiAssistant";
import { HomeInsightsPanel, HomeSystemPanel } from "../components/operations/VocPanels";

const VIEWS = [
  { id: "main", icon: LayoutDashboard, labelKey: "homeViewMain" },
  { id: "timeline", icon: Clock, labelKey: "modeTimeline" },
  { id: "ai", icon: MessageSquare, labelKey: "modeAssistant" },
];

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

export default function HomeView({ data, compare, onCompareChange, onNotificationOpen, mapFocus, onMapFocusClear }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const [view, setView] = useState("main");
  const [trend, setTrend] = useState([]);

  const s = data.summary;
  const cmp = data.compare;
  const compareActive = !!compare;
  const localeCode = localeTag(locale);
  const risk = useMemo(
    () => computeRiskScore(s, data.today_notifications || data.notifications),
    [s, data.today_notifications, data.notifications]
  );

  const stats = (data.notification_stats || []).map((x) => ({
    ...x,
    kategori: translateCategory(locale, x.kategori),
  }));

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

  return (
    <div className="dash-home">
      <div className="dash-home-bar">
        <CompareToggle value={compare} onChange={onCompareChange} />
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
          <section className="dash-kpi-row" aria-label={t.kpiOzet}>
            <StatCard
              title={t.kpiAktifKamera}
              value={<>{s.kameralar.aktif} <span className="text-lg font-normal text-[var(--text-muted)]">/ {s.kameralar.toplam}</span></>}
              subtitle={compareActive && cmp?.kameralar?.degisim_pct != null ? <ChangeBadge pct={cmp.kameralar.degisim_pct} /> : s.kameralar.degisim}
              icon={Camera}
              accent="cyan"
              sparkline={sparklines.kameralar}
              compareActive={compareActive}
            />
            <StatCard
              title={t.kpiIsgIhlal}
              value={s.isg_ihlaller.bugun}
              subtitle={`${t.vocRiskScore}: ${risk.score}/100 · ${riskLabel}`}
              icon={ShieldAlert}
              accent="red"
              sparkline={sparklines.isg}
              compareActive={compareActive}
            />
            <StatCard
              title={t.kpiOrtVerimlilik}
              value={s.hat_verimlilik.ortalama != null ? `%${s.hat_verimlilik.ortalama}` : "—"}
              subtitle={s.hat_verimlilik.alt_metin}
              icon={LayoutDashboard}
              accent="green"
              sparkline={sparklines.verim}
              counter={s.hat_verimlilik.ortalama ?? undefined}
              counterSuffix="%"
              compareActive={compareActive}
            />
          </section>

          <section className="dash-hero">
            <FloorPlanCanvas
              notifications={data.notifications}
              todayNotifications={data.today_notifications}
              today={data.today}
              summary={s}
              floorPlan={data.floor_plan}
              onNotificationOpen={onNotificationOpen}
              activeSiteId={mapFocus?.siteId}
              highlightPointId={mapFocus?.pointId}
              onHighlightClear={onMapFocusClear}
            />
          </section>

          <section className="dash-charts">
            <Panel title={t.sistemAktivitesi} subtitle={t.son24Saat} badge={<span className="live-pill">{t.canli}</span>}>
              {(data.traffic || []).length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.traffic}>
                    <defs>
                      <linearGradient id="dashTrafficGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART.emerald} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={CHART.emerald} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="saat" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltipTraffic />} />
                    <Area type="monotone" dataKey="kisi" stroke={CHART.emerald} strokeWidth={2} fill="url(#dashTrafficGrad)" />
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
              <CameraCapabilityList
                trackedCameras={data.tracked_cameras}
                floorPlan={data.floor_plan}
                compact
              />
            </Panel>
            <HomeSystemPanel data={data} />
          </section>
        </>
      )}

      {view === "timeline" && (
        <OperationsTimeline notifications={data.notifications} />
      )}

      {view === "ai" && (
        <AiAssistant summary={s} notifications={data.notifications} />
      )}
    </div>
  );
}
