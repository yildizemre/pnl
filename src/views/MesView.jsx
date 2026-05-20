import { useEffect, useMemo, useState } from "react";
import { ChevronUp, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api";
import { useLocale } from "../context/LocaleContext";
import { translateDurum } from "../i18n/helpers";
import FilterBar from "../components/FilterBar";
import { DataTable, Panel, StatCard, StatusBadge } from "../components/ui";

export default function MesView({ data }) {
  const { t, locale } = useLocale();
  const dates = data.dates || [];
  const [date, setDate] = useState(dates[0]);
  const [search, setSearch] = useState("");
  const [p, setP] = useState(data.productivity);

  useEffect(() => {
    if (!date) return;
    api.mesProductivity(date).then(setP).catch(() => setP(data.productivity));
  }, [date, data.productivity]);

  const allPersonel = p.personeller || [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allPersonel;
    return allPersonel.filter((person) =>
      [person.ad, person.id, person.hat, person.vardiya].some((x) =>
        String(x).toLowerCase().includes(q)
      )
    );
  }, [allPersonel, search]);

  const ortalama = filtered.length
    ? (filtered.reduce((a, x) => a + x.verimlilik, 0) / filtered.length).toFixed(1)
    : p.ortalama_verimlilik;

  return (
    <>
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t.personelAra}
        date={date}
        onDateChange={setDate}
        dates={dates}
        showGranularity={false}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title={t.aktifPersonel}
          value={p.aktif_personel}
          subtitle={data.summary.aktif_personel.degisim}
          subtitleClass="text-sky-400"
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
          subtitleClass="text-emerald-400"
          icon={TrendingUp}
          accent="green"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel title={t.personelTablosu} subtitle={t.bireyselPerformans} className="xl:col-span-2" flush>
          <DataTable minWidth="640px">
            <thead>
              <tr>
                <th>ID</th>
                <th>{t.adSoyad}</th>
                <th>{t.hat}</th>
                <th>{t.vardiya}</th>
                <th>{t.verimlilik}</th>
                <th>{t.durum}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr className="empty-row"><td colSpan={6}>{t.personelBulunamadi}</td></tr>
              ) : filtered.map((person) => (
                <tr key={person.id}>
                  <td className="font-mono text-xs text-[var(--text-muted)]">{person.id}</td>
                  <td className="font-medium">{person.ad}</td>
                  <td className="text-[var(--text-muted)]">{person.hat}</td>
                  <td className="text-[var(--text-muted)]">{person.vardiya}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="progress-track h-2 w-20 max-w-full">
                        <div
                          className={`h-full rounded-full ${person.verimlilik >= 95 ? "bg-emerald-500" : person.verimlilik >= 90 ? "bg-sky-500" : "bg-amber-500"}`}
                          style={{ width: `${person.verimlilik}%` }}
                        />
                      </div>
                      <span className="font-semibold text-emerald-500">%{person.verimlilik}</span>
                    </div>
                  </td>
                  <td><StatusBadge variant={person.durum}>{translateDurum(locale, person.durum)}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>

        <Panel title={t.vardiyaOrtalamalari} subtitle={t.genelKarsilastirma}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={p.vardiya_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="vardiya" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[80, 100]} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="verimlilik" fill="#34d399" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
            {t.tesisOrtalamasi}: <span className="text-emerald-500 font-semibold">%{p.ortalama_verimlilik}</span>
          </p>
        </Panel>
      </div>
    </>
  );
}
