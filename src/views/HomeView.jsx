import { useEffect, useMemo, useState } from "react";
import { LayoutDashboard, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocale } from "../context/LocaleContext";
import { api } from "../api";
import { computeRiskScore } from "../data/operationsCenter";
import { buildActionRequiredItems } from "../data/actionFeed";
import CompareToggle from "../components/CompareToggle";
import CameraCapabilityList from "../components/CameraCapabilityList";
import { Panel } from "../components/ui";
import AiAssistant from "../components/experience/AiAssistant";
import ActionRequiredFeed from "../components/experience/ActionRequiredFeed";
import { HomeInsightsPanel } from "../components/operations/VocPanels";
import HomeKpiBoard from "../components/HomeKpiBoard";
import IsgHeroBanner from "../components/isg/IsgHeroBanner";
import EventCategoryPanel from "../components/isg/EventCategoryPanel";
import IsgTrendCharts from "../components/isg/IsgTrendCharts";

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

export default function HomeView({ data, compare, onCompareChange, onNavigate, onNotificationOpen }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const [view, setView] = useState("main");
  const [trend, setTrend] = useState([]);
  const [hats, setHats] = useState([]);
  const [hatA, setHatA] = useState("");
  const [hatB, setHatB] = useState("");
  const [hatCompare, setHatCompare] = useState(null);

  const s = data.summary;
  const cmp = compare === "hat" ? hatCompare : data.compare;
  const compareActive = !!compare && compare !== "hat";
  const risk = useMemo(
    () => computeRiskScore(s, data.today_notifications || data.notifications),
    [s, data.today_notifications, data.notifications]
  );

  useEffect(() => {
    const tarih = data.dates?.[0];
    if (!tarih) return;
    api.reportsKpis(tarih).then((r) => setTrend(r.trend || [])).catch(() => setTrend([]));
  }, [data.dates, user?.id]);

  useEffect(() => {
    const list = (data.product_counts?.hatlar || []).map((h) => h.hat).filter(Boolean);
    if (list.length) {
      setHats(list);
      setHatA((a) => a || list[0]);
      setHatB((b) => b || list[1] || list[0]);
      return;
    }
    api.sayimCounts(data.today || data.dates?.[0], "saat")
      .then((r) => {
        const hs = (r.hatlar || []).map((h) => h.hat).filter(Boolean);
        setHats(hs);
        if (hs[0]) setHatA(hs[0]);
        if (hs[1]) setHatB(hs[1]);
        else if (hs[0]) setHatB(hs[0]);
      })
      .catch(() => {});
  }, [data.product_counts, data.today, data.dates]);

  useEffect(() => {
    if (compare !== "hat" || !hatA || !hatB) {
      setHatCompare(null);
      return;
    }
    api.kpiCompare(
      { source: "sayim", field: "toplam_adet", period: "gun", dimension: "none" },
      { mode: "hat", hat_a: hatA, hat_b: hatB }
    ).then(setHatCompare).catch(() => setHatCompare(null));
  }, [compare, hatA, hatB]);

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
  const notifs = data.notifications || [];
  const todayNotifs = data.today_notifications || notifs.filter((n) => n.tarih === data.dates?.[0]);
  const customKpis = data.custom_kpis || user?.dashboard_layout?.custom_kpis || [];

  const actionItems = useMemo(() => {
    const fromNotifs = buildActionRequiredItems(todayNotifs.length ? todayNotifs : notifs, s, locale);
    // Gerçek bildirim başlıklarını tercih et
    return (fromNotifs || []).slice(0, 6).map((item, i) => {
      const src = (todayNotifs.length ? todayNotifs : notifs).find((n) => String(n.id) === String(item.id))
        || (todayNotifs.length ? todayNotifs : notifs)[i];
      if (!src) return item;
      return {
        ...item,
        message: src.baslik || item.message,
        camera: src.kamera || item.camera,
        time: src.zaman || item.time,
        severity: src.seviye || item.severity,
        raw: src,
      };
    });
  }, [todayNotifs, notifs, s, locale]);

  const openAction = (item) => {
    if (item?.raw && onNotificationOpen) {
      onNotificationOpen(item.raw);
      return;
    }
    onNavigate?.("bildirimler");
  };

  return (
    <div className="dash-home dash-home--overview">
      {/* 1. İSG durum — müşteri ilk bakış */}
      <IsgHeroBanner summary={s} todayNotifications={todayNotifs} />

      <div className="dash-home-bar">
        <CompareToggle
          value={compare}
          onChange={onCompareChange}
          compare={cmp}
          hats={hats}
          hatA={hatA}
          hatB={hatB}
          onHatA={setHatA}
          onHatB={setHatB}
        />
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
          {/* 2. KPI özet */}
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
            customKpis={customKpis}
          />

          {/* 3. Aksiyon + olay kategorileri — asıl iş */}
          <section className="dash-isg-grid dash-isg-grid--priority">
            {actionItems.length > 0 ? (
              <ActionRequiredFeed items={actionItems} onSelect={openAction} />
            ) : (
              <Panel title={t.aksiyonGerektiren} subtitle={t.aksiyonGerektirenAlt}>
                <p className="home-empty-hint">{t.isgHeroNoAccident || t.bildirimBulunamadi}</p>
              </Panel>
            )}
            <EventCategoryPanel notifications={todayNotifs.length ? todayNotifs : notifs} />
          </section>

          {/* 4. İSG trend */}
          <IsgTrendCharts notifications={notifs} />

          {/* 5. Alt bilgi — kameralar / sistem (trafik grafiği yok) */}
          <section className="dash-footer">
            <HomeInsightsPanel data={data} />
            <Panel title={t.kameraOzellikler} subtitle={t.kameraKonum} className="dash-footer-cameras">
              <CameraCapabilityList trackedCameras={data.tracked_cameras} compact />
            </Panel>
          </section>
        </>
      )}

      {view === "ai" && (
        <AiAssistant summary={s} notifications={data.notifications} />
      )}
    </div>
  );
}
