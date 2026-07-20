import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { menuFromPath, pathForMenu } from "./lib/routes";
import { usePageMeta } from "./hooks/usePageMeta";
import {
  FileBarChart,
  Home,
  Settings,
  ShieldAlert,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import HypeLogo from "./components/HypeLogo";
import { api } from "./api";
import { useAuth } from "./hooks/useAuth";
import { useLocale } from "./context/LocaleContext";
import HeaderBar from "./components/HeaderBar";
import OnboardingTour from "./components/OnboardingTour";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useWebSocket } from "./hooks/useWebSocket";
import HomeView from "./views/HomeView";
import NotificationsView from "./views/NotificationsView";
import MesView from "./views/MesView";
import ReportsView from "./views/ReportsView";
import SettingsView from "./views/SettingsView";
import AdminUsersView from "./views/AdminUsersView";
import PageTransition from "./components/PageTransition";
import { DashboardSkeleton } from "./components/Skeleton";
import NotificationToast from "./components/notifications/NotificationToast";
import NotificationDetailModal from "./components/notifications/NotificationDetailModal";

const ICONS = { ana: Home, bildirimler: ShieldAlert, mes: TrendingUp, raporlar: FileBarChart, uyelik: Users, ayarlar: Settings };

const VIEW_MAP = {
  ana: HomeView,
  bildirimler: NotificationsView,
  mes: MesView,
  raporlar: ReportsView,
  uyelik: AdminUsersView,
};

const MENU_LABELS = {
  ana: "anaSayfa",
  bildirimler: "bildirimler",
  mes: "personel",
  raporlar: "raporlar",
  uyelik: "uyelik",
  ayarlar: "ayarlar",
};

function isDbNotificationId(id) {
  return id != null && (typeof id === "number" || /^\d+$/.test(String(id)));
}

function normalizeNotification(item) {
  if (!item) return null;
  return {
    id: item.id,
    baslik: item.baslik || item.title || item.message || "",
    detay: item.detay || "",
    kamera: item.kamera || item.camera || "",
    zaman: item.zaman || item.time || "",
    tarih: item.tarih || "",
    kategori: item.kategori || "Sistem",
    seviye: item.seviye || item.severity || "bilgi",
    modul: item.modul || "",
    gorsel: item.gorsel || "",
    okundu: item.okundu,
    meta: item.meta || {},
    feedback: item.feedback || null,
  };
}

