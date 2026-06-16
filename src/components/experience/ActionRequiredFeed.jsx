import { AlertTriangle, ChevronRight } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";

const SEV_CLASS = {
  kritik: "action-feed-item--kritik",
  uyari: "action-feed-item--uyari",
  bilgi: "action-feed-item--bilgi",
};

export default function ActionRequiredFeed({ items = [], onSelect }) {
  const { t } = useLocale();

  return (
    <aside className="action-feed">
      <div className="action-feed-header">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <div>
          <h4>{t.aksiyonGerektiren}</h4>
          <p>{t.aksiyonGerektirenAlt}</p>
        </div>
      </div>
      <div className="action-feed-list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`action-feed-item ${SEV_CLASS[item.severity] || "action-feed-item--uyari"}`}
            onClick={() => onSelect?.(item)}
          >
            <div className="action-feed-item-top">
              <span className="action-feed-time">{item.time}</span>
              {item.camera && <span className="action-feed-cam">{item.camera}</span>}
            </div>
            <p className="action-feed-msg">{item.message}</p>
            {item.actionLabel && (
              <span className="action-feed-cta">
                {item.actionLabel}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}
