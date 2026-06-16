import { useMemo } from "react";
import {
  Activity, AlertTriangle, Bell, Camera, Heart, Shield, Zap,
} from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import {
  buildAiInsights,
  buildDensityHeatmap,
  buildLiveEvents,
  buildRuleMatrix,
  buildSystemNodes,
  computeRiskScore,
} from "../../data/operationsCenter";
import SystemHealthCheck from "./SystemHealthCheck";

const RISK_LABEL = {
  low: { tr: "Düşük Risk", en: "Low Risk" },
  mid: { tr: "Orta Risk", en: "Medium Risk" },
  high: { tr: "Yüksek Risk", en: "High Risk" },
};

const SEV_BADGE = {
  kritik: "voc-sev--kritik",
  uyari: "voc-sev--uyari",
  bilgi: "voc-sev--bilgi",
  basari: "voc-sev--basari",
};

const MATRIX_DOT = {
  ok: "voc-dot--ok",
  warn: "voc-dot--warn",
  fail: "voc-dot--fail",
  inactive: "voc-dot--inactive",
};

function MiniSparkline({ values = [], color = "#f59e0b" }) {
  const pts = values.length ? values : [40, 55, 48, 62, 58, 72];
  const max = Math.max(...pts, 1);
  const min = Math.min(...pts, 0);
  const range = max - min || 1;
  const w = 64;
  const h = 24;
  const d = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1 || 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="voc-spark" viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function VocKpiCard({ icon: Icon, label, value, sub, accent, spark, sparkColor }) {
  return (
    <div className="voc-kpi">
      <div className="voc-kpi-top">
        <span className="voc-kpi-icon" style={{ color: accent }}>
          <Icon className="h-4 w-4" />
        </span>
        {spark && <MiniSparkline values={spark} color={sparkColor} />}
      </div>
      <p className="voc-kpi-label">{label}</p>
      <p className="voc-kpi-value">{value}</p>
      {sub && <p className="voc-kpi-sub">{sub}</p>}
    </div>
  );
}

export function VocKpiStrip({ data }) {
  const { t, locale } = useLocale();
  const en = locale === "EN";
  const s = data?.summary || {};
  const notifications = data?.notifications || [];
  const cameras = data?.cameras || s?.kameralar;

  const risk = useMemo(() => computeRiskScore(s, notifications), [s, notifications]);
  const riskMeta = RISK_LABEL[risk.level];
  const kritikCount = notifications.filter((n) => n.seviye === "kritik" && !n.okundu).length || 3;
  const aktif = cameras?.aktif ?? s.kameralar?.aktif ?? 14;
  const toplam = cameras?.toplam ?? s.kameralar?.toplam ?? 16;
  const aiHealth = Math.round(s.hat_verimlilik?.ortalama ?? 94);
  const riskSpark = [58, 62, 65, 68, 70, risk.score];

  return (
    <div className="voc-kpi-row">
      <VocKpiCard icon={Shield} label={t.vocRiskScore} value={`${risk.score}/100`} sub={en ? riskMeta.en : riskMeta.tr} accent="#f59e0b" spark={riskSpark} sparkColor="#f59e0b" />
      <VocKpiCard icon={Heart} label={t.vocAiHealth} value={`${aiHealth}%`} sub="Optimum" accent="#22c55e" />
      <VocKpiCard icon={Camera} label={t.vocActiveCam} value={`${aktif}/${toplam}`} sub={en ? "Online" : "Çevrimiçi"} accent="#3b82f6" />
      <VocKpiCard icon={AlertTriangle} label={t.vocCriticalEvent} value={String(kritikCount)} sub={en ? "Intervention required" : "Acil müdahale gerekli"} accent="#ef4444" />
      <VocKpiCard icon={Bell} label={t.vocNotifChannel} value={en ? "Active" : "Aktif"} sub={en ? "All channels OK" : "Tüm kanallar açık"} accent="#8b5cf6" />
    </div>
  );
}

export function VocEventFeed({ data, onNavigate, compact = false }) {
  const { t, locale } = useLocale();
  const en = locale === "EN";
  const events = useMemo(
    () => buildLiveEvents(data?.notifications, data?.logs, locale),
    [data?.notifications, data?.logs, locale]
  );

  return (
    <div className={`voc-feed panel ${compact ? "voc-feed--compact" : ""}`}>
      <div className="voc-feed-head">
        <h3>{en ? "Live Event Flow" : "Canlı Olay Akışı"}</h3>
        <button type="button" className="voc-link" onClick={() => onNavigate?.("bildirimler")}>
          {en ? "View all" : "Tümünü gör"}
        </button>
      </div>
      <ul className="voc-feed-list">
        {events.slice(0, compact ? 5 : 8).map((ev) => (
          <li key={ev.id} className="voc-feed-item">
            <span className="voc-feed-time">{ev.time}</span>
            <span className={`voc-feed-sev ${SEV_BADGE[ev.severity] || SEV_BADGE.bilgi}`}>
              {ev.severity === "kritik" ? <AlertTriangle className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
            </span>
            <div className="voc-feed-body">
              <p>{ev.text}</p>
              {ev.camera && <span className="voc-feed-cam">{ev.camera}</span>}
            </div>
            <span className={`voc-feed-tag ${SEV_BADGE[ev.severity] || SEV_BADGE.bilgi}`}>
              {ev.severity === "kritik" ? (en ? "Critical" : "Kritik")
                : ev.severity === "uyari" ? (en ? "Warning" : "Uyarı")
                : ev.severity === "basari" ? (en ? "OK" : "Başarılı")
                : (en ? "Info" : "Bilgi")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VocRuleMatrix({ matrix, locale }) {
  const en = locale === "EN";
  const zoneLabels = matrix[0]?.zones?.map((z) => z.zoneLabel) || [];
  return (
    <div className="voc-widget panel">
      <h3>{en ? "Rule Matrix" : "Kural Matrisi"}</h3>
      <div className="voc-matrix-wrap">
        <table className="voc-matrix">
          <thead>
            <tr>
              <th>{en ? "Rule" : "Kural"}</th>
              {zoneLabels.map((lbl) => <th key={lbl}>{lbl?.split(" ")[0]}</th>)}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.id}>
                <td>{row.label}</td>
                {row.zones.map((z) => (
                  <td key={z.zoneId}><span className={`voc-dot ${MATRIX_DOT[z.state] || MATRIX_DOT.ok}`} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VocInsights({ items, title }) {
  return (
    <div className="voc-widget panel">
      <h3>{title}</h3>
      <ul className="voc-insights">
        {items.map((txt, i) => (
          <li key={i}>
            <Activity className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
            <span>{txt}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VocHeatmap({ data, locale }) {
  const en = locale === "EN";
  const heatmap = useMemo(() => buildDensityHeatmap(data?.traffic), [data?.traffic]);
  return (
    <div className="voc-widget panel">
      <h3>{en ? "Density Heatmap" : "Yoğunluk Isı Haritası"}</h3>
      <p className="voc-widget-sub">{en ? "Production line · 24h" : "Üretim hattı · 24 saat"}</p>
      <div className="voc-heatmap">
        {heatmap.map((row) => (
          <div key={row.hour} className="voc-heat-col">
            <div className="voc-heat-bar" style={{ height: `${Math.max(8, row.pct)}%` }} />
            <span>{row.hour}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VocSystemHealth({ data, locale, compact = false }) {
  const en = locale === "EN";
  const s = data?.summary || {};
  const cameras = data?.cameras || s?.kameralar;
  const nodes = useMemo(() => buildSystemNodes(data?.system?.ai_aktif !== false, locale), [data?.system, locale]);
  const aktif = cameras?.aktif ?? 14;
  const toplam = cameras?.toplam ?? 16;
  const pct = Math.round((aktif / Math.max(toplam, 1)) * 100);
  const offline = 100 - pct;

  return (
    <div className={`voc-widget panel ${compact ? "voc-widget--compact" : ""}`}>
      <h3>{en ? "System Health" : "Sistem Sağlığı"}</h3>
      {!compact && (
        <div className="voc-sys-flow">
          {nodes.map((n, i) => (
            <div key={n.id} className="voc-sys-node-wrap">
              {i > 0 && <span className="voc-sys-line" />}
              <div className={`voc-sys-node voc-sys-node--${n.status}`}>
                <span className="voc-dot voc-dot--ok" />
                {n.label}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="voc-sys-grid">
        <div className="voc-donut-wrap">
          <svg viewBox="0 0 36 36" className="voc-donut">
            <path className="voc-donut-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path className="voc-donut-fill" strokeDasharray={`${pct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <div className="voc-donut-center">
            <strong>{pct}%</strong>
            <span>{en ? "Online" : "Çevrimiçi"}</span>
          </div>
        </div>
        <div className="voc-bandwidth">
          <p className="voc-band-label">{en ? "Bandwidth" : "Bant Genişliği"}</p>
          <p className="voc-band-val">128 <small>/ 200 Mbps</small></p>
          <div className="voc-band-bar"><span style={{ width: "64%" }} /></div>
          <p className="voc-band-off">{offline}% {en ? "offline cameras" : "çevrimdışı kamera"}</p>
        </div>
      </div>
    </div>
  );
}

export function VocAnalyticsRow({ data }) {
  const { t, locale } = useLocale();
  const s = data?.summary || {};
  const matrix = useMemo(() => buildRuleMatrix(locale), [locale]);
  const insights = useMemo(() => buildAiInsights(s, locale), [s, locale]);

  return (
    <div className="voc-bottom-row">
      <VocRuleMatrix matrix={matrix} locale={locale} />
      <VocInsights items={insights} title={t.vocAiInsights} />
      <VocHeatmap data={data} locale={locale} />
      <VocSystemHealth data={data} locale={locale} />
    </div>
  );
}

export function HomeInsightsPanel({ data }) {
  const { t, locale } = useLocale();
  const insights = useMemo(() => buildAiInsights(data?.summary, locale), [data?.summary, locale]);
  return <VocInsights items={insights.slice(0, 4)} title={t.vocAiInsights} />;
}

export function HomeSystemPanel({ data }) {
  return <SystemHealthCheck data={data} />;
}
