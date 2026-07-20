import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Camera, ShieldAlert, TrendingUp, Bell, Users, Activity } from "lucide-react";
import { useLocale } from "../context/LocaleContext";
import { useAuth } from "../hooks/useAuth";
import { StatCard } from "./ui";

const CATALOG = [
  { id: "kameralar", icon: Camera, accent: "cyan", labelKey: "kpiAktifKamera" },
  { id: "isg", icon: ShieldAlert, accent: "red", labelKey: "kpiIsgIhlal" },
  { id: "verim", icon: TrendingUp, accent: "green", labelKey: "kpiOrtVerimlilik" },
  { id: "unread", icon: Bell, accent: "orange", labelKey: "okunmamis" },
  { id: "personel", icon: Users, accent: "blue", labelKey: "aktifPersonel" },
  { id: "risk", icon: Activity, accent: "purple", labelKey: "vocRiskScore" },
];

const DEFAULT_IDS = ["kameralar", "isg", "verim"];

function storageKey(userId) {
  return `hv-home-kpis:${userId || "anon"}`;
}

function loadIds(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_IDS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_IDS;
  } catch {
    return DEFAULT_IDS;
  }
}

function saveIds(userId, ids) {
  localStorage.setItem(storageKey(userId), JSON.stringify(ids));
}

function resolveValue(id, ctx) {
  const { s, risk, unread, presenceAvg, ChangeBadge, compareActive, cmp, riskLabel, t } = ctx;
  const sum = cmp?.summary;

  switch (id) {
    case "kameralar":
      return {
        value: <>{s.kameralar?.aktif ?? 0} <span className="text-lg font-normal text-[var(--text-muted)]">/ {s.kameralar?.toplam ?? 0}</span></>,
        subtitle: s.kameralar?.degisim,
        sparkline: ctx.sparklines?.kameralar,
      };
    case "isg":
      return {
        value: compareActive && sum?.isg_ihlaller?.current != null ? sum.isg_ihlaller.current : (s.isg_ihlaller?.bugun ?? 0),
        subtitle: compareActive && sum?.isg_ihlaller
          ? <ChangeBadge pct={sum.isg_ihlaller.change_pct} invert />
          : `${t.vocRiskScore}: ${risk.score}/100 · ${riskLabel}`,
        sparkline: ctx.sparklines?.isg,
      };
    case "verim":
      return {
        value: compareActive && sum?.verimlilik?.current != null
          ? `%${sum.verimlilik.current}`
          : (s.hat_verimlilik?.ortalama != null ? `%${s.hat_verimlilik.ortalama}` : "—"),
        subtitle: compareActive && sum?.verimlilik
          ? <ChangeBadge pct={sum.verimlilik.change_pct} />
          : s.hat_verimlilik?.alt_metin,
        sparkline: ctx.sparklines?.verim,
        counter: (compareActive && sum?.verimlilik?.current != null)
          ? sum.verimlilik.current
          : (s.hat_verimlilik?.ortalama ?? undefined),
        counterSuffix: "%",
      };
    case "unread":
      return {
        value: compareActive && sum?.bildirim?.current != null ? sum.bildirim.current : unread,
        subtitle: compareActive && sum?.bildirim
          ? <ChangeBadge pct={sum.bildirim.change_pct} invert />
          : t.bekleyenKayit,
      };
    case "personel":
      return {
        value: compareActive && sum?.aktif_personel?.current != null
          ? sum.aktif_personel.current
          : (s.aktif_personel?.sayi ?? "—"),
        subtitle: compareActive && sum?.aktif_personel
          ? <ChangeBadge pct={sum.aktif_personel.change_pct} />
          : (s.aktif_personel?.degisim || (presenceAvg != null ? `%${presenceAvg} ${t.ortVerimli}` : "")),
      };
    case "risk":
      return { value: risk.score, subtitle: riskLabel };
    default:
      return { value: "—" };
  }
}

export default function HomeKpiBoard({
  summary,
  compare,
  compareActive,
  sparklines,
  risk,
  riskLabel,
  unread,
  presenceAvg,
  ChangeBadge,
}) {
  const { t } = useLocale();
  const { user } = useAuth();
  const [ids, setIds] = useState(() => loadIds(user?.id));
  const [adding, setAdding] = useState(false);

  const available = CATALOG.filter((c) => !ids.includes(c.id));

  const update = (next) => {
    setIds(next);
    saveIds(user?.id, next);
  };

  const remove = (id) => update(ids.filter((x) => x !== id));
  const add = (id) => {
    if (!ids.includes(id)) update([...ids, id]);
    setAdding(false);
  };

  const ctx = useMemo(
    () => ({
      s: summary || {},
      cmp: compare,
      compareActive,
      sparklines,
      risk,
      riskLabel,
      unread,
      presenceAvg,
      ChangeBadge,
      t,
    }),
    [summary, compare, compareActive, sparklines, risk, riskLabel, unread, presenceAvg, ChangeBadge, t]
  );

  return (
    <div className="home-kpi-board">
      <div className="home-kpi-toolbar">
        <span className="text-xs font-semibold text-[var(--text-muted)]">{t.homeKpiDuzenle}</span>
        <button type="button" className="btn-ghost text-xs" onClick={() => setAdding((v) => !v)} disabled={!available.length}>
          <Plus className="h-3.5 w-3.5" />
          {t.homeKpiEkle}
        </button>
      </div>
      {adding && available.length > 0 && (
        <div className="home-kpi-add-list">
          {available.map((c) => (
            <button key={c.id} type="button" className="module-pill" onClick={() => add(c.id)}>
              {t[c.labelKey]}
            </button>
          ))}
        </div>
      )}
      <section className="dash-kpi-row" aria-label={t.kpiOzet}>
        {ids.map((id) => {
          const meta = CATALOG.find((c) => c.id === id);
          if (!meta) return null;
          const Icon = meta.icon;
          const resolved = resolveValue(id, ctx);
          return (
            <div key={id} className="home-kpi-card-wrap">
              <button type="button" className="home-kpi-remove" onClick={() => remove(id)} title={t.sil} aria-label={t.sil}>
                <Trash2 className="h-3 w-3" />
              </button>
              <StatCard
                title={t[meta.labelKey]}
                value={resolved.value}
                subtitle={resolved.subtitle}
                icon={Icon}
                accent={meta.accent}
                sparkline={resolved.sparkline}
                counter={resolved.counter}
                counterSuffix={resolved.counterSuffix}
                compareActive={compareActive}
              />
            </div>
          );
        })}
      </section>
    </div>
  );
}
