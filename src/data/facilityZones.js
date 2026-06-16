/** Tesis kroki bölgeleri (SVG viewBox 0 0 100 62) */
export const FLOOR_ZONES = [
  { id: "giris", labelTr: "Giriş / Turnike", labelEn: "Entrance", x: 4, y: 4, w: 18, h: 14, fill: "zone-neutral" },
  { id: "depo", labelTr: "Depo", labelEn: "Warehouse", x: 4, y: 22, w: 18, h: 18, fill: "zone-neutral" },
  { id: "hat-a", labelTr: "Üretim Hattı A", labelEn: "Line A", x: 26, y: 8, w: 32, h: 22, fill: "zone-prod" },
  { id: "hat-b", labelTr: "Üretim Hattı B", labelEn: "Line B", x: 26, y: 34, w: 32, h: 22, fill: "zone-prod" },
  { id: "paket", labelTr: "Paketleme", labelEn: "Packing", x: 62, y: 8, w: 16, h: 20, fill: "zone-pack" },
  { id: "isg", labelTr: "İSG Bölgesi", labelEn: "HSE Zone", x: 62, y: 32, w: 16, h: 24, fill: "zone-isg" },
  { id: "ofis", labelTr: "Kontrol Odası", labelEn: "Control Room", x: 82, y: 4, w: 14, h: 18, fill: "zone-office" },
  { id: "soguk", labelTr: "Soğuk Hava", labelEn: "Cold Storage", x: 82, y: 26, w: 14, h: 30, fill: "zone-cold" },
];

const ZONE_CYCLE = ["hat-a", "hat-b", "isg", "paket", "depo", "giris"];

export function buildHotspots(notifications = [], locale = "TR") {
  const items = (notifications || []).slice(0, 8);
  if (!items.length) {
    return [
      { id: "demo-1", zoneId: "hat-a", severity: "kritik", title: locale === "EN" ? "PPE violation" : "KKD ihlali", time: "09:14", camera: "Hype Kamera 3" },
      { id: "demo-2", zoneId: "isg", severity: "uyari", title: locale === "EN" ? "Restricted zone entry" : "Yasak bölge girişi", time: "10:02", camera: "Hype Kamera 5" },
      { id: "demo-3", zoneId: "paket", severity: "bilgi", title: locale === "EN" ? "Count milestone" : "Sayım eşiği", time: "11:45", camera: "Hype Kamera 2" },
    ];
  }
  return items.map((n, i) => ({
    id: n.id ?? `h-${i}`,
    zoneId: ZONE_CYCLE[i % ZONE_CYCLE.length],
    severity: n.seviye || "bilgi",
    title: n.baslik,
    time: n.zaman || "—",
    camera: n.kamera || "—",
    detay: n.detay,
    gorsel: n.gorsel,
  }));
}

export function zoneCenter(zoneId) {
  const z = FLOOR_ZONES.find((x) => x.id === zoneId);
  if (!z) return { cx: 50, cy: 31 };
  return { cx: z.x + z.w / 2, cy: z.y + z.h / 2 };
}
