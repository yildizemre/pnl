import { Calendar, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useLocale } from "../context/LocaleContext";

function shiftDate(iso, delta) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  date,
  onDateChange,
  dates = [],
  granularity,
  onGranularityChange,
  showGranularity = true,
  showSearch = true,
  extra,
}) {
  const { t, locale } = useLocale();
  const placeholder = searchPlaceholder ?? t.ara;
  const hasDates = dates.length > 0;
  const minDate = hasDates ? dates[dates.length - 1] : undefined;
  const maxDate = hasDates ? dates[0] : undefined;
  const canPrev = hasDates && minDate && date > minDate;
  const canNext = hasDates && maxDate && date < maxDate;

  const goPrev = () => {
    if (canPrev) onDateChange(shiftDate(date, -1));
  };
  const goNext = () => {
    if (canNext) onDateChange(shiftDate(date, 1));
  };

  return (
    <div className="filter-bar">
      {showSearch && (
        <div className="filter-bar-search relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="filter-bar-search-icon pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="input-dark input-search w-full"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {hasDates && date && (
          <div className="filter-date-group flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-input)]">
            <button
              type="button"
              disabled={!canPrev}
              onClick={goPrev}
              className="rounded-l-lg p-2 text-[var(--text-muted)] disabled:opacity-30 hover:text-[var(--text-primary)]"
              aria-label={t.oncekiGun}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <label className="filter-date-label flex items-center gap-2 border-x border-[var(--border)] px-2 py-1">
              <Calendar className="h-4 w-4 shrink-0 text-[var(--accent)]" />
              <input
                type="date"
                value={date}
                min={minDate}
                max={maxDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="filter-date-input"
                lang={locale === "EN" ? "en" : "tr"}
              />
            </label>
            <button
              type="button"
              disabled={!canNext}
              onClick={goNext}
              className="rounded-r-lg p-2 text-[var(--text-muted)] disabled:opacity-30 hover:text-[var(--text-primary)]"
              aria-label={t.sonrakiGun}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {showGranularity && onGranularityChange && (
          <div className="flex rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-0.5">
            {[
              { id: "saat", label: t.saatlik },
              { id: "gun", label: t.gunluk },
            ].map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onGranularityChange(g.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${granularity === g.id ? "bg-[var(--accent-bg)] text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {extra}
    </div>
  );
}
