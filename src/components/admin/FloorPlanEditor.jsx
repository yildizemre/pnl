import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, MapPin, Save, Trash2, X } from "lucide-react";
import { api, mediaUrl } from "../../api";
import { useLocale } from "../../context/LocaleContext";
import { FLOOR_MODULES, newPointId, newSiteId } from "../../lib/floorPlan";
import { Panel } from "../ui";

export default function FloorPlanEditor({ user, onClose }) {
  const { t, locale } = useLocale();
  const mapRef = useRef(null);
  const fileRef = useRef(null);

  const [plan, setPlan] = useState({ sites: [], active_site_id: "", mode: "default", background: "", points: [] });
  const [activeSiteId, setActiveSiteId] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.getAdminFloorPlan(user.id);
      const d = res.data || { sites: [], points: [] };
      setPlan(d);
      setActiveSiteId(d.active_site_id || d.sites?.[0]?.id || "");
    } catch (err) {
      setPlan({ mode: "default", background: "", points: [] });
      setMsg(err.message || t.krokiYuklemeHatasi);
    }
  }, [user.id, t.krokiYuklemeHatasi]);

  useEffect(() => {
    load();
  }, [load]);

  const activeSite = (plan.sites || []).find((s) => s.id === activeSiteId) || plan.sites?.[0] || {
    id: "",
    name: "Ana Tesis",
    mode: plan.mode || "default",
    background: plan.background || "",
    points: plan.points || [],
  };
  const sitePoints = activeSite.points || [];

  const patchActiveSite = (patch) => {
    setPlan((prev) => {
      const sites = (prev.sites || []).map((s) => (s.id === activeSiteId ? { ...s, ...patch } : s));
      const active = sites.find((s) => s.id === activeSiteId) || sites[0];
      return {
        ...prev,
        sites,
        active_site_id: activeSiteId,
        mode: active?.mode,
        background: active?.background,
        points: active?.points || [],
      };
    });
  };

  const selected = sitePoints.find((p) => p.id === selectedId);

  const updatePoint = (id, patch) => {
    patchActiveSite({
      points: sitePoints.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  };

  const removePoint = (id) => {
    patchActiveSite({ points: sitePoints.filter((p) => p.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const onMapClick = (e) => {
    if (!mapRef.current || activeSite.mode !== "image" || !activeSite.background) return;
    if (e.target.closest(".floor-editor-point")) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
    const id = newPointId();
    const pt = {
      id,
      x,
      y,
      label: `${t.krokiKamera} ${sitePoints.length + 1}`,
      tag: "",
      camera_id: "",
      modules: ["genel"],
    };
    patchActiveSite({ points: [...sitePoints, pt] });
    setSelectedId(id);
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadFloorBackground(user.id, file);
      patchActiveSite({ mode: "image", background: res.background });
      setMsg(t.krokiGorselYuklendi);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      await api.saveAdminFloorPlan(user.id, { sites: plan.sites, active_site_id: activeSiteId });
      setMsg(t.krokiKaydedildi);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addSite = () => {
    const id = newSiteId();
    const site = { id, name: `${t.krokiTesis} ${(plan.sites || []).length + 1}`, mode: "default", background: "", points: [] };
    setPlan((prev) => ({ ...prev, sites: [...(prev.sites || []), site], active_site_id: id }));
    setActiveSiteId(id);
    setSelectedId(null);
  };

  const removeSite = (id) => {
    if ((plan.sites || []).length <= 1) return;
    if (!window.confirm(t.krokiTesisSil)) return;
    const sites = plan.sites.filter((s) => s.id !== id);
    const nextId = sites[0]?.id || "";
    setPlan((prev) => ({ ...prev, sites, active_site_id: nextId }));
    setActiveSiteId(nextId);
    setSelectedId(null);
  };

  const renameSite = (name) => {
    patchActiveSite({ name });
  };

  const modLabel = (m) => {
    const row = FLOOR_MODULES.find((x) => x.id === m);
    return row ? (locale === "EN" ? row.labelEn : row.labelTr) : m;
  };

  return (
    <div className="floor-editor-backdrop" onClick={onClose} role="presentation">
      <div className="floor-editor panel" onClick={(e) => e.stopPropagation()}>
        <div className="floor-editor-head">
          <div>
            <h3>{t.krokiEditor} — {user.ad}</h3>
            <p className="text-sm text-[var(--text-muted)]">{t.krokiEditorAlt}</p>
          </div>
          <button type="button" className="floor-editor-close" onClick={onClose} aria-label={t.kapat}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="floor-editor-sites">
          <span className="text-xs font-semibold text-[var(--text-muted)]">{t.krokiTesis}</span>
          <div className="floor-editor-site-tabs">
            {(plan.sites || []).map((s) => (
              <button
                key={s.id}
                type="button"
                className={s.id === activeSiteId ? "active" : ""}
                onClick={() => { setActiveSiteId(s.id); setSelectedId(null); }}
              >
                {s.name || s.id}
              </button>
            ))}
            <button type="button" className="btn-ghost text-xs" onClick={addSite}>+ {t.krokiTesisEkle}</button>
          </div>
          {activeSite && (
            <input
              className="input-dark mt-2 max-w-xs text-sm"
              value={activeSite.name || ""}
              onChange={(e) => renameSite(e.target.value)}
              placeholder={t.krokiTesisAdi}
            />
          )}
        </div>

        <div className="floor-editor-toolbar">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
          <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <ImagePlus className="h-4 w-4" />
            {uploading ? "…" : t.krokiGorselYukle}
          </button>
          <label className="floor-editor-mode">
            <input
              type="radio"
              name="mode"
              checked={activeSite.mode === "default"}
              onChange={() => patchActiveSite({ mode: "default" })}
            />
            {t.krokiVarsayilan}
          </label>
          <label className="floor-editor-mode">
            <input
              type="radio"
              name="mode"
              checked={activeSite.mode === "image"}
              onChange={() => patchActiveSite({ mode: "image" })}
            />
            {t.krokiOzelGorsel}
          </label>
          {(plan.sites || []).length > 1 && (
            <button type="button" className="btn-ghost text-red-500" onClick={() => removeSite(activeSiteId)}>
              <Trash2 className="h-4 w-4" />
              {t.krokiTesisSil}
            </button>
          )}
          <button type="button" className="btn-primary ml-auto" onClick={save} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "…" : t.kaydet}
          </button>
        </div>

        {msg && <p className="floor-editor-msg">{msg}</p>}

        <div className="floor-editor-body">
          <div
            ref={mapRef}
            className={`floor-editor-map ${activeSite.mode === "image" && activeSite.background ? "floor-editor-map--image" : ""}`}
            onClick={onMapClick}
            role="presentation"
          >
            {activeSite.mode === "image" && activeSite.background ? (
              <img src={mediaUrl(activeSite.background)} alt="" className="floor-editor-bg" draggable={false} />
            ) : (
              <div className="floor-editor-placeholder">
                <MapPin className="h-10 w-10 text-[var(--text-muted)]" />
                <p>{t.krokiGorselYukleHint}</p>
              </div>
            )}

            {sitePoints.map((p) => {
              const active = p.id === selectedId;
              const hasAlert = false;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`floor-editor-point ${active ? "floor-editor-point--active" : ""} ${hasAlert ? "floor-editor-point--alert" : ""}`}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(p.id);
                  }}
                  title={p.label}
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span className="floor-editor-point-label">{p.tag || p.label}</span>
                </button>
              );
            })}
          </div>

          <aside className="floor-editor-side">
            <Panel title={t.krokiNoktaDetay} subtitle={selected ? selected.label : t.krokiNoktaSec}>
              {!selected ? (
                <p className="text-sm text-[var(--text-muted)]">{t.krokiNoktaSecHint}</p>
              ) : (
                <div className="floor-editor-form">
                  <label>
                    <span>{t.krokiEtiket}</span>
                    <input
                      className="input-dark"
                      value={selected.label}
                      onChange={(e) => updatePoint(selected.id, { label: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>{t.krokiTag}</span>
                    <input
                      className="input-dark"
                      placeholder="Kamera 01"
                      value={selected.tag}
                      onChange={(e) => updatePoint(selected.id, { tag: e.target.value })}
                    />
                    <small className="text-[var(--text-muted)]">{t.krokiTagHint}</small>
                  </label>
                  <fieldset>
                    <legend>{t.krokiModuller}</legend>
                    <div className="floor-editor-modules">
                      {FLOOR_MODULES.map((m) => {
                        const checked = (selected.modules || []).includes(m.id);
                        return (
                          <label key={m.id} className="floor-editor-module">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const mods = selected.modules || [];
                                const next = checked ? mods.filter((x) => x !== m.id) : [...mods, m.id];
                                updatePoint(selected.id, { modules: next });
                              }}
                            />
                            {modLabel(m.id)}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <p className="text-xs text-[var(--text-muted)]">
                    x: {selected.x}% · y: {selected.y}%
                  </p>
                  <button type="button" className="btn-ghost text-red-500" onClick={() => removePoint(selected.id)}>
                    <Trash2 className="h-4 w-4" />
                    {t.krokiNoktaSil}
                  </button>
                </div>
              )}
            </Panel>

            <Panel title={t.krokiNoktaListesi} subtitle={`${sitePoints.length} ${t.krokiNokta}`}>
              <ul className="floor-editor-list">
                {sitePoints.length === 0 ? (
                  <li className="text-sm text-[var(--text-muted)]">{t.krokiNoktaYok}</li>
                ) : sitePoints.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => setSelectedId(p.id)} className={p.id === selectedId ? "active" : ""}>
                      <Camera className="h-3.5 w-3.5" />
                      <span>{p.tag || p.label}</span>
                      <span className="floor-editor-list-mods">{(p.modules || []).map(modLabel).join(", ")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}
