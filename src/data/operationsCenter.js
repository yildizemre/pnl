import { FLOOR_ZONES } from "./facilityZones";
import { getCameraZone } from "./cameraRules";

/** Kamera çevrimiçi sayısı — kroki noktaları veya özet objesinden okuma */
export function resolveCameraStats(data) {
  const points = data?.floor_plan?.points;
  if (Array.isArray(points) && points.length > 0) {
    const toplam = points.length;
    return { aktif: toplam, toplam, pct: 100 };
  }

  const summary = data?.summary?.kameralar;
  if (summary?.toplam > 0) {
    const { aktif, toplam } = summary;
    return { aktif, toplam, pct: Math.round((aktif / Math.max(toplam, 1)) * 100) };
  }

  const list = data?.cameras || data?.user?.kameralar;
  if (Array.isArray(list) && list.length > 0) {
    const toplam = list.length;
    return { aktif: toplam, toplam, pct: 100 };
  }

  return { aktif: 0, toplam: 0, pct: 0 };
}

const ZONE_STATUS = {
  normal: { fill: "voc-zone--normal", labelTr: "Normal", labelEn: "Normal" },
  uyari: { fill: "voc-zone--uyari", labelTr: "Uyarı", labelEn: "Warning" },
  kritik: { fill: "voc-zone--kritik", labelTr: "Kritik", labelEn: "Critical" },
};

const ZONE_DEFAULT = {
  giris: "normal",
  "hat-a": "normal",
  "hat-b": "normal",
  depo: "uyari",
  paket: "kritik",
  isg: "kritik",
  ofis: "normal",
  soguk: "uyari",
};

const ZONE_CAM_COUNT = {
  giris: 2,
  "hat-a": 3,
  "hat-b": 3,
  depo: 3,
  paket: 2,
  isg: 1,
  ofis: 1,
  soguk: 1,
};

const MATRIX_RULES = [
  { id: "isg", labelTr: "İSG İhlali", labelEn: "HSE violation" },
  { id: "ppe", labelTr: "KKD / Baret", labelEn: "PPE / Hard hat" },
  { id: "person", labelTr: "Personel Sayımı", labelEn: "Headcount" },
  { id: "product", labelTr: "Ürün Sayımı", labelEn: "Product count" },
  { id: "restricted", labelTr: "Yasak Bölge", labelEn: "Restricted zone" },
  { id: "speed", labelTr: "Hız Limiti", labelEn: "Speed limit" },
  { id: "efficiency", labelTr: "Hat Verimliliği", labelEn: "Line efficiency" },
  { id: "quality", labelTr: "Kalite Kontrol", labelEn: "Quality check" },
];

const MATRIX_ZONES = ["giris", "hat-a", "depo", "paket", "isg"];

export function computeRiskScore(summary = {}, notifications = []) {
  const verim = summary?.hat_verimlilik?.ortalama;
  const kritik = (notifications || []).filter((n) => n.seviye === "kritik" && !n.okundu).length;
  const isg = summary?.isg_ihlaller?.bugun ?? 0;
  if (verim == null && kritik === 0 && isg === 0) {
    return { score: 0, level: "low" };
  }
  const baseVerim = verim ?? 70;
  let score = Math.round(baseVerim * 0.55 + Math.max(0, 40 - kritik * 8 - isg * 3));
  score = Math.min(100, Math.max(0, score));
  const level = score >= 85 ? "low" : score >= 65 ? "mid" : "high";
  return { score, level };
}

export function buildZoneData(notifications = [], locale = "TR") {
  const statusMap = { ...ZONE_DEFAULT };
  const zoneNotifs = {};
  (notifications || []).forEach((n, i) => {
    const zid = ["depo", "isg", "paket", "hat-a", "hat-b", "giris"][i % 6];
    zoneNotifs[zid] = zoneNotifs[zid] || [];
    zoneNotifs[zid].push(n);
    if (n.seviye === "kritik") statusMap[zid] = "kritik";
    else if (n.seviye === "uyari" && statusMap[zid] !== "kritik") statusMap[zid] = "uyari";
  });

  return FLOOR_ZONES.map((z) => {
    const st = statusMap[z.id] || "normal";
    const meta = ZONE_STATUS[st];
    return {
      ...z,
      label: locale === "EN" ? z.labelEn : z.labelTr,
      status: st,
      statusLabel: locale === "EN" ? meta.labelEn : meta.labelTr,
      fillClass: meta.fill,
      cameras: ZONE_CAM_COUNT[z.id] || 1,
    };
  });
}

export function buildCameraMarkers(cameras = []) {
  return (cameras || []).slice(0, 12).map((cam, i) => {
    const zoneId = getCameraZone(i);
    const z = FLOOR_ZONES.find((x) => x.id === zoneId);
    const cx = z ? z.x + z.w * (0.25 + (i % 3) * 0.25) : 50;
    const cy = z ? z.y + z.h * 0.5 : 31;
    return { id: `K${i + 1}`, name: cam.ad, zoneId, cx, cy };
  });
}

