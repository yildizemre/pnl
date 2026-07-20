import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3, BookOpen, GitCompareArrows, LayoutDashboard, LineChart as LineIcon,
  Sparkles, Save, Trash2, Wand2, Zap,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../api";
import { useAuth } from "../hooks/useAuth";
import { useLocale } from "../context/LocaleContext";
import { localeTag } from "../i18n/helpers";
import { EmptyChart } from "../components/EmptyState";
import { Panel, StatCard } from "../components/ui";
import { CHART, axisTick, chartTooltipStyle, gridStroke } from "../lib/chartTheme";

function uid() {
  return `ckpi-${Math.random().toString(16).slice(2, 10)}`;
}

function fmtValue(value, format, locale) {
  const n = Number(value ?? 0);
  const tag = localeTag(locale);
  if (format === "pct") return `%${n.toLocaleString(tag, { maximumFractionDigits: 1 })}`;
  if (format === "float") return n.toLocaleString(tag, { maximumFractionDigits: 1 });
  return Math.round(n).toLocaleString(tag);
}

const EMPTY_DRAFT = {
  name: "",
  source: "isg",
  field: "bildirim_adet",
  agg: "count",
  dimension: "none",
  period: "gun",
  pin_home: true,
  filter: {},
};

const TEMPLATES = [
  {
    id: "kritik",
    nameTr: "Kritik olay hızı",
    nameEn: "Critical event rate",
    source: "isg",
    field: "kritik_adet",
    dimension: "kamera",
    period: "gun",
    pin_home: true,
  },
  {
    id: "aksiyon",
    nameTr: "Açık aksiyonlar",
    nameEn: "Open actions",
    source: "isg",
    field: "aksiyon_acik",
    dimension: "kategori",
    period: "hafta",
    pin_home: true,
  },
  {
    id: "verim",
    nameTr: "Hat verimli %",
    nameEn: "Line efficient %",
    source: "mes",
    field: "presence_pct",
    dimension: "hat",
    period: "gun",
    pin_home: true,
  },
  {
    id: "cycle",
    nameTr: "Cycle süresi",
    nameEn: "Cycle time",
    source: "sayim",
    field: "ort_cycle_sn",
    dimension: "hat",
    period: "gun",
    pin_home: true,
  },
  {
    id: "sayim",
    nameTr: "Toplam sayım",
    nameEn: "Total count",
    source: "sayim",
    field: "toplam_adet",
    dimension: "hat",
    period: "gun",
    pin_home: false,
  },
];

