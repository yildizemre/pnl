import { useLocale } from "../../context/LocaleContext";

const STATUS_LABEL = {
  ok: { tr: "Aktif", en: "Active" },
  warn: { tr: "Uyarı", en: "Warning" },
  fail: { tr: "Hata", en: "Error" },
  inactive: { tr: "Kurulmadı", en: "Not set up" },
};

const OVERALL_CLASS = {
  ok: "healthcheck-overall--ok",
  warn: "healthcheck-overall--warn",
  fail: "healthcheck-overall--bad",
  inactive: "healthcheck-overall--warn",
};

export default function SystemHealthCheck({ data }) {
  const { t, locale } = useLocale();
  const en = locale === "EN";
  const health = data?.system_health;

  if (!health?.checks?.length) {
    return (
      <div className="healthcheck panel">
        <div className="healthcheck-head">
          <h3>{t.vocSysHealth}</h3>
          <span className="healthcheck-overall healthcheck-overall--warn">
            {en ? "Loading…" : "Yükleniyor…"}
          </span>
        </div>
      </div>
    );
  }

  const overall = health.overall || "warn";
  const overallLabel = en ? (health.overallEn || health.overallTr) : (health.overallTr || health.overallEn);
  const overallHint = en ? (health.overallHintEn || health.overallHintTr) : (health.overallHintTr || health.overallHintEn);

  return (
    <div className="healthcheck panel">
      <div className="healthcheck-head">
        <h3>{t.vocSysHealth}</h3>
        <div className="healthcheck-head-meta">
          <span className={`healthcheck-overall ${OVERALL_CLASS[overall] || OVERALL_CLASS.warn}`}>
            {overallLabel || t.vocSysHealthOk}
          </span>
          {overallHint && <p className="healthcheck-hint">{overallHint}</p>}
        </div>
      </div>
      <ul className="healthcheck-list">
        {health.checks.map((item) => (
          <li key={item.id} className={`healthcheck-row healthcheck-row--${item.status}`}>
            <span className={`healthcheck-dot healthcheck-dot--${item.status === "inactive" ? "warn" : item.status}`} aria-hidden />
            <span className="healthcheck-label">{en ? item.labelEn : item.labelTr}</span>
            <span className="healthcheck-detail">
              {en ? item.detailEn : item.detailTr}
              {(en ? item.hintEn : item.hintTr) && (
                <small className="healthcheck-row-hint">{en ? item.hintEn : item.hintTr}</small>
              )}
            </span>
            <span className={`healthcheck-badge healthcheck-badge--${item.status === "inactive" ? "warn" : item.status}`}>
              {STATUS_LABEL[item.status]?.[en ? "en" : "tr"] || item.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
