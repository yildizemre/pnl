import { FLOOR_ZONES } from "./facilityZones";

const SEV_RANK = { kritik: 0, uyari: 1, bilgi: 2, normal: 3, basari: 4 };

function zoneName(zoneId, locale) {
  const z = FLOOR_ZONES.find((x) => x.id === zoneId);
  if (!z) return zoneId;
  return locale === "EN" ? z.labelEn : z.labelTr;
}

function actionableFromNotification(n, locale, index) {
  const zones = ["hat-a", "hat-b", "isg", "paket", "depo", "giris"];
  const zoneId = zones[index % zones.length];
  const sev = n.seviye || "uyari";
  const en = locale === "EN";

  if (n.kategori === "isg" || sev === "kritik") {
    return {
      id: n.id ?? `act-n-${index}`,
      severity: sev === "bilgi" ? "uyari" : sev,
      zoneId,
      time: n.zaman || (en ? "now" : "şimdi"),
      message: en
        ? `${zoneName(zoneId, locale)}: PPE violation detected — intervene`
        : `${zoneName(zoneId, locale)}: KKD ihlali tespit edildi, müdahale et`,
      camera: n.kamera,
      gorsel: n.gorsel,
      detay: n.detay || n.baslik,
    };
  }

  if (n.kategori === "mes" || n.kategori === "verim") {
    return {
      id: n.id ?? `act-n-${index}`,
      severity: "uyari",
      zoneId: zoneId === "hat-a" ? "hat-b" : "hat-a",
      time: n.zaman || "—",
      message: en
        ? `Production line B: efficiency drop right now — intervene`
        : `Üretim hattı B'de şu an verim düşüşü var, müdahale et`,
      camera: n.kamera,
      gorsel: n.gorsel,
      detay: n.baslik,
    };
  }

  return {
    id: n.id ?? `act-n-${index}`,
    severity: sev,
    zoneId,
    time: n.zaman || "—",
    message: n.baslik || (en ? "Action required" : "Aksiyon gerekli"),
    camera: n.kamera,
    gorsel: n.gorsel,
    detay: n.detay,
  };
}

export function buildActionRequiredItems(notifications = [], summary = {}, locale = "TR") {
  const en = locale === "EN";
  const items = [];

  const verim = summary?.hat_verimlilik?.ortalama;
  if (verim != null && verim < 78) {
    items.push({
      id: "act-eff-b",
      severity: verim < 65 ? "kritik" : "uyari",
      zoneId: "hat-b",
      time: en ? "now" : "şimdi",
      message: en
        ? "Production line B: efficiency drop right now — intervene"
        : "Üretim hattı B'de şu an verim düşüşü var, müdahale et",
      actionLabel: en ? "Open line" : "Hattı aç",
    });
  }

  const isg = summary?.isg_ihlaller?.bugun;
  if (isg > 0) {
    items.push({
      id: "act-isg",
      severity: isg >= 3 ? "kritik" : "uyari",
      zoneId: "isg",
      time: en ? "today" : "bugün",
      message: en
        ? `HSE zone: ${isg} active violation(s) — assign supervisor`
        : `İSG bölgesi: ${isg} aktif ihlal — sorumlu yönlendir`,
      actionLabel: en ? "View zone" : "Bölgeyi gör",
    });
  }

  (notifications || [])
    .filter((n) => ["kritik", "uyari"].includes(n.seviye) || n.kategori === "isg")
    .slice(0, 6)
    .forEach((n, i) => items.push(actionableFromNotification(n, locale, i)));

  if (!items.length) {
    return [
      {
        id: "act-demo-1",
        severity: "kritik",
        zoneId: "hat-a",
        time: "09:14",
        message: en
          ? "Line A: hard hat missing at station 3 — intervene"
          : "Hat A: istasyon 3'te baret eksik — müdahale et",
        camera: en ? "Hype Camera 3" : "Hype Kamera 3",
        actionLabel: en ? "View camera" : "Kamerayı aç",
      },
      {
        id: "act-demo-2",
        severity: "uyari",
        zoneId: "hat-b",
        time: en ? "now" : "şimdi",
        message: en
          ? "Production line B: efficiency drop right now — intervene"
          : "Üretim hattı B'de şu an verim düşüşü var, müdahale et",
        actionLabel: en ? "Open line" : "Hattı aç",
      },
      {
        id: "act-demo-3",
        severity: "uyari",
        zoneId: "isg",
        time: "10:02",
        message: en
          ? "HSE zone: restricted area entry — security notify"
          : "İSG bölgesi: yasak alan girişi — güvenliği bilgilendir",
        camera: en ? "Hype Camera 5" : "Hype Kamera 5",
        actionLabel: en ? "View zone" : "Bölgeyi gör",
      },
    ];
  }

  const seen = new Set();
  return items
    .filter((x) => {
      const key = `${x.zoneId}-${x.message.slice(0, 24)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9))
    .slice(0, 8);
}

export function groupActionsByZone(items = []) {
  const map = {};
  for (const item of items) {
    if (!item.zoneId) continue;
    if (!map[item.zoneId]) map[item.zoneId] = [];
    map[item.zoneId].push(item);
  }
  return map;
}
