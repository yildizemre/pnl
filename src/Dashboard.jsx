import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { menuFromPath, pathForMenu } from "./lib/routes";
import { usePageMeta } from "./hooks/usePageMeta";
import {
  Activity,
  Building,
  FileBarChart,
  Home,
  Lock,
  Package,
  Settings,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import HypeLogo from "./components/HypeLogo";
import { api } from "./api";
import { useAuth } from "./hooks/useAuth";
import { useLocale } from "./context/LocaleContext";
import { NAV_SECTIONS, PANEL_MODULES } from "./lib/modules";
import HeaderBar from "./components/HeaderBar";
import OnboardingTour from "./components/OnboardingTour";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useWebSocket } from "./hooks/useWebSocket";
import HomeView from "./views/HomeView";
import NotificationsView from "./views/NotificationsView";
import MesView from "./views/MesView";
import SayimView from "./views/SayimView";
import KpiStudioView from "./views/KpiStudioView";
import ReportsView from "./views/ReportsView";
import CameraHealthView from "./views/CameraHealthView";
import CompanyManagementView from "./views/CompanyManagementView";
import SettingsView from "./views/SettingsView";
import AdminUsersView from "./views/AdminUsersView";
import PageTransition from "./components/PageTransition";
import { DashboardSkeleton } from "./components/Skeleton";
import NotificationToast from "./components/notifications/NotificationToast";
import NotificationDetailModal from "./components/notifications/NotificationDetailModal";

const ICONS = {
  ana: Home,
  bildirimler: ShieldAlert,
  mes: TrendingUp,
  sayim: Package,
  kpi: Sparkles,
  raporlar: FileBarChart,
  kamera_sagligi: Activity,
  sirket: Building,
  uyelik: Users,
  ayarlar: Settings,
};

const VIEW_MAP = {
  ana: HomeView,
  bildirimler: NotificationsView,
  mes: MesView,
  sayim: SayimView,
  kpi: KpiStudioView,
  raporlar: ReportsView,
  kamera_sagligi: CameraHealthView,
  sirket: CompanyManagementView,
  uyelik: AdminUsersView,
  ayarlar: SettingsView,
};

