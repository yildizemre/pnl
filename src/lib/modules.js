/** Panel menüleri — admin yetki checkbox + sidebar */
export const PANEL_MODULES = [
  { id: "ana", labelKey: "modAna", locked: true },
  { id: "bildirimler", labelKey: "modBildirimler", locked: false },
  { id: "mes", labelKey: "modMes", locked: false },
  { id: "raporlar", labelKey: "modRaporlar", locked: false },
  { id: "ayarlar", labelKey: "modAyarlar", locked: false },
];

export const DEFAULT_USER_MODULES = ["ana", "bildirimler", "mes", "raporlar", "ayarlar"];

export function modulesForRole(rol) {
  const map = {
    admin: ["ana", "bildirimler", "mes", "raporlar", "ayarlar"],
    isg: ["ana", "bildirimler", "raporlar", "ayarlar"],
    uretim_muduru: ["ana", "mes", "raporlar", "ayarlar"],
    operator: ["ana", "bildirimler", "ayarlar"],
    user: DEFAULT_USER_MODULES,
  };
  return [...(map[rol] || map.user)];
}
