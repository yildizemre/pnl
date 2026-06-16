import { useEffect, useState } from "react";
import {
  AlertTriangle, Bell, Bot, Camera, CheckCircle2, Sparkles, TrendingUp,
} from "lucide-react";
import { api } from "../../api";
import { useLocale } from "../../context/LocaleContext";
import { translateCategory } from "../../i18n/helpers";
import FilterBar from "../FilterBar";
import { EmptyChart } from "../EmptyState";
import { Panel, StatCard } from "../ui";

const INSIGHT_ICON = {
  summary: TrendingUp,
  risk: AlertTriangle,
  camera: Camera,
  quality: Sparkles,
  learning: CheckCircle2,
  action: Bot,
  info: Bell,
};

const INSIGHT_ACCENT = {
  summary: "blue",
  risk: "red",
  camera: "cyan",
  quality: "green",
  learning: "green",
  action: "orange",
  info: "blue",
};

export default function NotificationInsightsView({ dates = [] }) {
  const { t, locale } = useLocale();
  const en = locale === "EN";
  const [date, setDate] = useState("");
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (dates[0]) setDate(dates[0]);
  }, [dates[0]]);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setError(null);
    api.notificationInsights(date)
      .then(setInsights)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [date]);

  const kpi = insights?.kpi || {};
  const llm = insights?.llm_insights || [];

  return (
    <div className="notif-insights-page">
      <FilterBar
        date={date}
        onDateChange={setDate}
        dates={dates}
        showGranularity={false}
        showSearch={false}
      />

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <p className="text-center text-sm text-[var(--text-muted)] py-12">{t.yukleniyor}</p>
      ) : (
        <>
          <div className="notif-summary-row">
            <StatCard title={t.toplamFiltre} value={kpi.toplam ?? 0} subtitle={t.bugun} icon={Bell} accent="blue" />
            <StatCard title={t.seviyeKritik} value={kpi.kritik ?? 0} subtitle={t.acilMudahale} icon={AlertTriangle} accent="red" />
            <StatCard title={t.seviyeUyari} value={kpi.uyari ?? 0} subtitle={t.bekleyenKayit} icon={Bell} accent="orange" />
            <StatCard
              title={t.dogruluk}
              value={kpi.ortalama_guven != null ? `%${kpi.ortalama_guven}` : "—"}
              subtitle={t.ortalamaGuven}
              icon={Sparkles}
              accent="green"
            />
          </div>

          <div className="notif-insights-grid">
            <Panel title={t.notifKpiKategoriler} subtitle={t.bugun}>
              {kpi.kategoriler?.length ? (
                <ul className="notif-insights-list">
                  {kpi.kategoriler.map((row) => (
                    <li key={row.kategori}>
                      <span>{translateCategory(locale, row.kategori)}</span>
                      <strong>{row.adet}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyChart />
              )}
            </Panel>

            <Panel title={t.notifKpiKameralar} subtitle={t.bugun}>
              {kpi.kameralar?.length ? (
                <ul className="notif-insights-list">
                  {kpi.kameralar.map((row) => (
                    <li key={row.kamera}>
                      <span>{row.kamera}</span>
                      <strong>{row.adet}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyChart />
              )}
            </Panel>

            <Panel title={t.notifKpiFeedback} subtitle={t.evetHayir}>
              <div className="notif-feedback-kpi">
                <div>
                  <span>{t.evet}</span>
                  <strong>{kpi.feedback_evet ?? 0}</strong>
                </div>
                <div>
                  <span>{t.hayir}</span>
                  <strong>{kpi.feedback_hayir ?? 0}</strong>
                </div>
                <div>
                  <span>{t.krokiKamera}</span>
                  <strong>{kpi.kroki_kamera ?? 0}</strong>
                </div>
              </div>
            </Panel>
          </div>

          <Panel
            title={t.notifLlmYorumlar}
            subtitle={t.notifLlmYorumlarAlt}
            badge={<span className="live-pill">{t.ornekLlm}</span>}
          >
            <div className="notif-llm-list">
              {llm.map((item) => {
                const Icon = INSIGHT_ICON[item.type] || Bot;
                const accent = INSIGHT_ACCENT[item.type] || "blue";
                return (
                  <article key={item.id} className={`notif-llm-card notif-llm-card--${accent}`}>
                    <header>
                      <Icon className="h-4 w-4 shrink-0" />
                      <h4>{en ? item.titleEn : item.titleTr}</h4>
                      {item.confidence != null && (
                        <span className="notif-llm-conf">%{Math.round(item.confidence * 100)}</span>
                      )}
                    </header>
                    <p>{en ? item.bodyEn : item.bodyTr}</p>
                    {item.generated_at && (
                      <time className="notif-llm-time">
                        {new Date(item.generated_at).toLocaleString(en ? "en-GB" : "tr-TR")}
                      </time>
                    )}
                  </article>
                );
              })}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
