import { ChevronRight, Home } from "lucide-react";

export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.id || i} className="breadcrumb-item">
              {i > 0 && <ChevronRight className="breadcrumb-sep h-3.5 w-3.5" />}
              {item.onClick && !last ? (
                <button type="button" onClick={item.onClick} className="breadcrumb-link">
                  {i === 0 && <Home className="h-3.5 w-3.5" />}
                  {item.label}
                </button>
              ) : (
                <span className={`breadcrumb-current ${last ? "breadcrumb-current--active" : ""}`}>
                  {i === 0 && <Home className="h-3.5 w-3.5" />}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
