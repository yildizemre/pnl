import { useState } from "react";
import { useLocale } from "../../context/LocaleContext";

/** Verimli (yeşil) / verimsiz (amber) — hover’da saat aralığı */
export default function PresenceBar({
  segments = [],
  startLabel = "08:00",
  endLabel = "17:00",
  compact = false,
  title,
}) {
  const { t } = useLocale();
  const [tip, setTip] = useState(null);

  if (!segments.length) {
    return <div className="presence-bar presence-bar--empty" aria-hidden />;
  }

  const label = (status) => (status === "present" ? t.verimliLabel : t.verimsizLabel);

  return (
    <div className={`presence-bar-wrap ${compact ? "presence-bar-wrap--compact" : ""}`}>
      {!compact && (
        <div className="presence-bar-scale">
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      )}
      <div
        className="presence-bar"
        role="img"
        aria-label={title || t.gunlukPresence}
        onMouseLeave={() => setTip(null)}
      >
        {segments.map((seg, i) => (
          <span
            key={`${seg.start}-${i}`}
            className={`presence-seg presence-seg--${seg.status}`}
            style={{ flexGrow: seg.minutes || seg.pct || 1, flexBasis: 0 }}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTip({
                text: `${seg.start} – ${seg.end} · ${label(seg.status)}`,
                x: rect.left + rect.width / 2,
                y: rect.top,
              });
            }}
          />
        ))}
      </div>
      {tip && (
        <div
          className="presence-tooltip presence-tooltip--fixed"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </div>
      )}
      {!compact && (
        <div className="presence-bar-legend">
          <span><i className="presence-dot presence-dot--present" /> {t.verimliLabel}</span>
          <span><i className="presence-dot presence-dot--absent" /> {t.verimsizLabel}</span>
        </div>
      )}
    </div>
  );
}