export default function Dashboard() {
  const { user, isImpersonating, exitImpersonation, setUser } = useAuth();
  const { t, locale } = useLocale();
  const [activeMenu, setActiveMenu] = useState(() => menuFromPath(window.location.pathname));
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [compare, setCompare] = useState("");
  const [live, setLive] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const [toastNotif, setToastNotif] = useState(null);
  const [popupNotif, setPopupNotif] = useState(null);
  const searchRef = useRef(null);
  const prevUserIdRef = useRef(null);

  const moduller = (user?.moduller || ["ana", "bildirimler", "mes", "raporlar", "ayarlar"]).filter((id) => id !== "urun");
  const isAdmin = user?.rol === "admin" && !isImpersonating;

  const menu = moduller
    .filter((id) => id !== "ayarlar" && (id !== "uyelik" || isAdmin))
    .map((id) => ({
      id,
      label: t[MENU_LABELS[id]] || id,
      icon: ICONS[id] || Home,
    }));

  const navigate = useCallback(
    (id) => {
      if (!moduller.includes(id) && id !== "uyelik") return;
      if (id === "uyelik" && !isAdmin) return;
      const path = pathForMenu(id);
      if (window.location.pathname !== path) {
        window.history.pushState({ menu: id }, "", path);
      }
      setActiveMenu(id);
      setSidebarOpen(false);
    },
    [moduller, isAdmin]
  );

  const loadData = useCallback(async () => {
    try {
      const res = await api.dashboardAll(compare || undefined);
      setData(res);
      if (res.summary) {
        setLive((l) => ({
          ...l,
          summary: res.summary,
          unread: res.summary.bildirim_sayisi,
          ai_aktif: res.system?.ai_aktif,
          system_health: res.system_health,
        }));
      }
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [compare]);

  const handleNotificationOpen = useCallback((item) => {
    const normalized = normalizeNotification(item);
    if (!normalized) return;
    setPopupNotif(normalized);

    if (!isDbNotificationId(normalized.id) || normalized.okundu) return;

    setData((d) => {
      if (!d) return d;
      const target = d.notifications?.find((n) => n.id === normalized.id);
      if (!target || target.okundu) return d;
      return {
        ...d,
        notifications: d.notifications.map((n) =>
          n.id === normalized.id ? { ...n, okundu: true } : n
        ),
        summary: d.summary
          ? { ...d.summary, bildirim_sayisi: Math.max(0, (d.summary.bildirim_sayisi || 0) - 1) }
          : d.summary,
      };
    });
    setLive((l) => ({
      ...l,
      unread: Math.max(0, (l?.unread ?? 0) - 1),
      summary: l?.summary
        ? { ...l.summary, bildirim_sayisi: Math.max(0, (l.summary.bildirim_sayisi || 0) - 1) }
        : l?.summary,
    }));
    api.markNotificationRead(normalized.id).catch(() => {});
  }, []);

  const handleNotificationUpdated = useCallback((updated) => {
    if (!updated?.id) return;
    setData((d) => {
      if (!d) return d;
      return {
        ...d,
        notifications: d.notifications.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)),
      };
    });
    setPopupNotif((p) => (p?.id === updated.id ? { ...p, ...updated } : p));
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData, user?.id]);

  useEffect(() => {
    if (user && !user.onboarding_done) setShowTour(true);
  }, [user?.id, user?.onboarding_done]);

  // Panele Git veya admin dönüşünde Ana Sayfa
  useEffect(() => {
    if (user?.id && prevUserIdRef.current && user.id !== prevUserIdRef.current) {
      navigate("ana");
    }
    prevUserIdRef.current = user?.id ?? null;
  }, [user?.id, navigate]);

  useEffect(() => {
    if (activeMenu === "uyelik" && !isAdmin) navigate("ana");
  }, [activeMenu, isAdmin, navigate]);

  useWebSocket((msg) => {
    if (msg.type === "dashboard_tick") {
      setLive({
        summary: msg.summary,
        unread: msg.unread,
        ai_aktif: msg.ai_aktif,
        system_health: msg.system_health,
      });
      setData((d) => (
        d
          ? {
              ...d,
              summary: msg.summary,
              system: { ...d.system, ai_aktif: msg.ai_aktif },
              system_health: msg.system_health || d.system_health,
            }
          : d
      ));
    }
    if (msg.type === "notification") {
      setLive((l) => ({ ...l, unread: msg.unread, summary: msg.summary || l?.summary }));
      setToastNotif(msg.item);
      if (msg.item?.gorsel) {
        setPopupNotif(msg.item);
      }
      loadData();
    }
  }, !!user);

  useKeyboardShortcuts({
    onSearch: () => searchRef.current?.focus(),
    onEscape: () => setSidebarOpen(false),
  });

  const breadcrumbItems = useMemo(() => {
    const labelMap = {
      ana: t.anaSayfa,
      ayarlar: t.ayarlar,
      uyelik: t.uyelik,
      bildirimler: t.bildirimler,
      mes: t.personel,
      raporlar: t.raporlar,
    };
    const items = [{ id: "ana", label: t.anaSayfa, onClick: () => navigate("ana") }];
    if (activeMenu !== "ana") {
      items.push({ id: activeMenu, label: labelMap[activeMenu] || activeMenu });
    }
    return items;
  }, [activeMenu, t, navigate]);

  const finishTour = async (done) => {
    setShowTour(false);
    if (done) {
      try {
        await api.savePreferences(user?.dashboard_layout || {}, true);
        setUser((u) => ({ ...u, onboarding_done: true }));
      } catch {
        /* demo */
      }
    }
  };

  const saveLayout = async (layout) => {
    await api.savePreferences(layout, user?.onboarding_done);
    setUser((u) => ({ ...u, dashboard_layout: layout }));
    loadData();
  };

  useEffect(() => {
    const onPop = () => setActiveMenu(menuFromPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  usePageMeta(activeMenu, t, locale);

  useEffect(() => {
    if (!menu.find((m) => m.id === activeMenu) && activeMenu !== "ayarlar") {
      navigate(menu[0]?.id || "ana");
    }
  }, [menu, activeMenu, navigate]);

  const View = VIEW_MAP[activeMenu];
  const current = menu.find((m) => m.id === activeMenu);
  const titles = {
    ana: { title: t.anaSayfa, sub: user?.kurulum || t.adminPanel },
    ayarlar: { title: t.ayarlar, sub: "" },
    uyelik: { title: t.uyelik, sub: "" },
  };
  const hdr = titles[activeMenu] || { title: current?.label || "", sub: "" };

  return (
    <div className="flex min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      <OnboardingTour open={showTour} onComplete={finishTour} />

      {sidebarOpen && (
        <button type="button" className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label={t.kapat} />
      )}

      <aside
        className={`sidebar-shell fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sidebar-brand relative w-full border-b border-[var(--border)] px-5 py-5">
          <button
            type="button"
            className="absolute right-3 top-4 rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <HypeLogo centered className="h-8 w-auto max-w-[152px]" />
          <p className="sidebar-tagline w-full text-center" lang="en">{t.sidebarTagline}</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-4 lg:px-3">
          {menu.map(({ id, label, icon: Icon }) => {
            const unreadBadge = id === "bildirimler" ? (live?.unread ?? data?.summary?.bildirim_sayisi ?? 0) : 0;
            return (
            <button
              key={id}
              type="button"
              onClick={() => navigate(id)}
              data-label={label}
              className={`nav-item flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                activeMenu === id ? "nav-active" : "text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-hover)]"
              }`}
            >
              <span className="relative shrink-0">
                <Icon className="h-4 w-4" />
                {unreadBadge > 0 && (
                  <span className="sidebar-badge">{unreadBadge > 9 ? "9+" : unreadBadge}</span>
                )}
              </span>
              {label}
            </button>
          );})}
          {moduller.includes("ayarlar") && (
            <button
              type="button"
              onClick={() => navigate("ayarlar")}
              data-label={t.ayarlar}
              className={`nav-item mt-3 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium ${
                activeMenu === "ayarlar" ? "nav-active" : "text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-hover)]"
              }`}
            >
              <Settings className="h-4 w-4" />
              {t.ayarlar}
            </button>
          )}
        </nav>
        <div className="border-t border-[var(--border)] p-3">
          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
            <span>{t.vocSysHealth}</span>
            <span className={
              (data?.system_health?.overall || live?.system_health?.overall) === "ok"
                ? "text-emerald-500 font-semibold"
                : (data?.system_health?.overall || live?.system_health?.overall) === "fail"
                  ? "text-red-500 font-semibold"
                  : "text-amber-500 font-semibold"
            }>
              {locale === "EN"
                ? (data?.system_health?.overallEn || live?.system_health?.overallEn || t.vocSysHealthOk)
                : (data?.system_health?.overallTr || live?.system_health?.overallTr || t.vocSysHealthOk)}
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        {isImpersonating && (
          <div className="flex items-center justify-between bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
            <span>{t.impersonating}: {user?.ad}</span>
            <button type="button" onClick={exitImpersonation} className="font-medium underline">{t.adminDon}</button>
          </div>
        )}

        <HeaderBar
          title={hdr.title}
          subtitle={hdr.sub}
          breadcrumb={breadcrumbItems}
          onMenuClick={() => setSidebarOpen(true)}
          onNavigate={navigate}
          onNotificationSelect={handleNotificationOpen}
          unread={data?.summary?.bildirim_sayisi ?? 0}
          liveSummary={live}
        />

        <main className="page-shell flex-1 space-y-4 p-3 sm:space-y-6 sm:p-6 lg:p-8">
          <input ref={searchRef} type="search" className="sr-only" tabIndex={-1} aria-hidden onFocus={(e) => { e.target.blur(); document.querySelector(".filter-bar input, main input[type=search]")?.focus(); }} />

          {loading && <DashboardSkeleton />}
          {error && !loading && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center text-red-500">
              {error}
              <p className="mt-2 text-xs">{t.apiHataIpucu}</p>
            </div>
          )}
          {data && !loading && (
            <PageTransition pageKey={activeMenu}>
              {activeMenu === "ayarlar" && <SettingsView onRefresh={loadData} />}
              {activeMenu === "ana" && (
                <HomeView
                  data={data}
                  compare={compare}
                  onCompareChange={setCompare}
                />
              )}
              {activeMenu === "bildirimler" && (
                <NotificationsView data={data} onNotificationUpdated={handleNotificationUpdated} onRefresh={loadData} />
              )}
              {View && activeMenu !== "ayarlar" && activeMenu !== "ana" && activeMenu !== "bildirimler" && (
                <View data={data} onRefresh={loadData} />
              )}
            </PageTransition>
          )}
        </main>
      </div>

      <NotificationToast
        item={toastNotif}
        onClose={() => setToastNotif(null)}
        onOpen={(item) => {
          setToastNotif(null);
          handleNotificationOpen(item);
        }}
      />
      {popupNotif && (
        <NotificationDetailModal
          item={popupNotif}
          subtitle={user?.kurulum}
          onClose={() => setPopupNotif(null)}
          onUpdated={handleNotificationUpdated}
        />
      )}
    </div>
  );
}
