/** Kamera noktası ↔ bildirim eşleştirme */

function norm(s) {
  return String(s || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function namesMatch(a, b) {
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

export function matchNotificationToPoint(notification, points = [], cameras = []) {
  const camName = norm(notification.kamera);
  if (!camName || !points.length) return null;

  for (const p of points) {
    const tag = norm(p.tag);
    const label = norm(p.label);
    if (namesMatch(camName, tag)) return p;
    if (namesMatch(camName, label)) return p;
    if (p.camera_id) {
      const cam = cameras.find((c) => c.id === p.camera_id);
      if (cam && namesMatch(camName, norm(cam.ad))) return p;
    }
  }
  return null;
}

export function buildPointHotspots(notifications = [], points = [], cameras = []) {
  const out = [];
  const unread = notifications.filter((n) => !n.okundu);

  for (const n of unread.slice(0, 16)) {
    const point = matchNotificationToPoint(n, points, cameras);
    if (!point) continue;

    out.push({
      id: n.id ?? `h-${out.length}`,
      pointId: point.id,
      x: point.x ?? 50,
      y: point.y ?? 50,
      severity: n.seviye || "bilgi",
      title: n.baslik,
      time: n.zaman || "—",
      camera: n.kamera || "—",
      detay: n.detay,
      gorsel: n.gorsel,
      modules: point.modules || [],
    });
  }
  return out;
}

export function alertsByPoint(notifications = [], points = [], cameras = []) {
  const map = {};
  const unread = notifications.filter((n) => !n.okundu);
  for (const p of points) {
    const matched = unread.filter((n) => matchNotificationToPoint(n, [p], cameras));
    if (matched.length) map[p.id] = matched;
  }
  return map;
}

export function groupHotspotsByPoint(hotspots = []) {
  const map = {};
  for (const h of hotspots) {
    const key = h.pointId || `xy-${h.x}-${h.y}`;
    if (!map[key]) map[key] = [];
    map[key].push(h);
  }
  return map;
}

export const FLOOR_MODULES = [
  { id: "isg", labelTr: "İSG", labelEn: "HSE" },
  { id: "sayim", labelTr: "Sayım", labelEn: "Counting" },
  { id: "urun", labelTr: "Ürün", labelEn: "Product" },
  { id: "mes", labelTr: "MES", labelEn: "MES" },
  { id: "genel", labelTr: "Genel", labelEn: "General" },
];

export function newPointId() {
  return `pt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function newSiteId() {
  return `site-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function findPointForNotification(notification, floorPlan) {
  const plan = floorPlan || {};
  const allPoints = plan.all_points || plan.points || [];
  return matchNotificationToPoint(notification, allPoints);
}
