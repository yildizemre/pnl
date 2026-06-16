import { Ban, Eye, Gauge, Hand, HardHat, Package, ShieldAlert, Truck, Users } from "lucide-react";

export const TRACKING_RULES = {
  hard_hat: { id: "hard_hat", icon: HardHat, labelTr: "Baret", labelEn: "Hard hat" },
  gloves: { id: "gloves", icon: Hand, labelTr: "Eldiven", labelEn: "Gloves" },
  speed_limit: { id: "speed_limit", icon: Gauge, labelTr: "Hız limiti", labelEn: "Speed limit" },
  ppe_zone: { id: "ppe_zone", icon: ShieldAlert, labelTr: "KKD bölgesi", labelEn: "PPE zone" },
  person_count: { id: "person_count", icon: Users, labelTr: "Kişi sayımı", labelEn: "Headcount" },
  product_count: { id: "product_count", icon: Package, labelTr: "Ürün sayımı", labelEn: "Product count" },
  restricted: { id: "restricted", icon: Ban, labelTr: "Yasak bölge", labelEn: "Restricted zone" },
  vehicle: { id: "vehicle", icon: Truck, labelTr: "Araç takibi", labelEn: "Vehicle track" },
  line_efficiency: { id: "line_efficiency", icon: Eye, labelTr: "Hat verimi", labelEn: "Line efficiency" },
};

const MODULE_RULES = {
  isg: ["hard_hat", "gloves", "ppe_zone", "restricted"],
  sayim: ["person_count", "product_count"],
  urun: ["product_count", "vehicle"],
  mes: ["person_count", "line_efficiency"],
  genel: ["person_count", "hard_hat"],
};

const ZONE_CYCLE = ["hat-a", "hat-b", "isg", "paket", "depo", "giris", "soguk", "ofis"];

const EXTRA_BY_INDEX = [
  ["speed_limit"],
  [],
  ["gloves"],
  ["vehicle"],
  ["restricted"],
  [],
  ["line_efficiency"],
  ["hard_hat"],
];

export function getRulesForModules(modules = []) {
  const ids = new Set();
  for (const mod of modules) {
    for (const id of MODULE_RULES[mod] || MODULE_RULES.genel) {
      ids.add(id);
    }
  }
  return [...ids].map((id) => TRACKING_RULES[id]).filter(Boolean);
}

export function getCameraRules(cam, index = 0) {
  const mod = cam?.modul || "genel";
  const base = MODULE_RULES[mod] || MODULE_RULES.genel;
  const extra = EXTRA_BY_INDEX[index % EXTRA_BY_INDEX.length] || [];
  return [...new Set([...base, ...extra])]
    .map((id) => TRACKING_RULES[id])
    .filter(Boolean);
}

export function getCameraZone(index = 0) {
  return ZONE_CYCLE[index % ZONE_CYCLE.length];
}

export function ruleLabel(rule, locale) {
  return locale === "EN" ? rule.labelEn : rule.labelTr;
}
