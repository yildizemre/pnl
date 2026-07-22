/** Panel menüleri — admin yetki checkbox + sidebar */

export const NAV_SECTIONS = [
  {
    id: "overview",
    labelKey: null,
    modules: ["ana"],
  },
  {
    id: "isg",
    labelKey: "navSectionIsg",
    modules: ["bildirimler"],
  },
  {
    id: "mes",
    labelKey: "navSectionMes",
    modules: ["mes"],
  },
  {
    id: "verimlilik",
    labelKey: "navSectionVerimlilik",
    modules: ["sayim"],
  },
  {
    id: "kpi",
    labelKey: "navSectionKpi",
    modules: ["kpi"],
  },
  {
    id: "raporlar",
    labelKey: "navSectionRaporlar",
    modules: ["raporlar", "kamera_sagligi"],
  },
  {
    id: "hesap",
    labelKey: "navSectionHesap",
    modules: ["sirket", "uyelik", "ayarlar"],
  },
];

export const PANEL_MODULES = [
  { id: "ana", labelKey: "modAna", locked: true },
  { id: "bildirimler", labelKey: "modBildirimler", locked: false },
  { id: "mes", labelKey: "modMes", locked: false },
  { id: "sayim", labelKey: "modSayim", locked: false },
  { id: "kpi", labelKey: "modKpi", locked: false },
  { id: "raporlar", labelKey: "modRaporlar", locked: false },
  { id: "kamera_sagligi", labelKey: "modKameraSagligi", locked: false },
  { id: "sirket", labelKey: "modSirket", locked: false },
  { id: "uyelik", labelKey: "modUyelik", locked: false },
  { id: "ayarlar", labelKey: "modAyarlar", locked: false },
];

export const DEFAULT_USER_MODULES = ["ana", "bildirimler", "mes", "sayim", "kpi", "raporlar", "ayarlar"];

export function modulesForRole(rol) {
  const map = {
    admin: ["ana", "bildirimler", "mes", "sayim", "kpi", "raporlar", "ayarlar"],
    isg: ["ana", "bildirimler", "kpi", "raporlar", "ayarlar"],
    uretim_muduru: ["ana", "mes", "sayim", "kpi", "raporlar", "ayarlar"],
    operator: ["ana", "bildirimler", "ayarlar"],
    user: DEFAULT_USER_MODULES,
  };
  return [...(map[rol] || map.user)];
}
