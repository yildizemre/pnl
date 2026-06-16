import { useEffect, useMemo, useState } from "react";
import { Video } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { FLOOR_ZONES, buildHotspots, zoneCenter } from "../../data/facilityZones";
import { alertsByPoint, buildPointHotspots } from "../../lib/floorPlan";
import { mediaUrl } from "../../api";

const SEV_CLASS = {
  kritik: "hotspot--kritik",
  uyari: "hotspot--uyari",
  bilgi: "hotspot--bilgi",
  normal: "hotspot--bilgi",
  basari: "hotspot--bilgi",
};

const CALLOUT_CLASS = {
  kritik: "zone-callout--kritik",
  uyari: "zone-callout--uyari",
  bilgi: "zone-callout--bilgi",
};

function ZoneCallout({ zone, issue, locale, onClick }) {
  if (!issue) return null;
  const label = locale === "EN" ? zone.labelEn : zone.labelTr;
  return (
    <button
      type="button"
      className={`zone-callout ${CALLOUT_CLASS[issue.severity] || "zone-callout--uyari"}`}
      style={{
        left: `${zone.x}%`,
        top: `${(zone.y / 62) * 100}%`,
        maxWidth: `${zone.w}%`,
      }}
      onClick={() => onClick(issue)}
    >
      <span className="zone-callout-zone">{label}</span>
      <span className="zone-callout-msg">{issue.message}</span>
    </button>
  );
}

