import { useEffect } from "react";
import { Bell, MapPin, X } from "lucide-react";
import { mediaUrl } from "../../api";
import { useLocale } from "../../context/LocaleContext";
import { translateSeviye } from "../../i18n/helpers";
import { eventColor, eventLabel } from "../../data/notificationTypes";

export default function NotificationToast({ item, onClose, onOpen, onShowOnMap }) {
  const { t, locale } = useLocale();

  useEffect(() => {
    if (!item) return undefined;
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [item, onClose]);

  if (!item) return null;

  const accent = eventColor(item.kategori);

  return (
    <div className="notif-toast-wrap" role="alert" aria-live="assertive">
      <div className="notif-toast">
        <button type="button" className="notif-toast-main" onClick={() => onOpen?.(item)}>
          <div className="notif-toast-media">
            {item.gorsel ? (
              <img src={mediaUrl(item.gorsel)} alt="" />
            ) : (
              <span className="notif-toast-icon" style={{ color: accent }}>
                <Bell className="h-5 w-5" />
              </span>
            )}
          </div>
          <div className="notif-toast-body">
            <span className="notif-toast-cat" style={{ color: accent }}>
              {eventLabel(item.kategori, locale)}
            </span>
            <p className="notif-toast-title">{item.baslik}</p>
            <p className="notif-toast-meta">{item.kamera} · {item.zaman}</p>
            <span className={`notif-toast-sev notif-toast-sev--${item.seviye}`}>
              {translateSeviye(locale, item.seviye)}
            </span>
          </div>
        </button>
        <button
          type="button"
          className="notif-toast-close"
          onClick={onClose}
          aria-label={t.kapat}
        >
          <X className="h-4 w-4" />
        </button>
        {onShowOnMap && item.kamera && (
          <button type="button" className="notif-toast-map btn-secondary" onClick={() => { onShowOnMap(item); onClose(); }}>
            <MapPin className="h-3.5 w-3.5" />
            {t.kamerayiGoster}
          </button>
        )}
      </div>
    </div>
  );
}
