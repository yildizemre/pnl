import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Key, Pencil, Plus, RotateCcw, Trash2, Users, X } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../hooks/useAuth";
import { useLocale } from "../context/LocaleContext";
import { ROLE_LABELS_EN, ROLE_LABELS_TR } from "../lib/roles";
import { DEFAULT_USER_MODULES, PANEL_MODULES, modulesForRole } from "../lib/modules";
import FilterBar from "../components/FilterBar";
import { DataTable, Panel, StatusBadge } from "../components/ui";

function splitAd(ad = "") {
  const parts = String(ad || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { isim: "", soyisim: "" };
  if (parts.length === 1) return { isim: parts[0], soyisim: "" };
  return { isim: parts[0], soyisim: parts.slice(1).join(" ") };
}

const emptyForm = () => ({
  kullanici_adi: "",
  isim: "",
  soyisim: "",
  email: "",
  sifre: "demo123",
  rol: "user",
  kurulum: "",
  moduller: [...DEFAULT_USER_MODULES],
});

function ModuleChecklist({ value, onChange, t }) {
  const toggle = (id, locked) => {
    if (locked) return;
    if (value.includes(id)) {
      onChange(value.filter((m) => m !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="admin-modules">
      <p className="admin-modules-title">{t.aktifModuller}</p>
      <p className="admin-modules-hint">{t.aktifModullerHint}</p>
      <div className="admin-modules-grid">
        {PANEL_MODULES.map((m) => {
          const checked = value.includes(m.id);
          return (
            <label
              key={m.id}
              className={`admin-module-item ${m.locked ? "admin-module-item--locked" : ""} ${checked ? "admin-module-item--on" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={m.locked}
                onChange={() => toggle(m.id, m.locked)}
              />
              <span>{t[m.labelKey] || m.id}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminUsersView() {
  const { user: currentUser, impersonate } = useAuth();
  const { t, locale } = useLocale();
  const roleLabels = locale === "EN" ? ROLE_LABELS_EN : ROLE_LABELS_TR;
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // "create" | "edit"
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [keyUser, setKeyUser] = useState(null);
  const [keys, setKeys] = useState([]);
  const [newKeyRaw, setNewKeyRaw] = useState("");
  const [keyLabel, setKeyLabel] = useState("Mobil / Entegrasyon");

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

  const openCreate = () => {
    setEditUser(null);
    setForm(emptyForm());
    setFormError("");
    setModal("create");
  };

  const openEdit = (u) => {
    const parts = splitAd(u.ad);
    setEditUser(u);
    setForm({
      kullanici_adi: u.kullanici_adi || "",
      isim: parts.isim,
      soyisim: parts.soyisim,
      email: u.email || "",
      sifre: "",
      rol: u.rol || "user",
      kurulum: u.kurulum || "",
      moduller: (u.moduller || modulesForRole(u.rol)).filter((m) => m !== "uyelik" && m !== "urun"),
    });
    setFormError("");
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditUser(null);
    setFormError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    const isim = form.isim.trim();
    const soyisim = form.soyisim.trim();
    if (!isim || !soyisim) {
      setFormError(t.isimSoyisimZorunlu);
      return;
    }
    const moduller = form.moduller.includes("ana") ? form.moduller : ["ana", ...form.moduller];
    setSaving(true);
    try {
      if (modal === "create") {
        await api.createUser({
          kullanici_adi: form.kullanici_adi.trim(),
          isim,
          soyisim,
          ad: `${isim} ${soyisim}`,
          email: form.email.trim(),
          sifre: form.sifre,
          rol: form.rol,
          kurulum: form.kurulum.trim(),
          moduller,
        });
      } else if (editUser) {
        await api.updateUser(editUser.id, {
          isim,
          soyisim,
          ad: `${isim} ${soyisim}`,
          kullanici_adi: form.kullanici_adi.trim(),
          rol: form.rol,
          kurulum: form.kurulum.trim(),
          moduller,
        });
      }
      closeModal();
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
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

  const openKeys = async (u) => {
    setKeyUser(u);
    setNewKeyRaw("");
    const res = await api.listApiKeys(u.id);
    setKeys(res.data || []);
  };

  const createKey = async () => {
    if (!keyUser) return;
    const res = await api.createApiKey(keyUser.id, keyLabel);
    setNewKeyRaw(res.api_key);
    const list = await api.listApiKeys(keyUser.id);
    setKeys(list.data || []);
  };

  const revokeKey = async (keyId) => {
    await api.deleteApiKey(keyId);
    if (keyUser) {
      const list = await api.listApiKeys(keyUser.id);
      setKeys(list.data || []);
    }
  };

  const copyKey = () => {
    if (newKeyRaw) navigator.clipboard.writeText(newKeyRaw);
  };

  const resetPanel = async (u) => {
    const msg = t.resetPanelOnay.replace("{name}", u.ad);
    if (!window.confirm(msg)) return;
    try {
      await api.resetPanelData(u.id);
      alert(t.resetPanelOk);
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
          <button type="button" onClick={openCreate} className="btn-secondary">
            <Plus className="h-4 w-4" />
            {t.yeniKullanici}
          </button>
        }
      />

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
                    <p className="text-xs text-[var(--text-muted)]">
                      {(u.moduller || []).filter((m) => m !== "uyelik").length} {t.modul}
                    </p>
                  </td>
                  <td className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <button type="button" onClick={() => openEdit(u)} className="btn-ghost" title={t.duzenle}>
                        <Pencil className="h-3.5 w-3.5" />
                        {t.duzenle}
                      </button>
                      <button type="button" onClick={() => openKeys(u)} className="btn-ghost" title={t.apiAnahtari}>
                        <Key className="h-3.5 w-3.5" />
                        API
                      </button>
                      <button type="button" onClick={() => resetPanel(u)} className="btn-ghost text-amber-500" title={t.resetPanelData}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => impersonate(u.id)} className="btn-ghost">
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t.paneleGit}
                      </button>
                      {u.id !== currentUser?.id && u.id !== "u-admin" && u.id !== "u-hype-admin" && (
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

      {modal && (
        <div className="admin-company-backdrop" onClick={closeModal} role="presentation">
          <form
            className="admin-company-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
          >
            <header className="admin-company-head">
              <h3>{modal === "create" ? t.yeniKullanici : t.sirketiDuzenle}</h3>
              <button type="button" className="admin-company-close" onClick={closeModal} aria-label={t.kapat}>
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="admin-company-body">
              <div className="admin-company-fields">
                <label>
                  <span>{t.isim}</span>
                  <input
                    className="input-dark"
                    required
                    value={form.isim}
                    onChange={(e) => setForm({ ...form, isim: e.target.value })}
                    placeholder="Ahmet"
                  />
                </label>
                <label>
                  <span>{t.soyisim}</span>
                  <input
                    className="input-dark"
                    required
                    value={form.soyisim}
                    onChange={(e) => setForm({ ...form, soyisim: e.target.value })}
                    placeholder="Yılmaz"
                  />
                </label>
                <label>
                  <span>{t.kullaniciAdi}</span>
                  <input
                    className="input-dark"
                    required
                    value={form.kullanici_adi}
                    onChange={(e) => setForm({ ...form, kullanici_adi: e.target.value })}
                  />
                </label>
                {modal === "create" && (
                  <label>
                    <span>{t.email}</span>
                    <input
                      className="input-dark"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </label>
                )}
                {modal === "create" && (
                  <label>
                    <span>{t.sifre}</span>
                    <input
                      className="input-dark"
                      type="password"
                      required
                      value={form.sifre}
                      onChange={(e) => setForm({ ...form, sifre: e.target.value })}
                    />
                  </label>
                )}
                <label>
                  <span>{t.kurulum} / {t.sirketAdi}</span>
                  <input
                    className="input-dark"
                    value={form.kurulum}
                    onChange={(e) => setForm({ ...form, kurulum: e.target.value })}
                    placeholder="City Lojistik"
                  />
                </label>
                <label>
                  <span>{t.rol}</span>
                  <select
                    className="input-dark"
                    value={form.rol}
                    onChange={(e) => {
                      const rol = e.target.value;
                      setForm({
                        ...form,
                        rol,
                        moduller: modulesForRole(rol),
                      });
                    }}
                  >
                    {Object.entries(roleLabels).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <ModuleChecklist
                value={form.moduller}
                onChange={(moduller) => setForm({ ...form, moduller })}
                t={t}
              />

              {formError && <p className="text-sm text-red-500">{formError}</p>}
            </div>

            <footer className="admin-company-foot">
              <button type="button" className="btn-ghost" onClick={closeModal}>{t.vazgec}</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "…" : t.kaydet}
              </button>
            </footer>
          </form>
        </div>
      )}

      {keyUser && (
        <div className="admin-key-backdrop" onClick={() => setKeyUser(null)} role="presentation">
          <div className="admin-key-modal panel" onClick={(e) => e.stopPropagation()}>
            <h3>{t.apiAnahtari} — {keyUser.ad}</h3>
            <p className="text-sm text-[var(--text-muted)]">{t.apiAnahtariAlt}</p>

            {newKeyRaw && (
              <div className="admin-key-new">
                <code>{newKeyRaw}</code>
                <button type="button" className="btn-secondary" onClick={copyKey}>
                  <Copy className="h-4 w-4" />
                  {t.kopyala}
                </button>
                <p className="text-xs text-amber-500">{t.apiAnahtariUyari}</p>
              </div>
            )}

            <div className="admin-key-create">
              <input className="input-dark flex-1" value={keyLabel} onChange={(e) => setKeyLabel(e.target.value)} placeholder={t.apiAnahtarEtiket} />
              <button type="button" className="btn-primary" onClick={createKey}>
                <Plus className="h-4 w-4" />
                {t.yeniApiAnahtar}
              </button>
            </div>

            <ul className="admin-key-list">
              {keys.length === 0 ? (
                <li className="text-sm text-[var(--text-muted)]">{t.apiAnahtarYok}</li>
              ) : keys.map((k) => (
                <li key={k.id}>
                  <span>{k.label}</span>
                  <code>{k.key_prefix}</code>
                  <button type="button" className="btn-ghost text-red-500" onClick={() => revokeKey(k.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
