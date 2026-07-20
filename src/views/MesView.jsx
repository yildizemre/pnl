import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ChevronDown, ChevronUp, Clock, MapPin, Minus, TrendingUp, Users, Video,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../hooks/useAuth";
import { useLocale } from "../context/LocaleContext";
import FilterBar from "../components/FilterBar";
import { EmptyChart } from "../components/EmptyState";
import { DataTable, Panel, StatCard, StatusBadge } from "../components/ui";
import PresenceBar from "../components/mes/PresenceBar";
import PersonnelKpiBuilder from "../components/mes/PersonnelKpiBuilder";

const PERIODS = ["gun", "hafta", "ay", "yil"];
const TABS = ["rapor", "kpi"];
const THRESHOLD = 85;

function initials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatHours(h) {
  if (h == null) return "—";
  const n = Number(h);
  return Number.isInteger(n) ? `${n}s` : `${n.toFixed(1)}s`;
}

function shiftLabel(vardiya, t) {
  if (vardiya === "sabah" || vardiya === "08-17") return t.vardiyaSabah;
  return vardiya || t.vardiyaSabah;
}

function statusOf(person) {
  const pct = person.presence_pct ?? 100;
  return pct >= THRESHOLD ? "verimli" : "verimsiz";
}

function TrendArrow({ delta }) {
  if (delta == null || Math.abs(delta) < 0.3) {
    return <span className="mes-trend mes-trend--flat"><Minus className="h-3 w-3" /></span>;
  }
  if (delta > 0) {
    return (
      <span className="mes-trend mes-trend--up">
        <ChevronUp className="h-3.5 w-3.5" />
        {delta.toFixed(1)}
      </span>
    );
  }
  return (
    <span className="mes-trend mes-trend--down">
      <ChevronDown className="h-3.5 w-3.5" />
      {Math.abs(delta).toFixed(1)}
    </span>
  );
}

