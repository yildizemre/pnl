import { useEffect, useRef, useState } from "react";
import { Bell, LogOut, Menu, Moon, Sun } from "lucide-react";
import { api, mediaUrl } from "../api";
import { useAuth } from "../hooks/useAuth";
import { useLocale } from "../context/LocaleContext";
import { translateSeviye } from "../i18n/helpers";
import { ROLE_LABELS_EN, ROLE_LABELS_TR } from "../lib/roles";
import { useTheme } from "../context/ThemeContext";
import Breadcrumb from "./Breadcrumb";
import { StatusBadge } from "./ui";

export default function HeaderBar({
  title,
  subtitle,
  breadcrumb = [],
  onMenuClick,
  onNavigate,
  onNotificationSelect,
  unread,
  liveSummary,
}) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const [now, setNow] = useState(new Date());
  const [aiAktif, setAiAktif] = useState(false);
  const [recent, setRecent] = useState([]);
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const ref = useRef(null);

  const initials = (user?.ad || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const rol = user?.rol || "user";
  const roleLabel = (locale === "EN" ? ROLE_LABELS_EN : ROLE_LABELS_TR)[rol] || t.user;

  useEffect(() => {
    if (liveSummary?.ai_aktif != null) setAiAktif(liveSummary.ai_aktif);
  }, [liveSummary]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const load = () => {
      if (liveSummary?.ai_aktif == null) {
        api.systemStatus().then((s) => setAiAktif(s.ai_aktif)).catch(() => setAiAktif(false));
      }
      api.recentNotifications(10).then((r) => setRecent(r.data)).catch(() => {});
    };
    load();
    const id = setInterval(() => {
      api.heartbeat().catch(() => {});
      load();
    }, 60000);
    api.heartbeat().catch(() => {});
    return () => clearInterval(id);
  }, [liveSummary]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const dateStr = now.toLocaleDateString(locale === "EN" ? "en-GB" : "tr-TR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString(locale === "EN" ? "en-GB" : "tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const displayUnread = liveSummary?.unread ?? unread;

  return (
    <header className={`header-bar sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg-header)] ${compact ? "header-bar--compact" : ""}`}>
      <div className="header-bar-inner px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="lg:hidden shrink-0 rounded-xl border border-[var(--border)] p-2 text-[var(--text-muted)]"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h2 className="header-title truncate text-base font-semibold text-[var(--text-primary)] sm:text-lg">{title}</h2>
              {subtitle && !compact && <p className="truncate text-xs text-[var(--text-muted)]">{subtitle}</p>}
              {!compact && <Breadcrumb items={breadcrumb} />}
            </div>
          </div>

          <div className="flex max-w-[55%] shrink-0 flex-wrap items-center justify-end gap-1 sm:max-w-none sm:gap-2">
            <div className="hidden items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-0.5 md:flex">
              {["TR", "EN"].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocale(l)}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                    locale === l ? "bg-[var(--accent-bg)] text-[var(--accent)]" : "text-[var(--text-muted)]"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <span className="hidden text-[11px] tabular-nums text-[var(--text-muted)] xl:inline">
              {dateStr} · {timeStr}
            </span>

            <span
              className={`ai-status-pill hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold sm:inline-flex ${
                aiAktif ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-500" : "border-amber-500/35 bg-amber-500/10 text-amber-500"
              }`}
            >
              <span className={`ai-status-dot h-2 w-2 rounded-full ${aiAktif ? "bg-emerald-500" : "bg-amber-500"}`} />
              {aiAktif ? t.aiAktif : t.aiPasif}
            </span>

            <div className="relative" ref={ref}>
              <button
                type="button"
                onClick={() => setOpen(!open)}
                className="relative rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                <Bell className="h-[18px] w-[18px]" />
                {displayUnread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {displayUnread > 9 ? "9+" : displayUnread}
                  </span>
                )}
              </button>
              {open && (
                <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl">
                  <div className="border-b border-[var(--border)] bg-[var(--bg-table-head)] px-4 py-3">
                    <p className="font-semibold">{t.sonBildirimler}</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {recent.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">—</p>
                    ) : (
                      recent.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          className="flex w-full gap-3 border-b border-[var(--border)] px-4 py-3 text-left hover:bg-[var(--bg-hover)]"
                          onClick={() => {
                            setOpen(false);
                            onNotificationSelect?.(n);
                          }}
                        >
                          <div className="h-10 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-page)]">
                            {n.gorsel ? (
                              <img src={mediaUrl(n.gorsel)} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] text-[var(--text-muted)]">AI</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{n.baslik}</p>
                            <p className="text-xs text-[var(--text-muted)]">{n.kamera}</p>
                            <StatusBadge variant={n.seviye}>{translateSeviye(locale, n.seviye)}</StatusBadge>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <button type="button" onClick={() => { setOpen(false); onNavigate?.("bildirimler"); }} className="w-full py-2.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--bg-hover)]">
                    {t.tumunuGor}
                  </button>
                </div>
              )}
            </div>

            <button type="button" onClick={toggle} className="rounded-xl border border-[var(--border)] p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label={t.tema}>
              {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>

            <div className="user-chip flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-1.5 pl-1.5 pr-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-muted)]">
                {initials}
              </div>
              <div className="hidden min-w-0 sm:block leading-tight">
                <p className="truncate max-w-[100px] text-sm font-medium text-[var(--text-primary)] lg:max-w-[140px]">
                  {user?.ad}
                </p>
                <p className="truncate text-[11px] text-[var(--text-muted)]">{roleLabel}</p>
              </div>
              <button type="button" onClick={logout} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-500" title={t.cikis}>
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