export default function KpiStudioView({ data, onRefresh }) {
  const { t, locale } = useLocale();
  const { user, setUser } = useAuth();
  const [catalog, setCatalog] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [preview, setPreview] = useState(null);
  const [compareMode, setCompareMode] = useState("bugun_dun");
  const [compare, setCompare] = useState(null);
  const [hatA, setHatA] = useState("");
  const [hatB, setHatB] = useState("");
  const [hats, setHats] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [chartTab, setChartTab] = useState("breakdown");

  const layout = user?.dashboard_layout || {};
  const [customKpis, setCustomKpis] = useState(() => layout.custom_kpis || data?.custom_kpis || []);

  useEffect(() => {
    api.kpiCatalog().then(setCatalog).catch(() => setCatalog(null));
    api.sayimCounts(data?.dates?.[0] || data?.today, "saat")
      .then((r) => {
        const list = (r.hatlar || []).map((h) => h.hat).filter(Boolean);
        setHats(list);
        if (list[0]) setHatA(list[0]);
        if (list[1]) setHatB(list[1]);
        else if (list[0]) setHatB(list[0]);
      })
      .catch(() => {});
  }, [data?.dates, data?.today]);

  useEffect(() => {
    setCustomKpis(layout.custom_kpis || data?.custom_kpis || []);
  }, [layout.custom_kpis, data?.custom_kpis]);

  const source = useMemo(
    () => (catalog?.sources || []).find((s) => s.id === draft.source) || catalog?.sources?.[0],
    [catalog, draft.source]
  );

  const fields = source?.fields || [];
  const fieldMeta = fields.find((f) => f.id === draft.field) || fields[0];
  const allowedDims = source?.dimensions || ["none"];
  const labelOf = (item) => (locale === "EN" ? item?.labelEn : item?.labelTr) || item?.id;
  const setField = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const applyTemplate = (tpl) => {
    setField({
      name: locale === "EN" ? tpl.nameEn : tpl.nameTr,
      source: tpl.source,
      field: tpl.field,
      dimension: tpl.dimension,
      period: tpl.period,
      pin_home: tpl.pin_home,
      agg: "count",
    });
  };

  const runPreview = useCallback(async () => {
    if (!draft.field) return;
    setBusy(true);
    setMsg("");
    try {
      const definition = {
        source: draft.source,
        field: draft.field,
        agg: draft.agg || fieldMeta?.aggs?.[0] || "count",
        dimension: draft.dimension || "none",
        period: draft.period || "gun",
        filter: draft.filter || {},
      };
      const [q, c] = await Promise.all([
        api.kpiQuery(definition),
        compareMode === "hat"
          ? api.kpiCompare(definition, { mode: "hat", hat_a: hatA, hat_b: hatB })
          : api.kpiCompare(definition, { mode: compareMode }),
      ]);
      setPreview(q);
      setCompare(c);
      if ((q.breakdown || []).length) setChartTab("breakdown");
      else if ((q.series || []).length) setChartTab("series");
    } catch (e) {
      setMsg(e.message || t.kpiStudioHata);
    } finally {
      setBusy(false);
    }
  }, [draft, fieldMeta, compareMode, hatA, hatB, t.kpiStudioHata]);

  useEffect(() => {
    if (!catalog) return;
    const tmr = setTimeout(runPreview, 220);
    return () => clearTimeout(tmr);
  }, [catalog, draft.source, draft.field, draft.dimension, draft.period, draft.agg, compareMode, hatA, hatB]); // eslint-disable-line

  const persist = async (nextList) => {
    setSaving(true);
    setMsg("");
    try {
      const homeIds = user?.dashboard_layout?.home_kpi_ids || null;
      const res = await api.kpiSaveCustom(nextList, homeIds);
      setCustomKpis(nextList);
      setUser((u) => ({
        ...u,
        dashboard_layout: res.dashboard_layout || { ...(u.dashboard_layout || {}), custom_kpis: nextList },
      }));
      setMsg(t.kpiStudioKaydedildi);
      onRefresh?.();
    } catch (e) {
      setMsg(e.message || t.kpiStudioHata);
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    const name = (draft.name || "").trim() || `${labelOf(source)} · ${labelOf(fieldMeta)}`;
    const item = {
      id: uid(),
      name,
      source: draft.source,
      field: draft.field,
      agg: draft.agg || fieldMeta?.aggs?.[0] || "count",
      dimension: draft.dimension || "none",
      period: draft.period || "gun",
      filter: draft.filter || {},
      format: fieldMeta?.format || "int",
      pin_home: !!draft.pin_home,
      created_at: new Date().toISOString(),
    };
    await persist([item, ...customKpis]);
    setDraft((d) => ({ ...EMPTY_DRAFT, source: d.source, pin_home: true }));
  };

  const removeKpi = async (id) => persist(customKpis.filter((k) => k.id !== id));
  const togglePin = async (id) => {
    await persist(customKpis.map((k) => (k.id === id ? { ...k, pin_home: !k.pin_home } : k)));
  };

  const chartData = (preview?.breakdown || []).slice(0, 14);
  const seriesData = (preview?.series || []).map((r) => ({
    label: String(r.tarih || "").slice(5) || r.gun || r.saat || "",
    value: r.value,
  }));

  const formula = `${draft.source}.${draft.field}  ·  ${draft.period}  ·  ${draft.dimension === "none" ? "Σ" : draft.dimension}`;
  const heroValue = preview
    ? fmtValue(preview.value, preview.format || fieldMeta?.format, locale)
    : "—";
  const delta = compare?.change_pct;

  return (
    <div className="module-page kpi-studio kpi-studio--pro">
      <header className="kpi-hero">
        <div className="kpi-hero-copy">
          <span className="kpi-hero-badge">
            <Sparkles className="h-3.5 w-3.5" />
            {t.kpiStudioBadge}
          </span>
          <h1 className="kpi-hero-title">{t.kpiStudio}</h1>
          <p className="kpi-hero-sub">{t.kpiStudioAltPro}</p>
        </div>
        <div className="kpi-hero-metric" aria-live="polite">
          <p className="kpi-hero-metric-lbl">{draft.name || labelOf(fieldMeta) || t.kpiStudioOnizle}</p>
          <p className={`kpi-hero-metric-val ${busy ? "is-busy" : ""}`}>{heroValue}</p>
          <p className="kpi-hero-metric-delta">
            {delta == null ? t.kpiKarsilastirmaAlt : (
              <span className={delta >= 0 ? "up" : "down"}>
                {delta > 0 ? "+" : ""}{delta}%
                <small> {compareMode === "hat" ? t.compareHatVsHat : (t[`compare_${compareMode}`] || "")}</small>
              </span>
            )}
          </p>
          <code className="kpi-formula">{formula}</code>
        </div>
      </header>

      <section className="kpi-templates" aria-label={t.kpiHazirSablon}>
        <div className="kpi-templates-head">
          <Zap className="h-3.5 w-3.5" />
          <span>{t.kpiHazirSablon}</span>
        </div>
        <div className="kpi-templates-row">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="kpi-template-card"
              onClick={() => applyTemplate(tpl)}
            >
              <strong>{locale === "EN" ? tpl.nameEn : tpl.nameTr}</strong>
              <span><code>{tpl.source}.{tpl.field}</code></span>
            </button>
          ))}
        </div>
      </section>

      <div className="kpi-studio-grid kpi-studio-grid--wide">
        <Panel title={t.kpiKatalog} subtitle={t.kpiKatalogAlt} className="kpi-catalog-panel">
          <div className="kpi-catalog">
            {(catalog?.sources || []).map((src) => (
              <div key={src.id} className="kpi-catalog-source">
                <button
                  type="button"
                  className={`kpi-catalog-source-btn ${draft.source === src.id ? "is-active" : ""}`}
                  onClick={() => setField({
                    source: src.id,
                    field: src.fields?.[0]?.id,
                    agg: src.fields?.[0]?.aggs?.[0] || "count",
                    dimension: "none",
                  })}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>
                    <strong>{labelOf(src)}</strong>
                    <small>{locale === "EN" ? src.descEn : src.descTr}</small>
                  </span>
                </button>
                {draft.source === src.id && (
                  <ul className="kpi-catalog-fields">
                    {(src.fields || []).map((f) => (
                      <li key={f.id}>
                        <button
                          type="button"
                          className={draft.field === f.id ? "is-active" : ""}
                          onClick={() => setField({ field: f.id, agg: f.aggs?.[0] || "count" })}
                        >
                          <code>{src.id}.{f.id}</code>
                          <span>{labelOf(f)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <div className="kpi-studio-main">
          <Panel title={t.kpiOlustur} subtitle={t.kpiOlusturAlt}>
            <div className="kpi-form kpi-form--pro">
              <label className="kpi-form-wide">
                <span>{t.kpiBuilderName}</span>
                <input
                  className="input-dark"
                  value={draft.name}
                  onChange={(e) => setField({ name: e.target.value })}
                  placeholder={t.kpiBuilderName}
                />
              </label>
              <label>
                <span>{t.donem}</span>
                <select className="input-dark" value={draft.period} onChange={(e) => setField({ period: e.target.value })}>
                  {(catalog?.periods || []).map((p) => (
                    <option key={p.id} value={p.id}>{labelOf(p)}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t.kpiKirilim}</span>
                <select className="input-dark" value={draft.dimension} onChange={(e) => setField({ dimension: e.target.value })}>
                  {(catalog?.dimensions || []).filter((d) => allowedDims.includes(d.id)).map((d) => (
                    <option key={d.id} value={d.id}>{labelOf(d)}</option>
                  ))}
                </select>
              </label>
              {fieldMeta?.aggs?.length > 1 && (
                <label>
                  <span>{t.kpiAgg}</span>
                  <select className="input-dark" value={draft.agg} onChange={(e) => setField({ agg: e.target.value })}>
                    {fieldMeta.aggs.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </label>
              )}
              <label className="kpi-form-check">
                <input type="checkbox" checked={!!draft.pin_home} onChange={(e) => setField({ pin_home: e.target.checked })} />
                <span>{t.kpiPinHome}</span>
              </label>
            </div>
            <div className="kpi-form-actions">
              <button type="button" className="btn-secondary" onClick={runPreview} disabled={busy}>
                <Wand2 className="h-3.5 w-3.5" />
                {busy ? "…" : t.kpiStudioOnizle}
              </button>
              <button type="button" className="btn-primary" onClick={saveDraft} disabled={saving}>
                <Save className="h-3.5 w-3.5" />
                {saving ? "…" : t.kpiKaydet}
              </button>
              {msg && <span className="kpi-form-msg">{msg}</span>}
            </div>
          </Panel>

          <section className="kpi-preview-row">
            <StatCard
              title={t.kpiStudioOnizle}
              value={heroValue}
              subtitle={`${draft.source}.${draft.field}`}
              icon={BarChart3}
              accent="cyan"
            />
            <StatCard
              title={t.compareLabel}
              value={compare ? `${compare.change_pct > 0 ? "+" : ""}${compare.change_pct}%` : "—"}
              subtitle={
                compare
                  ? `${fmtValue(compare.current?.value, preview?.format, locale)} → ${fmtValue(compare.previous?.value, preview?.format, locale)}`
                  : t.kpiKarsilastirmaAlt
              }
              icon={GitCompareArrows}
              accent="purple"
            />
            <StatCard
              title={t.kpiKayitli}
              value={String(customKpis.length)}
              subtitle={t.kpiPinHome}
              icon={LayoutDashboard}
              accent="green"
            />
          </section>

          <Panel title={t.kpiKarsilastirma} subtitle={t.kpiKarsilastirmaAlt}>
            <div className="kpi-compare-controls">
              <div className="flex rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-0.5 flex-wrap">
                {["bugun_dun", "hafta", "ay", "hat"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${compareMode === m ? "bg-[var(--accent-bg)] text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
                    onClick={() => setCompareMode(m)}
                  >
                    {m === "hat" ? t.compareHatVsHat : (t[`compare_${m}`] || m)}
                  </button>
                ))}
              </div>
              <div className="flex rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-0.5">
                <button
                  type="button"
                  className={`rounded-md px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1 ${chartTab === "breakdown" ? "bg-[var(--accent-bg)] text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
                  onClick={() => setChartTab("breakdown")}
                >
                  <BarChart3 className="h-3 w-3" /> {t.kpiKirilim}
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1 ${chartTab === "series" ? "bg-[var(--accent-bg)] text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
                  onClick={() => setChartTab("series")}
                >
                  <LineIcon className="h-3 w-3" /> {t.kpiTrend}
                </button>
              </div>
              {compareMode === "hat" && (
                <div className="kpi-hat-pick">
                  <select className="input-dark" value={hatA} onChange={(e) => setHatA(e.target.value)}>
                    {hats.map((h) => <option key={`a-${h}`} value={h}>{h}</option>)}
                  </select>
                  <span>vs</span>
                  <select className="input-dark" value={hatB} onChange={(e) => setHatB(e.target.value)}>
                    {hats.map((h) => <option key={`b-${h}`} value={h}>{h}</option>)}
                  </select>
                </div>
              )}
            </div>

            {chartTab === "breakdown" && chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle()} />
                  <Bar dataKey="value" fill={CHART.sky} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {chartTab === "series" && seriesData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={seriesData}>
                  <defs>
                    <linearGradient id="kpiSeriesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.violet} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART.violet} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle()} />
                  <Area type="monotone" dataKey="value" stroke={CHART.violet} strokeWidth={2.5} fill="url(#kpiSeriesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
            {((chartTab === "breakdown" && !chartData.length) || (chartTab === "series" && !seriesData.length)) && (
              <EmptyChart title={t.kpiKirilim} subtitle={t.kpiKirilimBos} />
            )}
          </Panel>
        </div>
      </div>

      <Panel title={t.kpiKayitli} subtitle={t.kpiKayitliAlt} flush>
        {customKpis.length === 0 ? (
          <div className="p-6">
            <EmptyChart title={t.kpiKayitliBos} subtitle={t.kpiKayitliBosAlt} />
          </div>
        ) : (
          <div className="kpi-saved-grid">
            {customKpis.map((k) => (
              <div key={k.id} className="kpi-saved-card">
                <div>
                  <strong>{k.name}</strong>
                  <p>
                    <code>{k.source}.{k.field}</code>
                    {" · "}
                    {k.period}
                    {k.dimension && k.dimension !== "none" ? ` · ${k.dimension}` : ""}
                  </p>
                </div>
                <div className="kpi-saved-actions">
                  <button
                    type="button"
                    className={`module-pill ${k.pin_home ? "module-pill--active" : ""}`}
                    onClick={() => togglePin(k.id)}
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    {t.anaSayfa}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => removeKpi(k.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
