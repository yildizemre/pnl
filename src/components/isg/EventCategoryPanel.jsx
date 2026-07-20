import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useLocale } from "../../context/LocaleContext";
import { groupNotificationsByCategory } from "../../data/isgCategories";
import { chartTooltipStyle } from "../../lib/chartTheme";
import { EmptyChart } from "../EmptyState";
import { Panel } from "../ui";

export default function EventCategoryPanel({ notifications = [], className = "" }) {
  const { t, locale } = useLocale();

  const rows = useMemo(
    () => groupNotificationsByCategory(notifications, locale),
    [notifications, locale]
  );

  const total = rows.reduce((s, r) => s + r.adet, 0);
  const max = Math.max(...rows.map((r) => r.adet), 1);
  const pieData = rows.length ? rows : [{ id: "empty", adet: 1, color: "#e2e8f0" }];

  return (
    <Panel
      title={t.olayKategorileri}
      subtitle={t.olayKategorileriAlt}
      className={`event-cat-panel ${className}`.trim()}
    >
      {total === 0 ? (
        <EmptyChart title={t.bildirimBulunamadi} />
      ) : (
        <>
          <div className="event-cat-donut">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="adet"
                  nameKey="id"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={rows.length > 1 ? 2 : 0}
                  stroke="none"
                >
                  {pieData.map((row) => (
                    <Cell key={row.id} fill={row.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={chartTooltipStyle()}
                  formatter={(v, _n, p) => {
                    const g = rows.find((r) => r.id === p.payload.id);
                    return [v, g?.label || p.payload.id];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="event-cat-donut-center" aria-hidden>
              <strong>{total}</strong>
              <span>{t.kayit}</span>
            </div>
          </div>

          <ul className="event-cat-list">
            {rows.map((row) => {
              const Icon = row.icon;
              const pct = Math.round((row.adet / max) * 100);
              return (
                <li key={row.id}>
                  <span className="event-cat-dot" style={{ background: row.color }} />
                  <span className="event-cat-icon" style={{ color: row.color }}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="event-cat-name" title={row.label}>{row.label}</span>
                  <span className="event-cat-bar-wrap">
                    <span className="event-cat-bar" style={{ width: `${pct}%`, background: row.color }} />
                  </span>
                  <strong className="event-cat-count">{row.adet}</strong>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}