function PointCallout({ hotspot, onClick }) {
  return (
    <button
      type="button"
      className={`zone-callout ${CALLOUT_CLASS[hotspot.severity] || "zone-callout--uyari"}`}
      style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%`, maxWidth: "40%" }}
      onClick={() => onClick(hotspot)}
    >
      <span className="zone-callout-zone">{hotspot.camera}</span>
      <span className="zone-callout-msg">{hotspot.title}</span>
    </button>
  );
}

export default function FloorPlanCanvas({
  notifications = [],
  todayNotifications,
  today,
  summary,
  floorPlan,
  cameras = [],
  onNotificationOpen,
  activeSiteId,
  highlightPointId,
  onHighlightClear,
}) {
  const { t, locale } = useLocale();
  const [moduleFilter, setModuleFilter] = useState("tumu");

  const sites = useMemo(() => {
    if (floorPlan?.sites?.length) return floorPlan.sites;
    return [{
      id: floorPlan?.active_site_id || "default",
      name: t.krokiTesis || "Ana Tesis",
      mode: floorPlan?.mode,
      background: floorPlan?.background,
      points: floorPlan?.points || [],
    }];
  }, [floorPlan, t.krokiTesis]);

  const [siteId, setSiteId] = useState(activeSiteId || floorPlan?.active_site_id || sites[0]?.id);

  useEffect(() => {
    if (activeSiteId) setSiteId(activeSiteId);
  }, [activeSiteId]);

  useEffect(() => {
    if (highlightPointId && floorPlan?.all_points) {
      const pt = floorPlan.all_points.find((p) => p.id === highlightPointId);
      if (pt?.site_id) setSiteId(pt.site_id);
    }
  }, [highlightPointId, floorPlan]);

  useEffect(() => {
    if (!highlightPointId) return undefined;
    const timer = setTimeout(() => onHighlightClear?.(), 10000);
    return () => clearTimeout(timer);
  }, [highlightPointId, onHighlightClear]);

  const currentSite = sites.find((s) => s.id === siteId) || sites[0];
  const points = currentSite?.points || [];
  const useImage = currentSite?.mode === "image" && currentSite?.background;
  const dayNotifs = todayNotifications ?? (
    today ? notifications.filter((n) => n.tarih === today) : notifications
  );

  const zoneHotspots = useMemo(() => buildHotspots(notifications, locale), [notifications, locale]);
  const pointHotspots = useMemo(
    () => buildPointHotspots(notifications, points, cameras),
    [notifications, points, cameras]
  );
  const pointAlerts = useMemo(
    () => alertsByPoint(notifications, points, cameras),
    [notifications, points, cameras]
  );
  const todayPointAlerts = useMemo(
    () => alertsByPoint(dayNotifs, points, cameras),
    [dayNotifs, points, cameras]
  );
  const hotspots = useImage && points.length ? pointHotspots : zoneHotspots;

  const byZone = useMemo(() => {
    const map = {};
    for (const h of zoneHotspots) {
      const key = h.zoneId;
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(h);
    }
    return map;
  }, [zoneHotspots]);
  const unread = useMemo(() => dayNotifs.filter((n) => !n.okundu), [dayNotifs]);
  const kritik = useMemo(() => dayNotifs.filter((n) => n.seviye === "kritik").length, [dayNotifs]);
  const uyari = useMemo(() => dayNotifs.filter((n) => n.seviye === "uyari").length, [dayNotifs]);
  const bilgi = useMemo(() => dayNotifs.filter((n) => n.seviye === "bilgi").length, [dayNotifs]);
  const eslesenKamera = useMemo(
    () => points.filter((p) => (todayPointAlerts[p.id] || []).length > 0).length,
    [points, todayPointAlerts]
  );
  const guvenOrt = useMemo(() => {
    const vals = dayNotifs
      .map((n) => Number(n.meta?.guven))
      .filter((v) => Number.isFinite(v));
    if (!vals.length) return null;
    return (vals.reduce((a, b) => a + b, 0) / vals.length) * 100;
  }, [dayNotifs]);
  const sonZaman = useMemo(() => {
    const first = dayNotifs[0];
    if (!first) return "—";
    return first.zaman || first.meta?.zaman || "—";
  }, [dayNotifs]);
  const moduleOptions = useMemo(() => {
    const set = new Set();
    for (const p of points) {
      for (const m of p.modules || []) set.add(m);
    }
    return ["tumu", ...set];
  }, [points]);
  const topCams = useMemo(() => {
    const filteredPoints = points.filter((p) => {
      if (moduleFilter === "tumu") return true;
      return (p.modules || []).includes(moduleFilter);
    });
    return filteredPoints
      .map((p) => ({
        id: p.id,
        name: p.tag || p.label || "—",
        count: (todayPointAlerts[p.id] || []).length,
        firstAlert: (todayPointAlerts[p.id] || [])[0] || null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [points, todayPointAlerts, moduleFilter]);

  const zoneLabel = (z) => (locale === "EN" ? z.labelEn : z.labelTr);

  const openItem = (item) => {
    onNotificationOpen?.(item);
  };

  return (
    <div className="field-ops-shell panel">
      <div className="panel-header">
        <div>
          <h3>{t.sahaHaritasi}</h3>
          <p>{useImage ? t.sahaHaritasiOzel : t.sahaHaritasiAlt}</p>
          {sites.length > 1 && (
            <div className="floor-site-tabs">
              {sites.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={s.id === siteId ? "active" : ""}
                  onClick={() => setSiteId(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="floor-legend">
          <span><i className="legend-dot legend-dot--kritik" />{t.seviyeKritik}</span>
          <span><i className="legend-dot legend-dot--uyari" />{t.seviyeUyari}</span>
          {useImage && points.length > 0 && (
            <span className="text-xs text-[var(--text-muted)]">{points.length} {t.krokiKamera}</span>
          )}
        </div>
      </div>

      <div className="field-ops-layout">
        <div className="field-ops-map-wrap">
          {useImage ? (
            <div className="floor-image-map" role="img" aria-label={t.sahaHaritasi}>
              <img src={mediaUrl(currentSite.background)} alt="" className="floor-image-map-bg" />
              {points.map((p) => {
                const alerts = pointAlerts[p.id] || [];
                const top = alerts[0];
                const sev = top?.seviye || "bilgi";
                const alertClass = alerts.length ? `floor-cam-point--alert floor-cam-point--${sev}` : "";
                const focusClass = highlightPointId === p.id ? "floor-cam-point--focus" : "";
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`floor-cam-point ${alertClass} ${focusClass}`}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    onClick={() => top && openItem(top)}
                    title={p.tag || p.label}
                  >
                    <span className={`floor-cam-pulse ${SEV_CLASS[sev]}`} />
                    <span className="floor-cam-icon"><Video className="h-3.5 w-3.5" /></span>
                    <span className="floor-cam-tag">{p.tag || p.label}</span>
                  </button>
                );
              })}
              <div className="zone-callouts" aria-live="polite">
                {pointHotspots.filter((h) => h.severity === "kritik" || h.severity === "uyari").slice(0, 4).map((h) => (
                  <PointCallout key={h.id} hotspot={h} onClick={openItem} />
                ))}
              </div>
            </div>
          ) : (
            <>
              <svg viewBox="0 0 100 62" className="floor-plan-svg field-ops-map" role="img" aria-label={t.sahaHaritasi}>
                <defs>
                  <pattern id="floorGrid" width="4" height="4" patternUnits="userSpaceOnUse">
                    <path d="M 4 0 L 0 0 0 4" fill="none" stroke="var(--border)" strokeWidth="0.15" opacity="0.4" />
                  </pattern>
                </defs>
                <rect x="1" y="1" width="98" height="60" rx="2" fill="url(#floorGrid)" className="floor-bg" />
                {FLOOR_ZONES.map((z) => {
                  const zoneIssues = byZone[z.id];
                  const hasIssue = zoneIssues?.length;
                  return (
                    <g key={z.id} className={hasIssue ? "floor-zone--alert" : ""}>
                      <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="1.2" className={`floor-zone ${z.fill}`} />
                      <text x={z.x + z.w / 2} y={z.y + z.h / 2} className="floor-zone-label" textAnchor="middle" dominantBaseline="middle">
                        {zoneLabel(z)}
                      </text>
                    </g>
                  );
                })}
                {hotspots.map((h) => {
                  const cx = h.x ?? zoneCenter(h.zoneId).cx;
                  const cy = h.y ?? zoneCenter(h.zoneId).cy;
                  return (
                    <g key={h.id} className="hotspot-group" onClick={() => openItem(h)} style={{ cursor: "pointer" }}>
                      <circle cx={cx} cy={cy} r="4.5" className={`hotspot-pulse ${SEV_CLASS[h.severity] || "hotspot--bilgi"}`} />
                      <circle cx={cx} cy={cy} r="2" className={`hotspot-core ${SEV_CLASS[h.severity] || "hotspot--bilgi"}`} />
                    </g>
                  );
                })}
              </svg>
              <div className="zone-callouts" aria-live="polite">
                {FLOOR_ZONES.map((z) => {
                  const issues = byZone[z.id];
                  if (!issues?.length) return null;
                  return (
                    <ZoneCallout key={z.id} zone={z} issue={issues[0]} locale={locale} onClick={openItem} />
                  );
                })}
              </div>
            </>
          )}
        </div>

        <aside className="field-kpi-panel">
          <h4>{t.bildirimler} KPI <span className="text-xs font-normal text-[var(--text-muted)]">· Bugün</span></h4>
          <div className="field-kpi-grid">
            <div className="field-kpi-card">
              <span>{t.okunmamis}</span>
              <strong>{unread.length}</strong>
            </div>
            <div className="field-kpi-card field-kpi-card--kritik">
              <span>{t.seviyeKritik}</span>
              <strong>{kritik}</strong>
            </div>
            <div className="field-kpi-card field-kpi-card--uyari">
              <span>{t.seviyeUyari}</span>
              <strong>{uyari}</strong>
            </div>
            <div className="field-kpi-card">
              <span>{t.krokiKamera}</span>
              <strong>{eslesenKamera}/{points.length}</strong>
            </div>
            <div className="field-kpi-card">
              <span>Bilgi</span>
              <strong>{bilgi}</strong>
            </div>
            <div className="field-kpi-card">
              <span>{t.dogruluk} ort.</span>
              <strong>{guvenOrt == null ? "—" : `%${guvenOrt.toFixed(1)}`}</strong>
            </div>
          </div>

          <div className="field-kpi-meta">
            <span>Son olay</span>
            <strong>{sonZaman}</strong>
          </div>

          <div className="field-kpi-topcams">
            <p>En çok alarm gelen kameralar</p>
            <div className="field-kpi-modules">
              {moduleOptions.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={moduleFilter === m ? "active" : ""}
                  onClick={() => setModuleFilter(m)}
                >
                  {m === "tumu" ? "Tümü" : m.toUpperCase()}
                </button>
              ))}
            </div>
            {topCams.length === 0 ? (
              <span className="field-kpi-empty">Henüz okunmamış alarm yok</span>
            ) : (
              <ul>
                {topCams.map((cam) => (
                  <li key={cam.id}>
                    <button type="button" onClick={() => cam.firstAlert && openItem(cam.firstAlert)}>
                      <span>{cam.name}</span>
                      <strong>{cam.count}</strong>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
