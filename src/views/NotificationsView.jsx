import { useMemo, useState } from "react";
import { Bell, Image, Plus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api";
import { useLocale } from "../context/LocaleContext";
import { translateCategory, translateSeviye } from "../i18n/helpers";
import FilterBar from "../components/FilterBar";
import { DataTable, Panel, StatCard, StatusBadge } from "../components/ui";

const SEVIYELER = ["kritik", "uyari", "bilgi"];

export default function NotificationsView({ data, onRefresh }) {
  const { t, locale } = useLocale();
  const dates = data.dates || [];
  const [date, setDate] = useState(dates[0]);
  const [search, setSearch] = useState("");
  const [kategori, setKategori] = useState("tumu");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    tarih: dates[0] || new Date().toISOString().slice(0, 10),
    zaman: "14:00",
    kamera: "",
    kategori: "İSG",
    baslik: "",
    detay: "",
    seviye: "bilgi",
    modul: "",
    gorsel: "",
  });
  const [saving, setSaving] = useState(false);

  const list = data.notifications || [];

  const filtered = useMemo(() => {
    return list.filter((n) => {
      if (date && n.tarih !== date) return false;
      if (kategori !== "tumu" && n.kategori !== kategori) return false;
      const q = search.toLowerCase();
      if (!q) return true;
      return [n.baslik, n.detay, n.kamera, n.kategori, n.modul].some((x) =>
        String(x).toLowerCase().includes(q)
      );
    });
  }, [list, date, search, kategori]);

  const chartBySeviye = useMemo(() => {
    const m = {};
    filtered.forEach((n) => {
      m[n.seviye] = (m[n.seviye] || 0) + 1;
    });
    return [
      { ad: translateSeviye(locale, "kritik"), deger: m.kritik || 0, fill: "#ef4444", key: "kritik" },
      { ad: translateSeviye(locale, "uyari"), deger: m.uyari || 0, fill: "#f97316", key: "uyari" },
      { ad: translateSeviye(locale, "bilgi"), deger: m.bilgi || 0, fill: "#64748b", key: "bilgi" },
    ];
  }, [filtered, locale]);

  const [imageFile, setImageFile] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("tarih", form.tarih);
      fd.append("zaman", form.zaman);
      fd.append("kamera", form.kamera);
      fd.append("kategori", form.kategori);
      fd.append("baslik", form.baslik);
      fd.append("detay", form.detay);
      fd.append("seviye", form.seviye);
      fd.append("modul", form.modul);
      if (imageFile) fd.append("gorsel", imageFile);
      await api.addNotification(fd);
      setShowForm(false);
      setImageFile(null);
      setForm({ ...form, baslik: "", detay: "", kamera: "" });
      onRefresh?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const kritik = filtered.filter((n) => n.seviye === "kritik" && !n.okundu).length;

  return (
    <>
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t.bildirimAra}
        date={date}
        onDateChange={(d) => { setDate(d); setForm((f) => ({ ...f, tarih: d })); }}
        dates={dates}
        showGranularity={false}
        extra={
          <>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="input-dark w-auto"
            >
              <option value="tumu">{t.tumKategoriler}</option>
              {(data.notification_categories || []).map((c) => (
                <option key={c} value={c}>{translateCategory(locale, c)}</option>
              ))}
            </select>
            <button type="button" onClick={() => setShowForm(!showForm)} className="btn-secondary shrink-0">
              <Plus className="h-4 w-4" />
              {t.bildirimEkle}
            </button>
          </>
        }
      />

      {showForm && (
        <form onSubmit={handleAdd} className="panel panel-body space-y-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{t.yeniBildirim}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input required placeholder={t.baslik} value={form.baslik} onChange={(e) => setForm({ ...form, baslik: e.target.value })} className="input-dark" />
            <input required placeholder={t.kameraAlan} value={form.kamera} onChange={(e) => setForm({ ...form, kamera: e.target.value })} className="input-dark" />
            <input placeholder={t.modul} value={form.modul} onChange={(e) => setForm({ ...form, modul: e.target.value })} className="input-dark" />
            <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} className="input-dark">
              {(data.notification_categories || ["İSG"]).map((c) => (
                <option key={c} value={c}>{translateCategory(locale, c)}</option>
              ))}
            </select>
            <select value={form.seviye} onChange={(e) => setForm({ ...form, seviye: e.target.value })} className="input-dark">
              {SEVIYELER.map((s) => <option key={s} value={s}>{translateSeviye(locale, s)}</option>)}
            </select>
            <input type="time" value={form.zaman} onChange={(e) => setForm({ ...form, zaman: e.target.value })} className="input-dark" />
            <label className="sm:col-span-2 text-xs text-[var(--text-muted)]">
              {t.gorselYukle}
              <input type="file" accept="image/*" className="input-dark mt-1" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </label>
            <textarea placeholder={t.detay} value={form.detay} onChange={(e) => setForm({ ...form, detay: e.target.value })} className="input-dark sm:col-span-2 lg:col-span-3 min-h-[60px]" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? t.kaydediliyor : t.kaydet}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">{t.iptal}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title={t.toplamFiltre} value={filtered.length} subtitle={t.seciliTarihArama} icon={Bell} accent="blue" />
        <StatCard title={t.okunmamisKritik} value={kritik} subtitle={t.acilMudahale} accent="red" />
        <StatCard title={t.kategoriler} value={(data.notification_categories || []).length} subtitle={t.aktifBildirimTuru} accent="cyan" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title={t.seviyeDagilimi} className="lg:col-span-1">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={chartBySeviye} dataKey="deger" nameKey="ad" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                {chartBySeviye.map((e) => <Cell key={e.key} fill={e.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--border)", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={t.kategoriGrafigi} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={(data.notification_stats || []).map((s) => ({ ...s, kategori: translateCategory(locale, s.kategori) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="kategori" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="adet" radius={[6, 6, 0, 0]}>
                {(data.notification_stats || []).map((s) => <Cell key={s.kategori} fill={s.renk} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title={t.bildirimTablosu} subtitle={t.gorselOnizleme} flush>
        <DataTable minWidth="800px">
          <thead>
            <tr>
              <th>{t.gorsel}</th>
              <th>{t.zaman}</th>
              <th>{t.kategori}</th>
              <th>{t.baslik}</th>
              <th>{t.kameraAlan}</th>
              <th>{t.seviye}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={6}>{t.bildirimBulunamadi}</td></tr>
            ) : filtered.map((n) => (
              <tr key={n.id}>
                <td><div className="thumb-box"><Image className="h-5 w-5 text-[var(--accent)]" /></div></td>
                <td className="font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">{n.zaman}</td>
                <td>{translateCategory(locale, n.kategori)}</td>
                <td>
                  <p className="font-medium">{n.baslik}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 max-w-xs truncate">{n.detay}</p>
                </td>
                <td className="text-[var(--text-muted)]">{n.kamera}</td>
                <td><StatusBadge variant={n.seviye}>{translateSeviye(locale, n.seviye)}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </>
  );
}
