import { Clock, MapPin, Video } from "lucide-react";
import { mediaUrl } from "../../api";
import { useLocale } from "../../context/LocaleContext";
import { translateSeviye } from "../../i18n/helpers";
import { eventColor, eventLabel } from "../../data/notificationTypes";

/** Dakika cinsinden açık kalma süresi (okunmamış) veya kapalı etiketi */
export function openDurationMinutes(item) {
  if (item.okundu) return null;
  const raw = item.created_at || (item.tarih && item.zaman ? `${item.tarih}T${item.zaman}` : null);
  if (!raw) return null;
  const ts = Date.parse(raw.length === 16 ? `${raw}:00` : raw);
  if (Number.isNaN(ts)) return null;
  return Math.max(0, Math.round((Date.now() - ts) / 60000));
}

function formatDuration(mins, t) {
  if (mins == null) return t.isgKapandi;
  if (mins < 60) return `${mins} ${t.dk}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}${t.saatKisalt} ${m}${t.dk}` : `${h}${t.saatKisalt}`;
}

export default function NotificationCard({ item, onClick }) {
  const { t, locale } = useLocale();
  const accent = eventColor(item.kategori);
  const mins = openDurationMinutes(item);
  const loc = item.alan || item.meta?.alan || item.kamera || "—";

  return (
    <button type="button" className={`notif-card ${!item.okundu ? "notif-card--open" : ""}`} onClick={() => onClick(item)}>
      <div className="notif-card-media">
        {item.gorsel ? (
          <img src={mediaUrl(item.gorsel)} alt="" loading="lazy" />
        ) : (
          <div className="notif-card-placeholder">
            <Video className="h-8 w-8" />
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
        <div className="notif-card-row">
          <span className="notif-card-chip">
            <Video className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.kamera || "—"}</span>
          </span>
          <span className="notif-card-chip">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{loc}</span>
          </span>
          <span className={`notif-card-chip ${mins != null ? "notif-card-chip--warn" : ""}`}>
            <Clock className="h-3 w-3 shrink-0" />
            <span>{formatDuration(mins, t)}</span>
          </span>
        </div>
        <p className="notif-card-detay">{item.detay}</p>
      </div>
    </button>
  );
}
