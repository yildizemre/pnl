import { GitCompareArrows } from "lucide-react";
import { useLocale } from "../context/LocaleContext";

function Delta({ pct, invert = false }) {
  if (pct == null) return null;
  const good = invert ? pct <= 0 : pct >= 0;
  const sign = pct > 0 ? "+" : "";
  return (
    <span className={`compare-delta ${good ? "compare-delta--up" : "compare-delta--down"}`}>
      {sign}{Number(pct).toFixed(1)}%
    </span>
  );
}

export default function CompareToggle({ value, onChange, compare, hats = [], hatA, hatB, onHatA, onHatB }) {
  const { t, locale } = useLocale();
  const opts = [
    { id: "", label: t.compareOff },
    { id: "bugun_dun", label: t.compareVsYesterday },
    { id: "hafta", label: t.compareVsLastWeek },
    { id: "ay", label: t.compareVsLastMonth },
    { id: "hat", label: t.compareHatVsHat },
  ];

  const summary = compare?.summary;
  const chips = summary
    ? [
        { key: "verimlilik", label: t.kpiOrtVerimlilik, pct: summary.verimlilik?.change_pct },
        { key: "isg", label: t.kpiIsgIhlal, pct: summary.isg_ihlaller?.change_pct, invert: true },
        { key: "personel", label: t.aktifPersonel, pct: summary.aktif_personel?.change_pct },
        { key: "bildirim", label: t.bildirim, pct: summary.bildirim?.change_pct, invert: true },
        { key: "sayim", label: t.toplamSayim || t.gunlukToplamSayim, pct: summary.urun_sayim?.change_pct },
      ].filter((c) => c.pct != null)
    : [];

  const periodHint = value === "bugun_dun"
    ? (locale === "EN" ? "vs yesterday" : "düne göre")
    : value === "hafta"
      ? (locale === "EN" ? "vs last week" : "geçen haftaya göre")
      : value === "ay"
        ? (locale === "EN" ? "vs last month" : "geçen aya göre")
        : value === "hat"
          ? `${hatA || "A"} vs ${hatB || "B"}`
          : "";

  return (
    <div className="compare-bar">
      <div className="compare-bar-head">
        <span className="compare-bar-label">
          <GitCompareArrows className="h-3.5 w-3.5" />
          {t.compareLabel}
        </span>
        <div className="compare-seg" role="group" aria-label={t.compareLabel}>
          {opts.map((o) => (
            <button
              key={o.id || "off"}
              type="button"
              className={value === o.id ? "compare-seg-btn compare-seg-btn--active" : "compare-seg-btn"}
              onClick={() => onChange(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {value === "hat" && hats.length > 0 && (
        <div className="compare-hat-row">
          <select className="input-dark" value={hatA || ""} onChange={(e) => onHatA?.(e.target.value)}>
            {hats.map((h) => <option key={`ha-${h}`} value={h}>{h}</option>)}
          </select>
          <span className="compare-hat-vs">vs</span>
          <select className="input-dark" value={hatB || ""} onChange={(e) => onHatB?.(e.target.value)}>
            {hats.map((h) => <option key={`hb-${h}`} value={h}>{h}</option>)}
          </select>
        </div>
      )}
      {summary && value && value !== "hat" && (
        <div className="compare-chips" aria-live="polite">
          <span className="compare-chips-hint">{periodHint}</span>
          {chips.map((c) => (
            <span key={c.key} className="compare-chip">
              <span className="compare-chip-lbl">{c.label}</span>
              <Delta pct={c.pct} invert={c.invert} />
            </span>
          ))}
        </div>
      )}
      {value === "hat" && compare?.current && (
        <div className="compare-chips" aria-live="polite">
          <span className="compare-chips-hint">{periodHint}</span>
          <span className="compare-chip">
            <span className="compare-chip-lbl">{compare.hat_a || hatA}</span>
            <strong>{Number(compare.current.value).toLocaleString(locale === "EN" ? "en" : "tr")}</strong>
          </span>
          <span className="compare-chip">
            <span className="compare-chip-lbl">{compare.hat_b || hatB}</span>
            <strong>{Number(compare.previous.value).toLocaleString(locale === "EN" ? "en" : "tr")}</strong>
          </span>
          <span className="compare-chip">
            <span className="compare-chip-lbl">Δ</span>
            <Delta pct={compare.change_pct} />
          </span>
        </div>
      )}
    </div>
  );
}
