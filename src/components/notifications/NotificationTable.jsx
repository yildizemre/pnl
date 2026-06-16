import { Image } from "lucide-react";
import { mediaUrl } from "../../api";
import { useLocale } from "../../context/LocaleContext";
import { translateSeviye } from "../../i18n/helpers";
import { eventColor, eventLabel } from "../../data/notificationTypes";
import { formatGuven } from "../../lib/notificationMeta";
import { DataTable, StatusBadge } from "../ui";
import NotificationFeedback from "./NotificationFeedback";

export default function NotificationTable({ items = [], onSelect, onUpdated }) {
  const { t, locale } = useLocale();

  return (
    <DataTable minWidth="960px">
      <thead>
        <tr>
          <th>{t.gorsel}</th>
          <th>{t.tarih}</th>
          <th>{t.zaman}</th>
          <th>{t.kategori}</th>
          <th>{t.baslik}</th>
          <th>{t.kameraAlan}</th>
          <th>{t.seviye}</th>
          <th>{t.dogruluk}</th>
          <th>{t.dogrulama}</th>
          <th>{t.durum}</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr className="empty-row">
            <td colSpan={10}>{t.bildirimBulunamadi}</td>
          </tr>
        ) : (
          items.map((item) => (
            <tr
              key={item.id}
              className={`notif-table-row ${!item.okundu ? "notif-table-row--unread" : ""}`}
              onClick={() => onSelect?.(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect?.(item);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <td>
                <div className="notif-table-thumb">
                  {item.gorsel ? (
                    <img src={mediaUrl(item.gorsel)} alt="" loading="lazy" />
                  ) : (
                    <span className="notif-table-thumb-placeholder">
                      <Image className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </td>
              <td className="whitespace-nowrap text-[var(--text-muted)]">{item.tarih}</td>
              <td className="whitespace-nowrap font-mono text-xs">{item.zaman}</td>
              <td>
                <span className="notif-table-cat" style={{ color: eventColor(item.kategori) }}>
                  {eventLabel(item.kategori, locale)}
                </span>
              </td>
              <td className="notif-table-title-cell">
                <span className="font-medium">{item.baslik}</span>
                <p className="notif-table-detay">{item.detay}</p>
              </td>
              <td className="text-[var(--text-muted)]">{item.kamera}</td>
              <td>
                <StatusBadge variant={item.seviye}>{translateSeviye(locale, item.seviye)}</StatusBadge>
              </td>
              <td className="text-xs font-mono text-[var(--text-muted)]">
                {formatGuven(item.meta?.guven) || "—"}
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                <NotificationFeedback item={item} onUpdated={onUpdated} compact />
              </td>
              <td>
                {!item.okundu ? (
                  <span className="notif-table-dot" title={t.okunmamis} aria-label={t.okunmamis} />
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">—</span>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </DataTable>
  );
}
