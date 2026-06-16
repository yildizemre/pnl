import { Area, AreaChart, ResponsiveContainer } from "recharts";

const STROKE = {
  cyan: "#22d3ee",
  blue: "#38bdf8",
  green: "#34d399",
  red: "#f87171",
  orange: "#fb923c",
  purple: "#a78bfa",
};

export default function Sparkline({ data = [], accent = "blue", height = 40 }) {
  if (!data?.length) return null;
  const color = STROKE[accent] || STROKE.blue;
  const chartData = data.map((v, i) => ({ i, v: Number(v) || 0 }));
  const gradId = `spark-${accent}`;

  return (
    <div className="stat-sparkline" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${gradId})`}
            dot={false}
            isAnimationActive
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
