import { useState } from "react";
import { Check, X } from "lucide-react";
import { api } from "../../api";
import { useLocale } from "../../context/LocaleContext";

export default function NotificationFeedback({ item, onUpdated, compact = false }) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(item?.feedback || null);

  if (!item?.gorsel || !item?.id) return null;

  if (feedback) {
    const ok = feedback === "evet";
    return (
      <span className={`notif-feedback-badge notif-feedback-badge--${feedback}`}>
        {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
        {ok ? t.feedbackEvet : t.feedbackHayir}
      </span>
    );
  }

  const submit = async (label, e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.notificationFeedback(item.id, label);
      setFeedback(label);
      onUpdated?.(res.item);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`notif-feedback ${compact ? "notif-feedback--compact" : ""}`}
      onClick={(e) => e.stopPropagation()}
      role="group"
      aria-label={t.feedbackSoru}
    >
      <p className="notif-feedback-label">{t.feedbackSoru}</p>
      <div className="notif-feedback-actions">
        <button type="button" className="notif-feedback-btn notif-feedback-btn--evet" disabled={busy} onClick={(e) => submit("evet", e)}>
          <Check className="h-4 w-4" />
          {t.evet}
        </button>
        <button type="button" className="notif-feedback-btn notif-feedback-btn--hayir" disabled={busy} onClick={(e) => submit("hayir", e)}>
          <X className="h-4 w-4" />
          {t.hayir}
        </button>
      </div>
    </div>
  );
}
