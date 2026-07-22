/** Panel sayfa yolları — URL ile menü senkronu */

export const PAGE_ROUTES = {
  ana: { path: "/", titleKey: "anaSayfa" },
  bildirimler: { path: "/notifications", titleKey: "bildirimler" },
  mes: { path: "/mes", titleKey: "personel" },
  sayim: { path: "/sayim", titleKey: "sayim" },
  kpi: { path: "/kpi", titleKey: "kpiStudio" },
  urun: { path: "/products", titleKey: "urun" },
  raporlar: { path: "/reports", titleKey: "raporlar" },
  kamera_sagligi: { path: "/kamera-sagligi", titleKey: "kameraSagligi" },
  sirket: { path: "/sirket", titleKey: "sirketYonetimi" },
  uyelik: { path: "/users", titleKey: "uyelik" },
  ayarlar: { path: "/settings", titleKey: "ayarlar" },
};

const PATH_TO_MENU = Object.fromEntries(
  Object.entries(PAGE_ROUTES).map(([id, r]) => [r.path, id])
);

export function menuFromPath(pathname) {
  const p = pathname.replace(/\/$/, "") || "/";
  return PATH_TO_MENU[p] || "ana";
}

export function pathForMenu(menuId) {
  return PAGE_ROUTES[menuId]?.path || "/";
}
