export default function RadialGauge({ value = 0, label, size = 120 }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="gauge-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="gauge-svg">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="8" opacity="0.5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="gauge-arc"
        />
      </svg>
      <div className="gauge-center">
        <span className="gauge-value">%{Math.round(pct)}</span>
        {label && <span className="gauge-label">{label}</span>}
      </div>
    </div>
  );
}
