import { useCallback, useEffect, useRef, useState } from "react";
import { menuFromPath, pathForMenu } from "./lib/routes";
import { usePageMeta } from "./hooks/usePageMeta";
import {
  Bell,
  FileBarChart,
  Home,
  Package,
  Settings,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import HypeLogo from "./components/HypeLogo";
import { api } from "./api";
import { useAuth } from "./context/AuthContext";
import { useLocale } from "./context/LocaleContext";
import HeaderBar from "./components/HeaderBar";
import OnboardingTour from "./components/OnboardingTour";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useWebSocket } from "./hooks/useWebSocket";
import HomeView from "./views/HomeView";
import NotificationsView from "./views/NotificationsView";
import MesView from "./views/MesView";
import ProductView from "./views/ProductView";
import ReportsView from "./views/ReportsView";
import SettingsView from "./views/SettingsView";
import AdminUsersView from "./views/AdminUsersView";

const ICONS = { ana: Home, bildirimler: Bell, mes: TrendingUp, urun: Package, raporlar: FileBarChart, uyelik: Users, ayarlar: Settings };

const VIEW_MAP = {
  ana: HomeView,
  bildirimler: NotificationsView,
  mes: MesView,
  urun: ProductView,
  raporlar: ReportsView,
  uyelik: AdminUsersView,
};

const MENU_LABELS = {
  ana: "anaSayfa",
  bildirimler: "bildirimler",
  mes: "personel",
  urun: "urun",
  raporlar: "raporlar",
  uyelik: "uyelik",
  ayarlar: "ayarlar",
};

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
  const searchRef = useRef(null);
  const prevUserIdRef = useRef(null);

  const moduller = user?.moduller || ["ana", "bildirimler", "mes", "urun", "raporlar", "ayarlar"];
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
      if (res.summary) setLive((l) => ({ ...l, summary: res.summary, unread: res.summary.bildirim_sayisi, ai_aktif: res.system?.ai_aktif }));
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [compare]);

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
      setLive({ summary: msg.summary, unread: msg.unread, ai_aktif: msg.ai_aktif });
      setData((d) => (d ? { ...d, summary: msg.summary, system: { ...d.system, ai_aktif: msg.ai_aktif } } : d));
    }
    if (msg.type === "notification") {
      setLive((l) => ({ ...l, unread: msg.unread }));
      loadData();
    }
  }, !!user);

  useKeyboardShortcuts({
    onSearch: () => searchRef.current?.focus(),
    onEscape: () => setSidebarOpen(false),
  });

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

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)] transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="sidebar-brand relative w-full border-b border-[var(--border)] px-5 py-5">
          <button
            type="button"
            className="absolute right-3 top-4 rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <HypeLogo centered className="h-8 w-auto max-w-[152px]" />
          <p className="sidebar-tagline w-full text-center">{t.sidebarTagline}</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {menu.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => navigate(id)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                activeMenu === id ? "nav-active bg-sky-500/15 text-sky-500 border-sky-500/30" : "text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-hover)]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
          {moduller.includes("ayarlar") && (
            <button
              type="button"
              onClick={() => navigate("ayarlar")}
              className={`mt-3 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium ${
                activeMenu === "ayarlar" ? "nav-active bg-sky-500/15 text-sky-500 border-sky-500/30" : "text-[var(--text-muted)] border-transparent"
              }`}
            >
              <Settings className="h-4 w-4" />
              {t.ayarlar}
            </button>
          )}
        </nav>
        {user?.kurulum && (
          <div className="border-t border-[var(--border)] px-5 py-3">
            <p className="truncate text-center text-[11px] text-[var(--text-muted)]">{user.kurulum}</p>
          </div>
        )}
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
          onMenuClick={() => setSidebarOpen(true)}
          onNavigate={navigate}
          unread={data?.summary?.bildirim_sayisi ?? 0}
          liveSummary={live}
        />

        <main className="page-shell flex-1 space-y-4 p-3 sm:space-y-6 sm:p-6 lg:p-8">
          <input ref={searchRef} type="search" className="sr-only" tabIndex={-1} aria-hidden onFocus={(e) => { e.target.blur(); document.querySelector(".filter-bar input, main input[type=search]")?.focus(); }} />

          {loading && (
            <div className="flex h-64 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            </div>
          )}
          {error && !loading && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center text-red-500">
              {error}
              <p className="mt-2 text-xs">{t.apiHataIpucu}</p>
            </div>
          )}
          {data && !loading && activeMenu === "ayarlar" && <SettingsView />}
          {data && !loading && activeMenu === "ana" && (
            <HomeView data={data} compare={compare} onCompareChange={setCompare} onLayoutSave={saveLayout} />
          )}
          {data && !loading && View && activeMenu !== "ayarlar" && activeMenu !== "ana" && (
            <View data={data} onRefresh={loadData} />
          )}
        </main>
      </div>
    </div>
  );
}
