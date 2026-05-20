import { useEffect, useState } from "react";
import { Camera, Key, Play, Plus, Save, Trash2 } from "lucide-react";
import { api } from "../api";
import { useLocale } from "../context/LocaleContext";
import { Panel } from "../components/ui";

const EMPTY = { ad: "", rtsp: "", modul: "isg", token: "" };

export default function SettingsView() {
  const { t } = useLocale();
  const [cameras, setCameras] = useState([]);
  const [modules, setModules] = useState([]);
  const [draft, setDraft] = useState(EMPTY);
  const [passwords, setPasswords] = useState({ mevcut: "", yeni: "", tekrar: "" });
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(null);
  const [streamCam, setStreamCam] = useState(null);
  const [streamInfo, setStreamInfo] = useState(null);

  const load = () =>
    api.getCameras().then((r) => {
      setCameras(r.data);
      setModules(r.modules || []);
    });

  useEffect(() => {
    load();
  }, []);

  const openStream = async (cam) => {
    setStreamCam(cam);
    try {
      const info = await api.cameraStream(cam.id);
      setStreamInfo(info);
    } catch (e) {
      setStreamInfo({ mesaj: e.message });
    }
  };

  const saveCam = async (cam) => {
    setSaving(cam.id);
    try {
      await api.updateCamera(cam.id, { ad: cam.ad, rtsp: cam.rtsp, modul: cam.modul, token: cam.token });
      setMsg({ type: "ok", text: `${cam.ad} ${t.kameraKaydedildi}` });
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setSaving(null);
    }
  };

  const addCam = async (e) => {
    e.preventDefault();
    try {
      await api.addCamera(draft);
      setDraft(EMPTY);
      load();
      setMsg({ type: "ok", text: t.kameraEklendi });
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  };

  const removeCam = async (id) => {
    if (!confirm(t.kameraSilOnay)) return;
    await api.deleteCamera(id);
    if (streamCam?.id === id) {
      setStreamCam(null);
      setStreamInfo(null);
    }
    load();
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.yeni !== passwords.tekrar) {
      setMsg({ type: "err", text: t.sifrelerEslesmiyor });
      return;
    }
    try {
      const res = await api.changePassword(passwords.mevcut, passwords.yeni);
      setMsg({ type: "ok", text: res.mesaj });
      setPasswords({ mevcut: "", yeni: "", tekrar: "" });
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {msg && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${msg.type === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-red-500/30 bg-red-500/10 text-red-600"}`}>
          {msg.text}
        </div>
      )}

      <Panel title={t.sifreDegistir} subtitle={t.hesapGuvenligi}>
        <form onSubmit={changePassword} className="max-w-md space-y-4">
          <input type="password" placeholder={t.mevcutSifre} value={passwords.mevcut} onChange={(e) => setPasswords({ ...passwords, mevcut: e.target.value })} className="input-dark w-full" required />
          <input type="password" placeholder={t.yeniSifre} value={passwords.yeni} onChange={(e) => setPasswords({ ...passwords, yeni: e.target.value })} className="input-dark w-full" required minLength={6} />
          <input type="password" placeholder={t.yeniSifreTekrar} value={passwords.tekrar} onChange={(e) => setPasswords({ ...passwords, tekrar: e.target.value })} className="input-dark w-full" required />
          <button type="submit" className="btn-primary">
            <Key className="h-4 w-4" /> {t.guncelle}
          </button>
        </form>
      </Panel>

      {streamCam && streamInfo && (
        <Panel title={`${t.canliYayin}: ${streamCam.ad}`} flush>
          <div className="aspect-video w-full bg-black">
            {streamInfo.demo_hls ? (
              <video className="h-full w-full" controls autoPlay muted playsInline src={streamInfo.demo_hls} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">{streamInfo.mesaj}</div>
            )}
          </div>
          <p className="panel-body text-xs text-[var(--text-muted)] font-mono">{streamInfo.rtsp_source}</p>
        </Panel>
      )}

      <Panel title={t.kameraYonetimi} subtitle={t.kameraYonetimiAlt}>
        <form onSubmit={addCam} className="mb-6 grid gap-3 rounded-xl border border-dashed border-[var(--border)] p-4 sm:grid-cols-2">
          <p className="sm:col-span-2 text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" /> {t.yeniKamera}
          </p>
          <input className="input-dark" placeholder={t.kameraAdi} required value={draft.ad} onChange={(e) => setDraft({ ...draft, ad: e.target.value })} />
          <select className="input-dark" value={draft.modul} onChange={(e) => setDraft({ ...draft, modul: e.target.value })}>
            {modules.map((m) => (
              <option key={m} value={m}>{m.toUpperCase()}</option>
            ))}
          </select>
          <input className="input-dark sm:col-span-2 font-mono text-xs" placeholder="rtsp://..." required value={draft.rtsp} onChange={(e) => setDraft({ ...draft, rtsp: e.target.value })} />
          <input className="input-dark sm:col-span-2 font-mono text-xs" placeholder="token" required value={draft.token} onChange={(e) => setDraft({ ...draft, token: e.target.value })} />
          <button type="submit" className="btn-primary sm:col-span-2">{t.kameraEkle}</button>
        </form>

        <div className="space-y-4">
          {cameras.map((cam, i) => (
            <div key={cam.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-page)] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Camera className="h-4 w-4 shrink-0 text-sky-500" />
                  <input className="input-dark font-medium min-w-0" value={cam.ad} onChange={(e) => { const n = [...cameras]; n[i] = { ...cam, ad: e.target.value }; setCameras(n); }} />
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => openStream(cam)} className="btn-ghost text-xs">
                    <Play className="h-3.5 w-3.5" /> {t.canliYayin}
                  </button>
                  <button type="button" onClick={() => removeCam(cam.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <select className="input-dark w-full" value={cam.modul} onChange={(e) => { const n = [...cameras]; n[i] = { ...cam, modul: e.target.value }; setCameras(n); }}>
                {modules.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input className="input-dark w-full font-mono text-xs" value={cam.rtsp} onChange={(e) => { const n = [...cameras]; n[i] = { ...cam, rtsp: e.target.value }; setCameras(n); }} />
              <input className="input-dark w-full font-mono text-xs" value={cam.token} onChange={(e) => { const n = [...cameras]; n[i] = { ...cam, token: e.target.value }; setCameras(n); }} />
              <button type="button" disabled={saving === cam.id} onClick={() => saveCam(cam)} className="btn-ghost">
                <Save className="h-4 w-4" /> {saving === cam.id ? "..." : t.kaydet}
              </button>
            </div>
          ))}
          {cameras.length === 0 && <p className="text-center text-sm text-[var(--text-muted)] py-4">{t.henuzKameraYok}</p>}
        </div>
      </Panel>
    </div>
  );
}
