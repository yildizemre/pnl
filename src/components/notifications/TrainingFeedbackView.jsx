import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { api } from "../../api";
import { useLocale } from "../../context/LocaleContext";
import { translateCategory } from "../../i18n/helpers";
import { EmptyChart } from "../EmptyState";
import { Panel, StatCard } from "../ui";
import { CHART, axisTick, chartTooltipStyle, gridStroke } from "../../lib/chartTheme";

export default function TrainingFeedbackView() {
  const { t, locale } = useLocale();
  const en = locale === "EN";
  const [days, setDays] = useState(7);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .trainingFeedbackReport(days)
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [days]);

  const daily = (report?.daily || []).map((d) => ({
    ...d,
    label: d.tarih?.slice(5) || d.tarih,
  }));

  return (
    <div className="training-feedback space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--text-muted)]">{t.trainingPeriod}</span>
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            type="button"
            className={days === d ? "dash-pill dash-pill--active" : "dash-pill"}
            onClick={() => setDays(d)}
          >
            {d} {en ? "days" : "gün"}
          </button>
        ))}
      </div>

      {loading ? (
        <Panel><p className="text-sm text-[var(--text-muted)]">{t.yukleniyor}</p></Panel>
      ) : !report?.has_data ? (
        <Panel>
          <EmptyChart title={t.trainingEmptyTitle} subtitle={t.trainingEmptySub} />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard title={t.trainingEvet} value={report.evet} icon={ThumbsUp} accent="green" />
            <StatCard title={t.trainingHayir} value={report.hayir} icon={ThumbsDown} accent="red" />
            <StatCard
              title={t.trainingApproval}
              value={report.approval_pct != null ? `%${report.approval_pct}` : "—"}
              subtitle={t.trainingApprovalSub}
              accent="cyan"
            />
          </div>

          <Panel title={t.trainingDaily} subtitle={`${report.start} — ${report.end}`}>
            {daily.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="evet" name={t.trainingEvet} fill={CHART.emerald} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="hayir" name={t.trainingHayir} fill={CHART.red} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart title={t.trainingEmptyTitle} subtitle={t.trainingEmptySub} />
            )}
          </Panel>

          {report.by_kategori?.length > 0 && (
            <Panel title={t.trainingByCategory}>
              <ul className="training-cat-list">
                {report.by_kategori.map((row) => (
                  <li key={row.kategori}>
                    <span>{translateCategory(locale, row.kategori)}</span>
                    <span className="text-emerald-500">{row.evet} ✓</span>
                    <span className="text-red-400">{row.hayir} ✗</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {report.samples?.length > 0 && (
            <Panel title={t.trainingSamples}>
              <ul className="training-sample-list">
                {report.samples.map((s) => (
                  <li key={s.id}>
                    <span className={s.feedback === "evet" ? "text-emerald-500" : "text-red-400"}>
                      {s.feedback === "evet" ? "✓" : "✗"}
                    </span>
                    <div>
                      <p className="font-medium">{s.baslik}</p>
                      <p className="text-xs text-[var(--text-muted)]">{s.kamera} · {s.tarih} {s.zaman}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
