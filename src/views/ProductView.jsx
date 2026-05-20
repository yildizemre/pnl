import { useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../api";
import { useLocale } from "../context/LocaleContext";
import { localeTag } from "../i18n/helpers";
import FilterBar from "../components/FilterBar";
import { DataTable, Panel, StatCard } from "../components/ui";

export default function ProductView({ data: initial }) {
  const { t, locale } = useLocale();
  const dates = initial.dates || initial.product_counts?.dates || [];
  const [date, setDate] = useState(dates[0]);
  const [search, setSearch] = useState("");
  const [granularity, setGranularity] = useState("saat");
  const [pc, setPc] = useState(initial.product_counts);
  const [loading, setLoading] = useState(false);

  const numFmt = (n) => Number(n).toLocaleString(localeTag(locale));

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    api.productCounts(date)
      .then(setPc)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  const hatlar = useMemo(() => {
    const q = search.toLowerCase();
    return (pc?.hatlar || []).filter((h) => !q || h.hat.toLowerCase().includes(q));
  }, [pc, search]);

  const chartData = granularity === "saat" ? pc?.saatlik || [] : pc?.gunluk_trend || [];

  return (
    <>
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t.hatAra}
        date={date}
        onDateChange={setDate}
        dates={dates}
        granularity={granularity}
        onGranularityChange={setGranularity}
      />

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              title={t.gunlukToplamSayim}
              value={numFmt(pc?.toplam || 0)}
              subtitle={initial.summary?.urun_sayim_bugun?.degisim}
              subtitleClass="text-emerald-400"
              icon={Package}
              accent="purple"
            />
            <StatCard
              title={t.aktifHatSayisi}
              value={hatlar.length}
              subtitle={t.hatBazliSayim}
              accent="cyan"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title={granularity === "saat" ? t.saatlikUretim : t.gunlukTrend} subtitle={date}>
              <ResponsiveContainer width="100%" height={260}>
                {granularity === "saat" ? (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="prodG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="saat" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="adet" stroke="#8b5cf6" strokeWidth={2} fill="url(#prodG)" />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="gun" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="adet" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </Panel>

            <Panel title={t.urunTuruDagilimi} subtitle={t.seciliGun}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={pc?.urun_turleri || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="tur" width={95} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="adet" radius={[0, 6, 6, 0]} barSize={18}>
                    {(pc?.urun_turleri || []).map((_, i) => (
                      <Cell key={i} fill={["#8b5cf6", "#a78bfa", "#6366f1", "#38bdf8"][i % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <Panel title={t.hatBazliSayimTablo} subtitle={t.herHatAyri} flush>
            <DataTable minWidth="500px">
              <thead>
                <tr><th>{t.hat}</th><th className="text-right">{t.adet}</th><th>{t.pay}</th></tr>
              </thead>
              <tbody>
                {hatlar.map((h) => {
                  const pay = pc?.toplam ? Math.round((h.adet / pc.toplam) * 100) : 0;
                  return (
                    <tr key={h.hat}>
                      <td className="font-medium">{h.hat}</td>
                      <td className="text-right font-semibold text-violet-500">{numFmt(h.adet)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-track h-2 flex-1 max-w-[120px]">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${pay}%` }} />
                          </div>
                          <span className="text-xs text-[var(--text-muted)]">%{pay}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </Panel>
        </>
      )}
    </>
  );
}
