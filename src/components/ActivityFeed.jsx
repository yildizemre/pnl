import { Activity, Bell, Package, ShieldAlert, TrendingUp } from "lucide-react";

const TYPE_ICON = {
  isg: ShieldAlert,
  sayim: Package,
  mes: TrendingUp,
  urun: Package,
  bildirim: Bell,
};

export default function ActivityFeed({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="activity-feed">
      {items.map((item, idx) => {
        const Icon = TYPE_ICON[item.type] || Activity;
        return (
          <div key={item.id} className="activity-item">
            <div className="activity-rail">
              <span className="activity-dot" />
              {idx < items.length - 1 && <span className="activity-line" />}
            </div>
            <div className="activity-body">
              <div className="activity-meta">
                <span className="activity-time">{item.time}</span>
                <span className="activity-cam">{item.camera}</span>
              </div>
              <p className="activity-title">
                <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
                {item.title}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
