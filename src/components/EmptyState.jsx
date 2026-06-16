import { BarChart3, Inbox } from "lucide-react";

export default function EmptyState({ title, subtitle, icon: Icon = Inbox }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon className="h-8 w-8" />
        <svg className="empty-state-ring" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 8" opacity="0.35" />
        </svg>
      </div>
      <p className="empty-state-title">{title}</p>
      {subtitle && <p className="empty-state-sub">{subtitle}</p>}
    </div>
  );
}

export function EmptyChart({ title, subtitle }) {
  return <EmptyState title={title} subtitle={subtitle} icon={BarChart3} />;
}
