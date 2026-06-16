import { useEffect, useMemo, useRef, useState } from "react";
import { Command, Moon, Search, Sun, Languages } from "lucide-react";
import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";

export default function CommandPalette({ open, onClose, menu = [], onNavigate }) {
  const { t, locale, setLocale } = useLocale();
  const { theme, toggle } = useTheme();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);

  const actions = useMemo(() => {
    const pages = menu.map((m) => ({
      id: `nav-${m.id}`,
      label: m.label,
      group: t.komutSayfalar,
      icon: m.icon,
      run: () => onNavigate?.(m.id),
    }));
    const cmds = [
      {
        id: "theme",
        label: t.cmdTema,
        group: t.ayarlar,
        icon: theme === "dark" ? Sun : Moon,
        run: toggle,
      },
      {
        id: "lang-tr",
        label: "Türkçe",
        group: t.cmdDil,
        icon: Languages,
        run: () => setLocale("TR"),
      },
      {
        id: "lang-en",
        label: "English",
        group: t.cmdDil,
        icon: Languages,
        run: () => setLocale("EN"),
      },
    ];
    return [...pages, ...cmds];
  }, [menu, onNavigate, t, theme, toggle, setLocale]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(s) || a.group.toLowerCase().includes(s));
  }, [actions, q]);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    setIdx(0);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && filtered[idx]) {
        e.preventDefault();
        filtered[idx].run();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, idx, onClose]);

  if (!open) return null;

  return (
    <div className="cmd-palette-backdrop" onClick={onClose} role="presentation">
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="cmd-palette-input-wrap">
          <Search className="h-4 w-4 text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.komutAra}
            className="cmd-palette-input"
          />
          <kbd className="cmd-kbd">esc</kbd>
        </div>
        <ul className="cmd-palette-list">
          {filtered.length === 0 ? (
            <li className="cmd-palette-empty">—</li>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.icon || Command;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`cmd-palette-item ${i === idx ? "cmd-palette-item--active" : ""}`}
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => {
                      item.run();
                      onClose();
                    }}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-cyan-500" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{item.group}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <div className="cmd-palette-footer">
          <span>↑↓ {locale === "EN" ? "navigate" : "gezin"}</span>
          <span>↵ {locale === "EN" ? "select" : "seç"}</span>
          <span className="ml-auto">{t.cmdKisayol}</span>
        </div>
      </div>
    </div>
  );
}
