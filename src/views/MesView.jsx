import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronUp, Clock, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api";
import { useAuth } from "../hooks/useAuth";
import { useLocale } from "../context/LocaleContext";
import { translateDurum } from "../i18n/helpers";
import FilterBar from "../components/FilterBar";
import { EmptyChart } from "../components/EmptyState";
import { DataTable, Panel, StatCard, StatusBadge } from "../components/ui";
import { CHART, axisTick, chartTooltipStyle, gridStroke } from "../lib/chartTheme";

const VARDIYALAR = ["tumu", "06-14", "14-22", "22-06"];

function verimColor(v) {
  if (v >= 95) return "bg-emerald-500";
  if (v >= 90) return "bg-sky-500";
  return "bg-amber-500";
}

function initials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function MesView({ data }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const dates = data.dates || [];
  const [date, setDate] = useState(dates[0]);
  const [search, setSearch] = useState("");
  const [vardiyaFilter, setVardiyaFilter] = useState("tumu");
  const [p, setP] = useState(data.productivity);

  useEffect(() => {
    if (!date) return;
    api.mesProductivity(date).then(setP).catch(() => setP(data.productivity));
  }, [date, data.productivity]);

  const allPersonel = p.personeller || [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allPersonel.filter((person) => {
      if (vardiyaFilter !== "tumu" && person.vardiya !== vardiyaFilter) return false;
      if (!q) return true;
      return [person.ad, person.id, person.hat, person.vardiya].some((x) =>
        String(x).toLowerCase().includes(q)
      );
    });
  }, [allPersonel, search, vardiyaFilter]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.verimlilik - a.verimlilik),
    [filtered]
  );

  const ortalama = filtered.length
    ? (filtered.reduce((a, x) => a + x.verimlilik, 0) / filtered.length).toFixed(1)
    : p.ortalama_verimlilik;

  const dikkatCount = useMemo(
    () => filtered.filter((x) => x.verimlilik < 90 || x.durum === "dikkat").length,
    [filtered]
  );

  const byHat = useMemo(() => {
    const map = {};
    filtered.forEach((person) => {
      if (!map[person.hat]) map[person.hat] = { hat: person.hat, total: 0, count: 0 };
      map[person.hat].total += person.verimlilik;
      map[person.hat].count += 1;
    });
    return Object.values(map)
      .map((h) => ({ hat: h.hat, verimlilik: Math.round((h.total / h.count) * 10) / 10 }))
      .sort((a, b) => b.verimlilik - a.verimlilik);
  }, [filtered]);

  const hatColors = [CHART.emerald, CHART.sky, CHART.cyan, CHART.violet, CHART.amber];
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
          value={p.aktif_personel}
          subtitle={data.summary.aktif_personel.degisim}
          icon={Users}
          accent="blue"
        />
        <StatCard
          title={t.genelOrtVerimlilik}
          value={`%${ortalama}`}
          subtitle={
            <span className="inline-flex items-center gap-1">
              <ChevronUp className="h-3.5 w-3.5 text-emerald-400" />
              {filtered.length} {t.personelFiltreli}
            </span>
          }
          icon={TrendingUp}
          accent="green"
        />
        <StatCard
          title={t.mesVardiyaSayisi}
          value={p.vardiya_trend?.length || 3}
          subtitle={t.mesVardiyaSayisiAlt}
          icon={Clock}
          accent="cyan"
        />
        <StatCard
          title={t.mesDikkatGereken}
          value={dikkatCount}
          subtitle={t.mesDikkatAlt}
          icon={AlertTriangle}
          accent="orange"
        />
      </section>

      <div className="module-filter-pills">
        <span className="module-filter-label">{t.mesVardiyaFiltre}</span>
        {VARDIYALAR.map((v) => (
          <button
            key={v}
            type="button"
            className={vardiyaFilter === v ? "module-pill module-pill--active" : "module-pill"}
            onClick={() => setVardiyaFilter(v)}
          >
            {v === "tumu" ? t.tumVardiyalar : v}
          </button>
        ))}
      </div>

      <section className="module-charts-row">
        <Panel title={t.mesHatPerformans} subtitle={t.mesHatPerformansAlt}>
          {byHat.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byHat} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis type="number" domain={[75, 100]} tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="hat" width={110} tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle()} formatter={(v) => [`%${v}`, t.verimlilik]} />
                <Bar dataKey="verimlilik" radius={[0, 6, 6, 0]} barSize={16}>
                  {byHat.map((_, i) => (
                    <Cell key={i} fill={hatColors[i % hatColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Panel>

        <Panel title={t.vardiyaOrtalamalari} subtitle={t.genelKarsilastirma}>
          {(p.vardiya_trend || []).length ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={p.vardiya_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="vardiya" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis domain={[80, 100]} tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle()} formatter={(v) => [`%${v}`, t.verimlilik]} />
                  <Bar dataKey="verimlilik" fill={CHART.emerald} radius={[6, 6, 0, 0]} barSize={44} />
                </BarChart>
              </ResponsiveContainer>
              <p className="module-chart-foot">
                {t.tesisOrtalamasi}: <span className="text-emerald-500 font-semibold">%{p.ortalama_verimlilik}</span>
              </p>
            </>
          ) : (
            <EmptyChart />
          )}
        </Panel>
      </section>

      <Panel title={t.personelTablosu} subtitle={t.bireyselPerformans} flush>
        <DataTable minWidth="760px">
          <thead>
            <tr>
              <th>{t.sira}</th>
              <th>{t.adSoyad}</th>
              <th>{t.hat}</th>
              <th>{t.vardiya}</th>
              <th>{t.verimlilik}</th>
              <th>{t.durum}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr className="empty-row"><td colSpan={6}>{t.personelBulunamadi}</td></tr>
            ) : sorted.map((person, idx) => (
              <tr key={person.id} className={person.verimlilik < 90 ? "mes-row--warn" : ""}>
                <td className="font-mono text-xs text-[var(--text-muted)]">#{idx + 1}</td>
                <td>
                  <div className="mes-person-cell">
                    <span className="mes-avatar">{initials(person.ad)}</span>
                    <div>
                      <span className="font-medium">{person.ad}</span>
                      <p className="mes-person-id">{person.id}</p>
                    </div>
                  </div>
                </td>
                <td className="text-[var(--text-muted)]">{person.hat}</td>
                <td>
                  <span className="mes-shift-badge">{person.vardiya}</span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="progress-track h-2 w-24 max-w-full">
                      <div
                        className={`h-full rounded-full ${verimColor(person.verimlilik)}`}
                        style={{ width: `${person.verimlilik}%` }}
                      />
                    </div>
                    <span className={`font-semibold ${person.verimlilik >= 95 ? "text-emerald-500" : person.verimlilik >= 90 ? "text-sky-500" : "text-amber-500"}`}>
                      %{person.verimlilik}
                    </span>
                  </div>
                </td>
                <td>
                  <StatusBadge variant={person.durum}>{translateDurum(locale, person.durum)}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </div>
  );
}
