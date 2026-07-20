import { Plus } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { useAuth } from "../../hooks/useAuth";

function greetingKey(locale) {
  const h = new Date().getHours();
  if (locale === "EN") {
    if (h < 12) return "isgGreetingMorning";
    if (h < 18) return "isgGreetingAfternoon";
    return "isgGreetingEvening";
  }
  if (h < 12) return "isgGreetingMorning";
  if (h < 18) return "isgGreetingAfternoon";
  return "isgGreetingEvening";
}

export default function IsgHeroBanner({ summary, todayNotifications = [] }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const name = user?.ad || user?.email || (locale === "EN" ? "User" : "Kullanıcı");
  const kritikBugun = todayNotifications.filter((n) => n.seviye === "kritik").length;
  const isgBugun = summary?.isg_ihlaller?.bugun ?? kritikBugun;
  const aiOk = summary?.system_health?.ai_aktif !== false;

  const statusLine = isgBugun === 0
    ? t.isgHeroNoAccident
    : (locale === "EN"
      ? `${isgBugun} safety event(s) recorded today — review ISG notifications.`
      : `Bugün ${isgBugun} İSG olayı kaydedildi — bildirimleri kontrol edin.`);

  return (
    <section className="isg-hero" aria-label={t.isgHeroBadge}>
      <div className="isg-hero-main">
        <span className={`isg-hero-badge ${aiOk ? "isg-hero-badge--ok" : "isg-hero-badge--warn"}`}>
          <Plus className="h-3 w-3" />
          {aiOk ? t.isgHeroBadge : t.isgHeroBadgeOff}
        </span>
        <h2 className="isg-hero-title">
          {t[greetingKey(locale)]}, {name}
        </h2>
        <p className="isg-hero-sub">
          {t.isgHeroSystemActive} {statusLine}
        </p>
      </div>
      <aside className="isg-hero-platform">
        <span className="isg-hero-platform-lbl">{t.platformModel}</span>
        <div className="isg-hero-platform-row">
          <strong>HypeVision v2.1.0</strong>
          <span className="isg-hero-dot" aria-hidden />
        </div>
        <span className="isg-hero-platform-sub">AI Vision Suite</span>
      </aside>
    </section>
  );
}
