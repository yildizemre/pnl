import { localeTag } from "../i18n/helpers";

function cellColor(value) {
  if (value >= 85) return "heatmap-cell--high";
  if (value >= 70) return "heatmap-cell--mid";
  if (value >= 55) return "heatmap-cell--low";
  return "heatmap-cell--min";
}

export default function HeatmapCalendar({ data = [], locale = "TR" }) {
  if (!data.length) return null;

  const tag = localeTag(locale);

  return (
    <div className="heatmap-calendar">
      <div className="heatmap-grid">
        {data.map((d) => (
          <div
            key={d.tarih}
            className={`heatmap-cell ${cellColor(d.value)}`}
            title={`${d.tarih}: %${Math.round(d.value)}`}
          >
            <span className="sr-only">{d.tarih}</span>
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>{new Date(data[0]?.tarih + "T12:00:00").toLocaleDateString(tag, { month: "short", day: "numeric" })}</span>
        <div className="heatmap-legend-bar">
          <span className="heatmap-cell heatmap-cell--min" />
          <span className="heatmap-cell heatmap-cell--low" />
          <span className="heatmap-cell heatmap-cell--mid" />
          <span className="heatmap-cell heatmap-cell--high" />
        </div>
        <span>{new Date(data[data.length - 1]?.tarih + "T12:00:00").toLocaleDateString(tag, { month: "short", day: "numeric" })}</span>
      </div>
    </div>
  );
}
