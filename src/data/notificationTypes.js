import {
  AlertTriangle, Flame, Footprints, HardHat, ShieldBan, CloudFog, Factory,
  Package, Cpu, Bell, TrendingUp,
} from "lucide-react";

/** Müşteriye gösterilecek AI olay tipleri — kategori alanıyla eşleşir */
export const EVENT_TYPES = [
  { id: "Yangın", icon: Flame, color: "#ef4444", labelTr: "Yangın", labelEn: "Fire", descTr: "Alev / ısı tespiti", descEn: "Flame / heat detection" },
  { id: "Duman", icon: CloudFog, color: "#f97316", labelTr: "Duman", labelEn: "Smoke", descTr: "Duman yoğunluğu", descEn: "Smoke density" },
  { id: "Düşme", icon: Footprints, color: "#dc2626", labelTr: "Düşme", labelEn: "Fall", descTr: "Personel düşme", descEn: "Personnel fall" },
  { id: "İSG", icon: HardHat, color: "#f59e0b", labelTr: "İSG / KKD", labelEn: "HSE / PPE", descTr: "Baret, eldiven, yelek", descEn: "Hard hat, gloves, vest" },
  { id: "Yasak Bölge", icon: ShieldBan, color: "#8b5cf6", labelTr: "Yasak Bölge", labelEn: "Restricted Zone", descTr: "İhlal girişi", descEn: "Zone violation" },
  { id: "Üretim", icon: Factory, color: "#6366f1", labelTr: "Üretim", labelEn: "Production", descTr: "Hat / sayım", descEn: "Line / count" },
  { id: "MES", icon: TrendingUp, color: "#22c55e", labelTr: "MES", labelEn: "MES", descTr: "Verimlilik / vardiya", descEn: "Efficiency / shift" },
  { id: "Kalite", icon: Package, color: "#3b82f6", labelTr: "Kalite", labelEn: "Quality", descTr: "Kusur / ölçü", descEn: "Defect / measure" },
  { id: "Sistem", icon: Cpu, color: "#64748b", labelTr: "Sistem", labelEn: "System", descTr: "Kamera / AI", descEn: "Camera / AI" },
];

export function eventLabel(type, locale) {
  const row = EVENT_TYPES.find((x) => x.id === type);
  if (!row) return type;
  return locale === "EN" ? row.labelEn : row.labelTr;
}

export function eventIcon(type) {
  return EVENT_TYPES.find((x) => x.id === type)?.icon || Bell;
}

export function eventColor(type) {
  return EVENT_TYPES.find((x) => x.id === type)?.color || "#64748b";
}

export function countByEventType(notifications = []) {
  const counts = {};
  EVENT_TYPES.forEach((t) => { counts[t.id] = 0; });
  notifications.forEach((n) => {
    const k = n.kategori || "Sistem";
    counts[k] = (counts[k] || 0) + 1;
  });
  return counts;
}

export function kritikCount(notifications = []) {
  return notifications.filter((n) => n.seviye === "kritik" && !n.okundu).length;
}

export const SEVIYELER = ["kritik", "uyari", "bilgi"];

export const SEV_ICON = { kritik: AlertTriangle, uyari: AlertTriangle, bilgi: Bell };
