import { useEffect } from "react";
import { Bell, MapPin, Video, X } from "lucide-react";
import { mediaUrl } from "../../api";
import { useLocale } from "../../context/LocaleContext";
import { translateSeviye } from "../../i18n/helpers";
import { eventColor, eventLabel } from "../../data/notificationTypes";
import { formatMetaTime, metaRows } from "../../lib/notificationMeta";
import NotificationFeedback from "./NotificationFeedback";

export default function NotificationDetailModal({ item, subtitle, onClose, onUpdated, onShowOnMap, canShowOnMap }) {
  const { t, locale } = useLocale();

  useEffect(() => {
    if (!item) return undefined;

    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [item, onClose]);

  if (!item) return null;

  const accent = eventColor(item.kategori);
  const hasImage = Boolean(item.gorsel);
  const rows = metaRows(item, t);
  const timeLabel = formatMetaTime(item.meta, item, locale);

  return (
    <div className="notif-modal-backdrop" onClick={onClose} role="presentation">
      <div className="notif-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="notif-modal-close" onClick={onClose} aria-label={t.kapat}>
          <X className="h-5 w-5" />
        </button>

        {hasImage ? (
          <div className="notif-modal-hero">
            <img src={mediaUrl(item.gorsel)} alt={item.baslik} />
            <div className="notif-modal-hero-overlay">
              <span className="notif-modal-cat" style={{ color: accent }}>
                {eventLabel(item.kategori, locale)}
              </span>
              {subtitle && <span className="notif-modal-site">{subtitle}</span>}
            </div>
            <span className={`notif-modal-sev notif-modal-sev--${item.seviye}`}>
              {translateSeviye(locale, item.seviye)}
            </span>
          </div>
        ) : (
          <div className={`notif-modal-header notif-modal-header--${item.seviye}`}>
            <div className="notif-modal-header-icon" style={{ color: accent }}>
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <p className="notif-modal-header-cat" style={{ color: accent }}>
                {eventLabel(item.kategori, locale)}
              </p>
              {subtitle && <p className="notif-modal-site">{subtitle}</p>}
            </div>
            <span className={`notif-modal-sev notif-modal-sev--${item.seviye}`}>
              {translateSeviye(locale, item.seviye)}
            </span>
          </div>
        )}

        <div className="notif-modal-body">
          <p className="notif-modal-time">{timeLabel}</p>
          <h2>{item.baslik}</h2>
          {rows.length > 0 && (
            <dl className="notif-meta-grid">
              {rows.map((r) => (
                <div key={r.label}>
                  <dt>{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {item.detay && <p className="notif-modal-detay">{item.detay}</p>}
          <div className="notif-modal-meta">
            <span><Video className="h-3.5 w-3.5" />{item.kamera}</span>
            {item.modul && <span><MapPin className="h-3.5 w-3.5" />{item.modul}</span>}
          </div>
          <NotificationFeedback item={item} onUpdated={onUpdated} />
          {canShowOnMap && onShowOnMap && (
            <button type="button" className="btn-secondary mt-3" onClick={() => { onShowOnMap(item); onClose(); }}>
              <MapPin className="h-4 w-4" />
              {t.kamerayiGoster}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
