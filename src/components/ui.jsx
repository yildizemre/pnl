import Sparkline from "./Sparkline";
import AnimatedCounter from "./AnimatedCounter";

const ACCENT_MAP = {
  green: "stat-card-accent-green",
  blue: "stat-card-accent-blue",
  red: "stat-card-accent-red",
  cyan: "stat-card-accent-cyan",
  orange: "stat-card-accent-orange",
  purple: "stat-card-accent-purple",
};

const ICON_COLOR = {
  green: "text-emerald-500",
  blue: "text-sky-500",
  red: "text-red-500",
  cyan: "text-cyan-500",
  orange: "text-orange-500",
  purple: "text-violet-500",
};

export function StatusBadge({ children, variant }) {
  const styles = {
    kritik: "bg-red-500/10 text-red-600 border-red-500/25 dark:text-red-400",
    uyari: "bg-orange-500/10 text-orange-600 border-orange-500/25 dark:text-orange-400",
    basari: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400",
    normal: "bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400",
    bilgi: "bg-slate-500/10 text-slate-600 border-slate-500/25 dark:text-slate-400",
    optimum: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400",
    iyi: "bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400",
    dikkat: "bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400",
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${styles[variant] || styles.normal}`}>
      {children}
    </span>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  subtitleClass,
  icon: Icon,
  accent = "blue",
  sparkline,
  compareActive = false,
  counter,
  counterPrefix = "",
  counterSuffix = "",
  counterDecimals = 0,
  locale = "tr-TR",
  bentoClass = "",
}) {
  const displayValue =
    counter != null ? (
      <AnimatedCounter
        value={counter}
        prefix={counterPrefix}
        suffix={counterSuffix}
        decimals={counterDecimals}
        locale={locale}
      />
    ) : (
      value
    );

  return (
    <div
      className={`stat-card ${ACCENT_MAP[accent] || ACCENT_MAP.blue} ${compareActive ? "stat-card-compare" : ""} ${bentoClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">{displayValue}</p>
          {subtitle && (
            <p className={`mt-1.5 text-xs font-medium ${subtitleClass || "text-[var(--text-muted)]"}`}>{subtitle}</p>
          )}
          {sparkline?.length > 0 && (
            <div className="mt-3">
              <Sparkline data={sparkline} accent={accent} />
            </div>
          )}
        </div>
        {Icon && (
          <div className={`stat-card-icon shrink-0 rounded-lg p-2.5 ${ICON_COLOR[accent]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export function Panel({ title, subtitle, badge, children, className = "", flush = false }) {
  return (
    <div className={`panel ${className}`}>
      {(title || badge) && (
        <div className="panel-header">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {badge}
        </div>
      )}
      <div className={flush ? "panel-body-flush" : "panel-body"}>{children}</div>
    </div>
  );
}

export function DataTable({ children, minWidth = "640px" }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function ChartTooltipTraffic({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip chart-tooltip-themed px-3 py-2.5 shadow-lg">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="text-sm font-semibold text-emerald-500">{payload[0].value} kisi</p>
    </div>
  );
}

export function ChartTooltipBar({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tooltip chart-tooltip-themed px-3 py-2.5 shadow-lg">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--text-primary)]">{p.tur || p.hat || p.bolge || p.kategori}</p>
      <p className="text-xs font-medium text-cyan-500">{payload[0].value}</p>
    </div>
  );
}
