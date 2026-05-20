import { useMemo, useState } from "react";
import { Camera, ChevronUp, LayoutDashboard, ShieldAlert, Users } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import FilterBar from "../components/FilterBar";
import { ChartTooltipBar, ChartTooltipTraffic, Panel, StatCard, StatusBadge } from "../components/ui";

export default function OverviewView({ data }) {
  const dates = data.dates || [];
  const [date, setDate] = useState(dates[0]);
  const [search, setSearch] = useState("");

  const logs = useMemo(() => {
    return (data.logs || []).filter((l) => {
      if (date && l.tarih !== date) return false;
      const q = search.toLowerCase();
      if (!q) return true;
      return [l.kamera, l.modul, l.durum].some((x) => x.toLowerCase().includes(q));
    });
  }, [data.logs, date, search]);

  const stats = data.notification_stats || [];

  return (
    <>
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Log ara (kamera, modül)..."
        date={date}
        onDateChange={setDate}
        dates={dates}
        showGranularity={false}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Aktif AI Kamerası" value={<>{data.summary.kameralar.aktif} <span className="text-lg font-normal text-zinc-500">/ {data.summary.kameralar.toplam}</span></>} subtitle={data.summary.kameralar.degisim} subtitleClass="text-emerald-400" icon={Camera} accent="cyan" />
        <StatCard title="Aktif Personel" value={data.summary.aktif_personel.sayi} subtitle={data.summary.aktif_personel.degisim} subtitleClass="text-sky-400" icon={Users} accent="blue" />
        <StatCard title="Bugünkü İhlal" value={data.summary.isg_ihlaller.bugun} subtitle={data.summary.isg_ihlaller.alt_metin} subtitleClass="text-red-400/90" icon={ShieldAlert} accent="red" />
        <StatCard title="Ort. Verimlilik" value={`%${data.summary.hat_verimlilik.ortalama}`} subtitle={<span className="inline-flex items-center gap-1"><ChevronUp className="h-3.5 w-3.5 text-emerald-400" />{data.summary.hat_verimlilik.alt_metin}</span>} subtitleClass="text-emerald-400" icon={LayoutDashboard} accent="green" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Sistem Trafiği" subtitle="Son 24 saat aktivite" badge={<span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400 border border-emerald-500/20">Canlı</span>}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.traffic}>
              <defs>
                <linearGradient id="ovGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="saat" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltipTraffic />} />
              <Area type="monotone" dataKey="kisi" stroke="#34d399" strokeWidth={2} fill="url(#ovGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Bildirim Kategorileri" subtitle="Dağılım özeti">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="kategori" tick={{ fill: "#a1a1aa", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
              <Bar dataKey="adet" radius={[6, 6, 0, 0]}>
                {stats.map((s) => <Cell key={s.kategori} fill={s.renk} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Son Algılama Logları" subtitle="Filtrelenmiş kayıtlar" className="overflow-hidden">
        <div className="overflow-x-auto -mx-5 -mb-5">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-left text-xs uppercase text-zinc-500">
                <th className="px-5 py-3">Zaman</th>
                <th className="px-5 py-3">Kamera</th>
                <th className="px-5 py-3">Modül</th>
                <th className="px-5 py-3">Durum</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-zinc-500">Kayıt bulunamadı</td></tr>
              ) : logs.map((log, i) => (
                <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-700/20">
                  <td className="px-5 py-3 font-mono text-xs text-zinc-400">{log.zaman}</td>
                  <td className="px-5 py-3 text-zinc-200">{log.kamera}</td>
                  <td className="px-5 py-3 text-zinc-400">{log.modul}</td>
                  <td className="px-5 py-3"><StatusBadge variant={log.tip}>{log.durum}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
