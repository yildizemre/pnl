/** API / demo verisindeki sabit Türkçe etiketleri locale'e çevirir */

const CAT_TR = {
  İSG: "İSG",
  Üretim: "Üretim",
  MES: "MES",
  Sistem: "Sistem",
  Kalite: "Kalite",
};

const CAT_EN = {
  İSG: "HSE",
  Üretim: "Production",
  MES: "MES",
  Sistem: "System",
  Kalite: "Quality",
};

const SEV_TR = { kritik: "Kritik", uyari: "Uyarı", bilgi: "Bilgi" };
const SEV_EN = { kritik: "Critical", uyari: "Warning", bilgi: "Info" };

const DURUM_TR = { optimum: "Optimum", iyi: "Good", dikkat: "Attention" };
const DURUM_EN = { optimum: "Optimum", iyi: "Good", dikkat: "Watch" };

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