export default function MesView({ data }) {
  const { t } = useLocale();
  const { user } = useAuth();
  const dates = data.dates || [];
  const [date, setDate] = useState(dates[0]);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("gun");
  const [tab, setTab] = useState("rapor");
  const [selectedId, setSelectedId] = useState(null);
  const [p, setP] = useState(data.productivity);
  const [prevMap, setPrevMap] = useState({});
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    if (!date) return;
    api.mesProductivity(date, period).then(setP).catch(() => setP(data.productivity));
  }, [date, period, data.productivity]);

  useEffect(() => {
    setPrevMap({});
  }, [date, period]);

  const allPersonel = p?.personeller || [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allPersonel.filter((person) => {
      if (!q) return true;
      return [person.ad, person.id, person.hat, person.masa, person.kamera].some((x) =>
        String(x).toLowerCase().includes(q)
      );
    });
  }, [allPersonel, search]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (a.presence_pct ?? 100) - (b.presence_pct ?? 100)),
    [filtered]
  );

  const worst3 = useMemo(() => sorted.slice(0, 3), [sorted]);

  const hatHeat = useMemo(() => {
    const map = {};
    filtered.forEach((person) => {
      const hat = person.hat || "—";
      if (!map[hat]) map[hat] = { hat, sum: 0, n: 0, bad: 0 };
      map[hat].sum += person.presence_pct ?? 0;
      map[hat].n += 1;
      if ((person.presence_pct ?? 100) < THRESHOLD) map[hat].bad += 1;
    });
    return Object.values(map)
      .map((row) => ({
        ...row,
        avg: Math.round((row.sum / (row.n || 1)) * 10) / 10,
        ok: row.avg >= THRESHOLD,
      }))
      .sort((a, b) => a.avg - b.avg);
  }, [filtered]);

  const selected = useMemo(
    () => sorted.find((x) => x.id === selectedId) || sorted[0] || null,
    [sorted, selectedId]
  );

  const avgPresence = filtered.length
    ? (filtered.reduce((a, x) => a + (x.presence_pct || 0), 0) / filtered.length).toFixed(1)
    : "—";

  const periodMult = 1;

  const totalInefficient = useMemo(() => {
    const daySum = filtered.reduce((a, x) => a + (Number(x.yok_saat) || 0), 0);
    return Math.round(daySum * 10) / 10;
  }, [filtered]);

  const gunluk = p?.gunluk || [];
  const periodLabel = p?.baslangic && p?.bitis && p.baslangic !== p.bitis
    ? `${p.baslangic} → ${p.bitis}`
    : (t[`period_${period}`] || period);

  const downloadMes = async (format) => {
    setExporting(format);
    try {
      const blob = await api.exportReport(t.personelPresenceTablo, format, {
        kind: "mes",
        period,
        tarih: date,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mes_${period}_${date}.${format === "xlsx" ? "xlsx" : "pdf"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    } finally {
      setExporting(null);
    }
  };

  const worst = worst3[0] || null;

  const dikkatCount = useMemo(
    () => filtered.filter((x) => statusOf(x) === "verimsiz").length,
    [filtered]
  );

  const showTrend = false;
  const hasMesModule = user?.moduller?.includes("mes");
  const hasMesData = allPersonel.length > 0;

  if (!hasMesModule) {
    return (
      <div className="module-page mes-page">
        <Panel><EmptyChart title={t.mesModuleOff} subtitle={t.mesEmptySub} /></Panel>
      </div>
    );
  }

  if (!hasMesData) {
    return (
      <div className="module-page mes-page">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t.personelAra}
          date={date}
          onDateChange={setDate}
          dates={dates}
          showGranularity={false}
        />
        <Panel><EmptyChart title={t.mesEmptyTitle} subtitle={t.mesEmptySub} /></Panel>
      </div>
    );
  }

  return (
    <div className="module-page mes-page">
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t.personelAra}
        date={date}
        onDateChange={setDate}
        dates={dates}
        showGranularity={false}
      />

      <section className="module-kpi-row" aria-label={t.kpiOzet}>
        <StatCard
          title={t.aktifPersonel}
          value={filtered.length}
          subtitle={t.vardiyaSabah}
          icon={Users}
          accent="blue"
        />
        <StatCard
          title={t.ortVerimli}
          value={`%${avgPresence}`}
          subtitle={t.ortVerimliAlt}
          icon={TrendingUp}
          accent="green"
        />
        <StatCard
          title={t.toplamVerimsizSure}
          value={formatHours(totalInefficient)}
          subtitle={periodLabel}
          icon={Clock}
          accent="orange"
        />
        <StatCard
          title={t.mesDikkatGereken}
          value={dikkatCount}
          subtitle={
            worst
              ? `${worst.ad} · %${worst.presence_pct}`
              : t.mesDikkatVerimsizAlt
          }
          icon={AlertTriangle}
          accent="orange"
        />
      </section>

      <div className="mes-overview-grid">
        <Panel title={t.mesEnDusuk3} subtitle={t.mesEnDusuk3Alt}>
          <ul className="mes-worst-list">
            {worst3.map((person, i) => (
              <li key={person.id}>
                <button type="button" className="mes-worst-item" onClick={() => setSelectedId(person.id)}>
                  <span className="mes-worst-rank">{i + 1}</span>
                  <span className="mes-avatar">{initials(person.ad)}</span>
                  <div className="mes-worst-meta">
                    <strong>{person.ad}</strong>
                    <span>{person.masa} · {person.hat}</span>
                  </div>
                  <span className={`mes-worst-pct ${(person.presence_pct ?? 100) < THRESHOLD ? "is-bad" : ""}`}>
                    %{person.presence_pct ?? "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={t.mesHatIsi} subtitle={t.mesHatIsiAlt}>
          <div className="mes-heat-grid">
            {hatHeat.map((row) => (
              <div
                key={row.hat}
                className={`mes-heat-cell ${row.ok ? "mes-heat-cell--ok" : "mes-heat-cell--bad"}`}
                title={`${row.hat}: %${row.avg}`}
              >
                <span className="mes-heat-name">{row.hat}</span>
                <strong>%{row.avg}</strong>
                <span className="mes-heat-sub">{row.bad}/{row.n} {t.verimsizLabel}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="module-filter-pills">
        <span className="module-filter-label">{t.donem}</span>
        {PERIODS.map((id) => (
          <button
            key={id}
            type="button"
            className={period === id ? "module-pill module-pill--active" : "module-pill"}
            onClick={() => setPeriod(id)}
          >
            {t[`period_${id}`]}
          </button>
        ))}
        <button type="button" className="btn-secondary mes-export-btn" disabled={!!exporting} onClick={() => downloadMes("xlsx")}>
          {exporting === "xlsx" ? "…" : t.raporExportExcel}
        </button>
        <button type="button" className="btn-secondary mes-export-btn" disabled={!!exporting} onClick={() => downloadMes("pdf")}>
          {exporting === "pdf" ? "…" : t.raporExportPdf}
        </button>
      </div>

      {gunluk.length > 1 && (
        <Panel title={t.mesDonemTablo} subtitle={periodLabel} flush>
          <DataTable minWidth="520px">
            <thead>
              <tr>
                <th>{t.tarih}</th>
                <th>{t.ortVerimli}</th>
                <th>{t.aktifPersonel}</th>
              </tr>
            </thead>
            <tbody>
              {gunluk.map((row) => (
                <tr key={row.tarih}>
                  <td>{row.tarih}</td>
                  <td>%{row.ortalama_yerinde ?? "—"}</td>
                  <td>{row.aktif_personel ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>
      )}

      <div className="mes-tabs" role="tablist">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "dash-pill dash-pill--active" : "dash-pill"}
            onClick={() => setTab(id)}
          >
            {id === "rapor" ? t.presenceRaporTab : t.kpiBuilderTab}
          </button>
        ))}
      </div>

      {tab === "kpi" ? (
        <PersonnelKpiBuilder personel={filtered} />
      ) : (
        <>
          {selected && (
            <Panel
              title={selected.ad}
              subtitle={`${selected.masa} · ${selected.kamera} · ${shiftLabel(selected.vardiya, t)}`}
              className="mes-detail-panel"
            >
              <div className="mes-detail-stats">
                <div>
                  <span className="mes-detail-label">{t.verimliLabel}</span>
                  <strong className="text-emerald-500">{formatHours(selected.yerinde_saat)}</strong>
                </div>
                <div>
                  <span className="mes-detail-label">{t.verimsizLabel}</span>
                  <strong className="text-amber-500">{formatHours(selected.yok_saat)}</strong>
                </div>
                <div>
                  <span className="mes-detail-label">{t.verimliOran}</span>
                  <strong>%{selected.presence_pct ?? "—"}</strong>
                </div>
                <div>
                  <span className="mes-detail-label">{t.durum}</span>
                  <strong>
                    <StatusBadge variant={statusOf(selected) === "verimli" ? "optimum" : "dikkat"}>
                      {statusOf(selected) === "verimli" ? t.verimliLabel : t.verimsizLabel}
                    </StatusBadge>
                  </strong>
                </div>
              </div>
              <PresenceBar
                segments={selected.segments || []}
                startLabel="08:00"
                endLabel="17:00"
                title={`${selected.ad} — ${t.gunlukPresence}`}
              />
            </Panel>
          )}

          <Panel title={t.personelPresenceTablo} subtitle={t.personelPresenceAlt} flush>
            <DataTable minWidth={showTrend ? "980px" : "900px"}>
              <thead>
                <tr>
                  <th>{t.adSoyad}</th>
                  <th>{t.istasyon}</th>
                  <th>{t.kpiGroupKamera}</th>
                  <th>{t.vardiya}</th>
                  <th>{t.gunlukPresence}</th>
                  <th>{t.verimliLabel}</th>
                  <th>{t.verimsizLabel}</th>
                  {showTrend && <th>{t.mesTrend}</th>}
                  <th>{t.durum}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan={showTrend ? 9 : 8}>{t.personelBulunamadi}</td>
                  </tr>
                ) : sorted.map((person) => {
                  const st = statusOf(person);
                  const active = selected?.id === person.id;
                  const prev = prevMap[person.id];
                  const delta = prev != null && person.presence_pct != null
                    ? person.presence_pct - prev
                    : null;
                  return (
                    <tr
                      key={person.id}
                      className={[
                        st === "verimsiz" ? "mes-row--warn" : "",
                        active ? "mes-row--active" : "",
                      ].filter(Boolean).join(" ")}
                      onClick={() => setSelectedId(person.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <div className="mes-person-cell">
                          <span className="mes-avatar">{initials(person.ad)}</span>
                          <div>
                            <span className="font-medium">{person.ad}</span>
                            <p className="mes-person-id">{person.id}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="mes-station">
                          <MapPin className="h-3 w-3 shrink-0 opacity-60" />
                          {person.masa || "—"}
                        </span>
                        <p className="mes-person-id">{person.hat}</p>
                      </td>
                      <td>
                        <span className="mes-station">
                          <Video className="h-3 w-3 shrink-0 opacity-60" />
                          {person.kamera || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="mes-shift-badge">{shiftLabel(person.vardiya, t)}</span>
                      </td>
                      <td style={{ minWidth: "12rem" }}>
                        <PresenceBar segments={person.segments || []} compact />
                        <p className="mes-person-id">%{person.presence_pct ?? "—"}</p>
                      </td>
                      <td className="font-semibold text-emerald-500">{formatHours(person.yerinde_saat)}</td>
                      <td className="font-semibold text-amber-500">{formatHours(person.yok_saat)}</td>
                      {showTrend && (
                        <td><TrendArrow delta={delta} /></td>
                      )}
                      <td>
                        <StatusBadge variant={st === "verimli" ? "optimum" : "dikkat"}>
                          {st === "verimli" ? t.verimliLabel : t.verimsizLabel}
                        </StatusBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </Panel>
        </>
      )}
    </div>
  );
}
