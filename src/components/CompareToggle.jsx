import { useLocale } from "../context/LocaleContext";

export default function CompareToggle({ value, onChange }) {
  const { t } = useLocale();
  const opts = [
    { id: "", label: t.karsilastirmaKapali },
    { id: "bugun_dun", label: t.bugunDun },
    { id: "hafta", label: t.buHafta },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => (
        <button
          key={o.id || "none"}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            value === o.id
              ? "border-sky-500/40 bg-sky-500/15 text-sky-500"
              : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
