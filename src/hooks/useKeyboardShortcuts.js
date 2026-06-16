import { useEffect } from "react";

export function useKeyboardShortcuts({ onSearch, onEscape, onCommandPalette, enabled = true }) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onCommandPalette?.();
        return;
      }

      if (e.key === "Escape") {
        onEscape?.();
        return;
      }

      if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onSearch?.();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSearch, onEscape, onCommandPalette, enabled]);
}
