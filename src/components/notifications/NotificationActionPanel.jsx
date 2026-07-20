import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { api } from "../../api";
import { useLocale } from "../../context/LocaleContext";

const ACTIONS = [
  { id: "acik", labelKey: "aksiyonAcik" },
  { id: "kapandi", labelKey: "aksiyonKapandi" },
  { id: "yanlis_alarm", labelKey: "aksiyonYanlisAlarm" },
  { id: "egitim", labelKey: "aksiyonEgitim" },
];

export default function NotificationActionPanel({ item, onUpdated }) {
  const { t } = useLocale();
  const [sorumlu, setSorumlu] = useState(item?.sorumlu || "");
  const [durum, setDurum] = useState(item?.aksiyon_durum || "acik");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setSorumlu(item?.sorumlu || "");
    setDurum(item?.aksiyon_durum || "acik");
  }, [item?.id, item?.sorumlu, item?.aksiyon_durum]);

  if (!item?.id) return null;

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await api.notificationAction(item.id, {
        aksiyon_durum: durum,
        sorumlu: sorumlu.trim(),
      });
      onUpdated?.(res.item);
      setMsg(t.kaydedildi);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="notif-action-panel" onClick={(e) => e.stopPropagation()}>
      <p className="notif-action-title">{t.aksiyonTakibi}</p>
      <label className="notif-action-field">
        <span><UserRound className="h-3.5 w-3.5" /> {t.sorumlu}</span>
        <input
          className="input-dark"
          value={sorumlu}
          onChange={(e) => setSorumlu(e.target.value)}
          placeholder={t.sorumluPlaceholder}
        />
      </label>
      <div className="notif-action-pills" role="group" aria-label={t.aksiyonDurum}>
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`notif-action-pill ${durum === a.id ? `notif-action-pill--${a.id} is-active` : ""}`}
            onClick={() => setDurum(a.id)}
          >
            {t[a.labelKey]}
          </button>
        ))}
      </div>
      <button type="button" className="btn-primary" disabled={busy} onClick={save}>
        {busy ? "…" : t.kaydet}
      </button>
      {msg && <p className="notif-action-msg">{msg}</p>}
    </div>
  );
}
