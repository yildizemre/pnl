/** API / demo verisindeki sabit Türkçe etiketleri locale'e çevirir */

const CAT_TR = {
  Yangın: "Yangın",
  Duman: "Duman",
  Düşme: "Düşme",
  İSG: "İSG",
  "Yasak Bölge": "Yasak Bölge",
  Üretim: "Üretim",
  MES: "MES",
  Sistem: "Sistem",
  Kalite: "Kalite",
};

const CAT_EN = {
  Yangın: "Fire",
  Duman: "Smoke",
  Düşme: "Fall",
  İSG: "HSE / PPE",
  "Yasak Bölge": "Restricted Zone",
  Üretim: "Production",
  MES: "MES",
  Sistem: "System",
  Kalite: "Quality",
};

const SEV_TR = { kritik: "Kritik", uyari: "Uyarı", bilgi: "Bilgi" };
const SEV_EN = { kritik: "Critical", uyari: "Warning", bilgi: "Info" };

const DURUM_TR = { optimum: "Optimum", iyi: "İyi", dikkat: "Dikkat", verimli: "Verimli", verimsiz: "Verimsiz" };
const DURUM_EN = { optimum: "Optimum", iyi: "Good", dikkat: "Watch", verimli: "Efficient", verimsiz: "Inefficient" };

export function translateCategory(locale, value) {
  const m = locale === "EN" ? CAT_EN : CAT_TR;
  return m[value] ?? value;
}

export function translateSeviye(locale, value) {
  const m = locale === "EN" ? SEV_EN : SEV_TR;
  return m[value] ?? value;
}

export function translateDurum(locale, value) {
  const m = locale === "EN" ? DURUM_EN : DURUM_TR;
  return m[value] ?? value;
}

export function localeTag(locale) {
  return locale === "EN" ? "en-GB" : "tr-TR";
}
