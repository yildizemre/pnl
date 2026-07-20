import { useMemo } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Sparkles, TrendingUp } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import {
  buildHourlyDensity,
  buildMonthlyTrend,
  buildWeeklyDistribution,
  peakHourLabel,
} from "../../data/isgCategories";
import { CHART, axisTick, chartTooltipStyle, gridStroke } from "../../lib/chartTheme";
import { EmptyChart } from "../EmptyState";
import { Panel } from "../ui";

export default function IsgTrendCharts({ notifications = [], insights = [] }) {
  const { t, locale } = useLocale();
  const en = locale === "EN";

  const monthly = useMemo(() => buildMonthlyTrend(notifications, locale), [notifications, locale]);
  const weekly = useMemo(() => buildWeeklyDistribution(notifications, locale), [notifications, locale]);
  const hourly = useMemo(() => buildHourlyDensity(notifications), [notifications]);
  const peak = useMemo(() => peakHourLabel(hourly), [hourly]);
  const hasData = notifications.length > 0;

  return (
    <div className="isg-trends">
      <div className="isg-trends-top">
        <Panel title={t.aylikTrend} subtitle={t.aylikTrendAlt}>
          {hasData ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="isgMonthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.amber} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART.amber} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="ay" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle()} />
                <Area type="monotone" dataKey="adet" name={t.kayit} stroke={CHART.amber} strokeWidth={2} fill="url(#isgMonthFill)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Panel>

        <Panel title={t.haftalikDagilim} subtitle={t.haftalikDagilimAlt}>
          {hasData ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="gun" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle()} />
                <Bar dataKey="adet" name={t.kayit} fill={CHART.amber} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Panel>
      </div>

      <Panel
        title={t.saatlikOlay}
        subtitle={t.saatlikOlayAlt}
        badge={peak ? (
          <span className="isg-peak-pill">
            <TrendingUp className="h-3 w-3" />
            {t.pik}: {peak}
          </span>
        ) : null}
      >
        {hasData ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={hourly}>
              <defs>
                <linearGradient id="isgHourFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.amber} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART.amber} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="saat"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                interval={3}
              />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle()} />
              <Area type="monotone" dataKey="adet" name={t.kayit} stroke={CHART.amber} strokeWidth={2} fill="url(#isgHourFill)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </Panel>

      {insights?.length > 0 && (
        <Panel
          title={t.isgAiAnaliz}
          subtitle={t.isgAiAnalizAlt}
          badge={<span className="live-pill"><Sparkles className="h-3 w-3" /> AI</span>}
        >
          <div className="isg-ai-list">
            {insights.slice(0, 3).map((item) => (
              <article key={item.id || item.titleTr} className="isg-ai-card">
                <h4>{en ? (item.titleEn || item.titleTr) : item.titleTr}</h4>
                <p>{en ? (item.bodyEn || item.bodyTr) : item.bodyTr}</p>
              </article>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