export function buildLiveEvents(notifications = [], logs = [], locale = "TR") {
  const en = locale === "EN";
  const fromNotifs = (notifications || []).slice(0, 8).map((n) => ({
    id: n.id,
    time: n.zaman,
    text: n.baslik,
    severity: n.seviye || "bilgi",
    camera: n.kamera,
  }));

  if (fromNotifs.length >= 5) return fromNotifs;

  const demo = en
    ? [
        { id: "e1", time: "14:32", text: "HSE zone violation", severity: "kritik" },
        { id: "e2", time: "14:18", text: "Pallet detected", severity: "uyari" },
        { id: "e3", time: "13:55", text: "PPE check warning", severity: "uyari" },
        { id: "e4", time: "13:40", text: "Forklift speed warning", severity: "uyari" },
        { id: "e5", time: "13:12", text: "Camera offline", severity: "bilgi" },
        { id: "e6", time: "12:48", text: "Personnel count", severity: "bilgi" },
        { id: "e7", time: "12:20", text: "AI model updated", severity: "basari" },
      ]
    : [
        { id: "e1", time: "14:32", text: "İSG bölge ihlali", severity: "kritik" },
        { id: "e2", time: "14:18", text: "Palet algılandı", severity: "uyari" },
        { id: "e3", time: "13:55", text: "KKD kontrol uyarısı", severity: "uyari" },
        { id: "e4", time: "13:40", text: "Forklift hız uyarısı", severity: "uyari" },
        { id: "e5", time: "13:12", text: "Kamera çevrimdışı", severity: "bilgi" },
        { id: "e6", time: "12:48", text: "Personel sayımı", severity: "bilgi" },
        { id: "e7", time: "12:20", text: "AI model güncellendi", severity: "basari" },
      ];

  return [...fromNotifs, ...demo].slice(0, 8);
}

export function buildRuleMatrix(locale = "TR") {
  const states = ["ok", "ok", "warn", "ok", "fail", "ok", "warn", "ok", "ok", "fail", "ok", "warn", "ok", "ok", "ok", "ok", "ok", "ok", "fail", "ok", "ok", "warn", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "inactive", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok"];
  let idx = 0;
  return MATRIX_RULES.map((rule) => ({
    id: rule.id,
    label: locale === "EN" ? rule.labelEn : rule.labelTr,
    zones: MATRIX_ZONES.map((zid) => {
      const z = FLOOR_ZONES.find((x) => x.id === zid);
      return {
        zoneId: zid,
        zoneLabel: locale === "EN" ? z?.labelEn : z?.labelTr,
        state: states[idx++] || "ok",
      };
    }),
  }));
}

export function buildAiInsights(summary = {}, locale = "TR") {
  const en = locale === "EN";
  const verim = summary?.hat_verimlilik?.ortalama;
  const camCount = summary?.kameralar?.toplam ?? 0;
  if (verim == null && camCount === 0) {
    return [
      en
        ? "No activity yet. Add cameras on the floor plan and send events via API."
        : "Henüz aktivite yok. Krokiye kamera ekleyin ve API ile olay gönderin.",
    ];
  }
  const v = verim ?? 0;
  return [
    en
      ? `Production line density is ${Math.round(v * 0.25)}% above normal`
      : `Üretim hattı yoğunluğu normalin %${Math.round(v * 0.25)} üzerinde`,
    en ? "Camera image quality is being monitored" : "Kamera görüntü kalitesi izleniyor",
    en ? "Warehouse zone activity tracked today" : "Depo bölgesi aktivitesi bugün izleniyor",
    en ? "PPE compliance tracked from live events" : "KKD uyumu canlı olaylardan izleniyor",
  ];
}

export function buildDensityHeatmap(traffic = []) {
  const hours = ["00", "04", "08", "12", "16", "20", "24"];
  if (!traffic?.length) {
    return hours.map((h) => ({ hour: h, value: 0, pct: 0 }));
  }
  const max = Math.max(...traffic.map((x) => x.kisi), 1);
  return hours.map((h, i) => {
    const row = traffic[Math.min(i, traffic.length - 1)];
    const val = row?.kisi ?? 0;
    return { hour: h, value: val, pct: Math.round((val / max) * 100) };
  });
}

export function buildSystemNodes(aiActive = true, locale = "TR") {
  const en = locale === "EN";
  return [
    { id: "ai", label: en ? "AI Model" : "AI Model", status: aiActive ? "ok" : "warn" },
    { id: "flow", label: en ? "Data Flow" : "Veri Akışı", status: "ok" },
    { id: "notif", label: en ? "Notifications" : "Bildirim Kanalı", status: "ok" },
    { id: "cam", label: en ? "Camera Network" : "Kamera Ağı", status: "ok" },
  ];
}
