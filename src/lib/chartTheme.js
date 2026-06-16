export const CHART = {
  emerald: "#34d399",
  sky: "#38bdf8",
  cyan: "#22d3ee",
  violet: "#a78bfa",
  amber: "#fbbf24",
  slate: "#94a3b8",
};

export const axisTick = { fill: "var(--text-muted)", fontSize: 10 };
export const gridStroke = "var(--chart-grid)";

export function chartTooltipStyle() {
  return {
    background: "var(--tooltip-bg)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    boxShadow: "0 8px 24px color-mix(in srgb, var(--accent) 12%, transparent)",
    padding: "8px 12px",
  };
}
