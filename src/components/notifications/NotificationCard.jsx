import { Image, Video } from "lucide-react";
import { mediaUrl } from "../../api";
import { useLocale } from "../../context/LocaleContext";
import { translateSeviye } from "../../i18n/helpers";
import { eventColor, eventLabel } from "../../data/notificationTypes";

export default function NotificationCard({ item, onClick }) {
  const { locale } = useLocale();
  const accent = eventColor(item.kategori);

  return (
    <button type="button" className="notif-card" onClick={() => onClick(item)}>
      <div className="notif-card-media">
        {item.gorsel ? (
          <img src={mediaUrl(item.gorsel)} alt="" loading="lazy" />
        ) : (
          <div className="notif-card-placeholder">
            <Image className="h-8 w-8" />
          </div>
        )}
        <span className="notif-card-cat" style={{ background: `${accent}dd` }}>
          {eventLabel(item.kategori, locale)}
        </span>
        <span className={`notif-card-sev notif-card-sev--${item.seviye}`}>
          {translateSeviye(locale, item.seviye)}
        </span>
        {!item.okundu && <span className="notif-card-unread" />}
      </div>
      <div className="notif-card-body">
        <p className="notif-card-title">{item.baslik}</p>
        <p className="notif-card-meta">
          <Video className="h-3 w-3 shrink-0" />
          <span className="truncate">{item.kamera}</span>
          <span className="notif-card-time">{item.zaman}</span>
        </p>
        <p className="notif-card-detay">{item.detay}</p>
      </div>
    </button>
  );
}
