import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Plus, Trash2, Users } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { ROLE_LABELS_EN, ROLE_LABELS_TR } from "../lib/roles";
import FilterBar from "../components/FilterBar";
import { DataTable, Panel, StatusBadge } from "../components/ui";

export default function AdminUsersView() {
  const { user: currentUser, impersonate } = useAuth();
  const { t, locale } = useLocale();
  const roleLabels = locale === "EN" ? ROLE_LABELS_EN : ROLE_LABELS_TR;
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    kullanici_adi: "",
    ad: "",
    email: "",
    sifre: "demo",
    rol: "user",
    kurulum: "",
  });

  const load = () => api.listUsers().then((r) => setUsers(r.data));

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.ad.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.kullanici_adi.toLowerCase().includes(q)
    );
  }, [users, search]);

  const submit = async (e) => {
    e.preventDefault();
    await api.createUser(form);
    setShowForm(false);
    setForm({ kullanici_adi: "", ad: "", email: "", sifre: "demo", rol: "user", kurulum: "" });
    load();
  };

  const remove = async (u) => {
    if (!window.confirm(`${u.ad} — ${t.silOnay}`)) return;
    try {
      await api.deleteUser(u.id);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <>
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t.kullaniciAra}
        showGranularity={false}
        dates={[]}
        date=""
        onDateChange={() => {}}
        extra={
          <button type="button" onClick={() => setShowForm(!showForm)} className="btn-secondary">
            <Plus className="h-4 w-4" />
            {t.yeniKullanici}
          </button>
        }
      />

      {showForm && (
        <form
          onSubmit={submit}
          className="panel panel-body grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <input className="input-dark" placeholder={t.kullaniciAdi} required value={form.kullanici_adi} onChange={(e) => setForm({ ...form, kullanici_adi: e.target.value })} />
          <input className="input-dark" placeholder={t.gorunenAd} required value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
          <input className="input-dark" type="email" placeholder={t.email} required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input-dark" type="password" placeholder={t.sifre} required value={form.sifre} onChange={(e) => setForm({ ...form, sifre: e.target.value })} />
          <input className="input-dark" placeholder={t.kurulum} value={form.kurulum} onChange={(e) => setForm({ ...form, kurulum: e.target.value })} />
          <select className="input-dark" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
            {Object.entries(roleLabels).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary sm:col-span-2 lg:col-span-3">{t.kaydet}</button>
        </form>
      )}

      <Panel flush>
        <DataTable minWidth="720px">
          <thead>
            <tr>
              <th>{t.kullanici}</th>
              <th>{t.email}</th>
              <th>{t.rol}</th>
              <th>{t.kurulum}</th>
              <th className="text-right">{t.islemler}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={5}>{t.kullaniciBulunamadi}</td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-bg)] text-[var(--accent)]">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{u.ad}</p>
                        <p className="text-xs text-[var(--text-muted)]">@{u.kullanici_adi}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-[var(--text-muted)]">{u.email}</td>
                  <td>
                    <StatusBadge variant={u.rol === "admin" ? "normal" : "bilgi"}>{roleLabels[u.rol] || u.rol}</StatusBadge>
                  </td>
                  <td className="text-[var(--text-muted)]">
                    <p>{u.kamera_sayisi} {t.kamera}</p>
                    {u.kurulum && <p className="text-xs text-[var(--accent)]">• {u.kurulum}</p>}
                  </td>
                  <td className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <button type="button" onClick={() => impersonate(u.id)} className="btn-ghost">
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t.paneleGit}
                      </button>
                      {u.id !== currentUser?.id && u.id !== "u-admin" && (
                        <button
                          type="button"
                          onClick={() => remove(u)}
                          className="btn-ghost text-red-500 hover:text-red-400"
                          title={t.sil}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      </Panel>
    </>
  );
}
