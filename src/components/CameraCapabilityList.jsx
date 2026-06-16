import { Video } from "lucide-react";
import { useLocale } from "../context/LocaleContext";
import { FLOOR_MODULES } from "../lib/floorPlan";
import { getRulesForModules, ruleLabel, TRACKING_RULES } from "../data/cameraRules";

function modLabel(mod, locale) {
  const row = FLOOR_MODULES.find((x) => x.id === mod);
  return row ? (locale === "EN" ? row.labelEn : row.labelTr) : mod;
}

export default function CameraCapabilityList({ trackedCameras = [], floorPlan, compact = false }) {
  const { t, locale } = useLocale();
  const points = floorPlan?.points || [];
  const items = trackedCameras?.length
    ? trackedCameras
    : points.map((p, i) => ({
        id: p.id || `pt-${i}`,
        ad: p.tag || p.label || `${t.kameraAlan} ${i + 1}`,
        modules: p.modules || ["genel"],
        rules: getRulesForModules(p.modules || ["genel"]),
        konum: t.krokiKonum || "Kroki",
      }));

  if (!items.length) {
    return (
      <p className="text-center text-sm text-[var(--text-muted)] py-6">{t.henuzKameraYok}</p>
    );
  }

  const visible = items.slice(0, compact ? 12 : 20);

  return (
    <div className={`camera-cap-list ${compact ? "camera-cap-list--compact" : ""}`}>
      <div className="camera-cap-head" aria-hidden>
        <span>{t.kamera}</span>
        <span>{t.kameraOzellikler}</span>
        <span>{t.kameraKonum}</span>
      </div>
      {visible.map((cam, i) => {
        const rules = (cam.rules || []).map((rule) => {
          if (typeof rule === "string") return TRACKING_RULES[rule];
          if (rule?.id && !rule.icon) return TRACKING_RULES[rule.id];
          return rule;
        }).filter(Boolean);
        return (
          <div key={cam.id || i} className="camera-cap-row">
            <div className="camera-cap-id">
              <span className="camera-cap-live" title={t.canli}>
                <span className="camera-live-dot" />
              </span>
              <Video className="h-3.5 w-3.5 shrink-0 text-cyan-500/80" />
              <span className="camera-cap-name">{cam.ad}</span>
              <span className="camera-cap-mod">{(cam.modules || ["genel"]).map((m) => modLabel(m, locale)).join(", ")}</span>
            </div>
            <div className="camera-cap-rules" role="list" aria-label={t.kameraOzellikler}>
              {rules.length ? rules.map((rule) => {
                const Icon = rule.icon;
                const label = rule.labelTr
                  ? (locale === "EN" ? rule.labelEn : rule.labelTr)
                  : ruleLabel(rule, locale);
                return (
                  <span
                    key={rule.id}
                    role="listitem"
                    className="camera-rule-chip"
                    title={label}
                  >
                    {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
                    <span className="sr-only">{label}</span>
                  </span>
                );
              }) : (
                <span className="text-xs text-[var(--text-muted)]">—</span>
              )}
            </div>
            <div className="camera-cap-zone">{cam.konum || "—"}</div>
          </div>
        );
      })}
    </div>
  );
}
