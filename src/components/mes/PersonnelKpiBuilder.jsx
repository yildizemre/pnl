import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useLocale } from "../../context/LocaleContext";
import { Panel } from "../ui";
import { CHART, axisTick, chartTooltipStyle, gridStroke } from "../../lib/chartTheme";
import { EmptyChart } from "../EmptyState";

const VIEWS = [
  { id: "hat_presence", metric: "presence_pct", group: "hat", agg: "avg" },
  { id: "hat_verimsiz", metric: "yok_saat", group: "hat", agg: "sum" },
  { id: "kamera_presence", metric: "presence_pct", group: "kamera", agg: "avg" },
];

function aggregate(personel, metricId, groupId, agg) {
  const map = {};
  personel.forEach((p) => {
    const key = String(p[groupId] || "—");
    if (!map[key]) map[key] = { label: key, values: [], count: 0 };
    map[key].count += 1;
    map[key].values.push(Number(p[metricId]) || 0);
  });
  return Object.values(map)
    .map((row) => {
      const sum = row.values.reduce((a, b) => a + b, 0);
      const value = agg === "sum"
        ? Math.round(sum * 10) / 10
        : Math.round((sum / (row.values.length || 1)) * 10) / 10;
      return { name: row.label, value };
    })
    .sort((a, b) => b.value - a.value);
}

export default function PersonnelKpiBuilder({ personel = [] }) {
  const { t } = useLocale();
  const [viewId, setViewId] = useState("hat_presence");
  const view = VIEWS.find((v) => v.id === viewId) || VIEWS[0];
  const data = useMemo(
    () => aggregate(personel, view.metric, view.group, view.agg),
    [personel, view]
  );
  const colors = [CHART.emerald, CHART.sky, CHART.cyan, CHART.violet, CHART.amber, "#f43f5e"];

  const titles = {
    hat_presence: t.kpiViewHatPresence,
    hat_verimsiz: t.kpiViewHatVerimsiz,
    kamera_presence: t.kpiViewKameraPresence,
  };

  return (
    <div className="mes-kpi-builder">
      <Panel title={t.kpiBuilderTitle} subtitle={t.kpiBuilderSub}>
        <div className="mes-kpi-presets">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={viewId === v.id ? "module-pill module-pill--active" : "module-pill"}
              onClick={() => setViewId(v.id)}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              {titles[v.id]}
            </button>
          ))}
        </div>
        {data.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={48} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle()} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart title={t.kpiBuilderEmpty} />
        )}
      </Panel>
    </div>
  );
}
