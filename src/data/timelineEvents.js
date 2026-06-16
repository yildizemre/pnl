const TYPES = ["isg", "sayim", "mes", "urun", "personel"];

export function buildTimelineEvents(notifications = [], locale = "TR") {
  const base = [];
  for (let h = 6; h <= 22; h++) {
    const hh = String(h).padStart(2, "0");
    const type = TYPES[h % TYPES.length];
    base.push({
      id: `slot-${hh}`,
      time: `${hh}:00`,
      hour: h,
      type,
      label:
        locale === "EN"
          ? { isg: "HSE check", sayim: "Line count", mes: "Shift sync", urun: "Pallet scan", personel: "Staff entry" }[type]
          : { isg: "İSG kontrol", sayim: "Hat sayımı", mes: "Vardiya", urun: "Palet tarama", personel: "Personel giriş" }[type],
      severity: h % 5 === 0 ? "kritik" : h % 3 === 0 ? "uyari" : "normal",
    });
  }

  (notifications || []).slice(0, 6).forEach((n, i) => {
    const hour = 7 + i * 2;
    base.push({
      id: `ev-${n.id ?? i}`,
      time: n.zaman || `${String(hour).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`,
      hour: hour + (i % 3) * 0.25,
      type: n.kategori?.includes("İSG") || n.kategori?.includes("HSE") ? "isg" : "sayim",
      label: n.baslik,
      severity: n.seviye || "bilgi",
      snapshot: {
        verim: 72 + i * 3,
        personel: 18 + i,
        urun: 1200 + i * 140,
        bildirim: 2 + i,
      },
    });
  });

  return base.sort((a, b) => a.hour - b.hour);
}

export function snapshotAt(events, hour) {
  const near = events.filter((e) => Math.abs(e.hour - hour) < 0.6);
  const snap = near.find((e) => e.snapshot)?.snapshot;
  return (
    snap || {
      verim: 68 + Math.round(hour * 1.2),
      personel: 12 + Math.round(hour * 0.8),
      urun: 800 + hour * 95,
      bildirim: near.length,
    }
  );
}