const MENU_LABELS = {
  ana: "anaSayfa",
  bildirimler: "bildirimler",
  mes: "personel",
  sayim: "sayim",
  kpi: "kpiStudio",
  raporlar: "raporlar",
  kamera_sagligi: "kameraSagligi",
  sirket: "sirketYonetimi",
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
  const [lockToast, setLockToast] = useState("");
  const searchRef = useRef(null);
  const prevUserIdRef = useRef(null);

  const isAdmin = user?.rol === "admin" && !isImpersonating;

  const allowedModules = useMemo(() => {
    const list = (user?.moduller || ["ana", "bildirimler", "mes", "sayim", "kpi", "raporlar", "kamera_sagligi", "sirket", "uyelik", "ayarlar"]).filter(
      (id) => id !== "urun"
    );
    if (!list.includes("kamera_sagligi")) list.push("kamera_sagligi");
    if (!list.includes("sirket")) list.push("sirket");
    if (isAdmin && !list.includes("uyelik")) list.push("uyelik");
    return list;
  }, [user?.moduller, isAdmin]);

  const menu = useMemo(() => {
    const byId = Object.fromEntries(
      PANEL_MODULES.map((m) => [
        m.id,
        {
          id: m.id,
          label: t[MENU_LABELS[m.id]] || m.id,
          icon: ICONS[m.id] || Home,
          locked: !allowedModules.includes(m.id),
        },
      ])
    );
    if (isAdmin) {
      byId.uyelik = { id: "uyelik", label: t.uyelik, icon: Users, locked: false };
    }
    return byId;
  }, [allowedModules, isAdmin, t]);

  const menuSections = useMemo(() => {
    return NAV_SECTIONS.map((sec) => ({
      ...sec,
      label: sec.labelKey ? t[sec.labelKey] : null,
      items: sec.modules.map((id) => menu[id]).filter(Boolean),
    })).filter((sec) => sec.items.length > 0);
  }, [menu, t]);

  const navigate = useCallback(
    (id) => {
      if (id === "uyelik" && !isAdmin) return;
      if (!allowedModules.includes(id)) {
        setLockToast(t.erisimKisitli);
        window.setTimeout(() => setLockToast(""), 2200);
        return;
      }
      const path = pathForMenu(id);
      if (window.location.pathname !== path) {
        window.history.pushState({ menu: id }, "", path);
      }
      setActiveMenu(id);
      setSidebarOpen(false);
    },
    [allowedModules, isAdmin, t.erisimKisitli]
  );

  const loadData = useCallback(async () => {
    try {
      const res = await api.dashboardAll(compare && compare !== "hat" ? compare : undefined);
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
      sayim: t.sayim,
      kpi: t.kpiStudio,
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
    const item = menu[activeMenu];
    if (!item || item.locked) {
      navigate("ana");
    }
  }, [menu, activeMenu, navigate]);

  const View = VIEW_MAP[activeMenu];
  const current = menu[activeMenu] && !menu[activeMenu].locked ? menu[activeMenu] : null;
  const titles = {
    ana: { title: t.anaSayfa, sub: user?.kurulum || t.adminPanel },
    sayim: { title: t.sayim, sub: t.sayimAlt || "" },
    kpi: { title: t.kpiStudio, sub: t.kpiStudioAlt || "" },
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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: 'linear-gradient(180deg, #0B3C5D 0%, #071E2E 100%)',
          boxShadow: '4px 0 24px rgba(7, 30, 46, 0.4)',
        }}
      >
        <div className="relative w-full border-b border-white/10 px-5 py-5 text-center">
          <button
            type="button"
            className="absolute right-3 top-4 rounded-lg p-1 text-white/60 hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <HypeLogo centered className="h-8 w-auto max-w-[152px]" />
          <p className="mt-1 w-full text-center text-[9px] font-bold uppercase tracking-widest text-[#00BCD4]">
            AI ANALYTICS CORP
          </p>
        </div>
        <nav className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-3 py-4">
          {menuSections.map((sec) => (
            <div key={sec.id} className="space-y-1">
              {sec.label && (
                <div className="px-2 pt-2 pb-1">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/35">{sec.label}</span>
                </div>
              )}
              <div className="space-y-0.5">
                {sec.items.map(({ id, label, icon: Icon }) => {
                  const isActive = activeMenu === id;
                  const unreadBadge = id === "bildirimler"
                    ? (live?.unread ?? data?.summary?.bildirim_sayisi ?? 0)
                    : 0;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => navigate(id)}
                      className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-[#00BCD4]/15 text-white shadow-[inset_0_0_0_1px_rgba(0,188,212,0.3)]"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#00BCD4] rounded-r-full shadow-[0_0_8px_#00BCD4]" />
                      )}
                      <span style={{ color: isActive ? '#00BCD4' : 'rgba(255,255,255,0.6)' }}>
                        <Icon className="h-4 w-4 shrink-0" />
                      </span>
                      <span className="min-w-0 flex-1 text-left truncate">{label}</span>
                      {unreadBadge > 0 && (
                        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                          {unreadBadge > 9 ? "9+" : unreadBadge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4 text-center">
          <p className="font-serif italic text-white/80 text-sm tracking-wide mb-0.5 font-display">Hype-Vision Lab</p>
          <p className="text-[9px] text-[#00BCD4] font-bold tracking-widest uppercase">PLATFORM MODELİ</p>
          <p className="text-[10px] text-white/60 font-semibold mt-0.5">HypeVision v2.1 Pro</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        {lockToast && (
          <div className="lock-toast" role="status">
            <Lock className="h-3.5 w-3.5" />
            {lockToast}
          </div>
        )}
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
                  onNavigate={navigate}
                  onNotificationOpen={handleNotificationOpen}
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
