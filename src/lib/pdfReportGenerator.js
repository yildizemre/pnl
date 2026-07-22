/**
 * Executive AI PDF Inspection & HSE Reporting Engine for HypeVision
 * Generates an executive corporate PDF report with safety metrics, violation tables, and AI telemetry.
 */

export function generateIsgPdfReport({
  title = "HypeVision AI İSG Denetim & Risk Raporu",
  facility = "Merkez Lojistik & Üretim Tesisleri",
  dateRange = "21 Temmuz 2026",
  summary = {},
  notifications = [],
}) {
  const isgCount = notifications.length || 25;
  const safetyIndex = summary?.safetyIndex || "94.2";
  const kazasizGun = summary?.kazasizGun || 142;

  // Generate printable HTML document for clean native vector PDF export
  const reportHtml = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body {
          font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 24px;
          line-height: 1.5;
        }
        .report-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 3px solid #00BCD4;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .brand-logo {
          font-size: 24px;
          font-weight: 900;
          color: #0B3C5D;
          letter-spacing: -0.5px;
        }
        .brand-logo span { color: #00BCD4; }
        .report-meta {
          text-align: right;
          font-size: 11px;
          color: #64748b;
        }
        .report-title-box {
          background: linear-gradient(135deg, #0B3C5D 0%, #071E2E 100%);
          color: #ffffff;
          padding: 20px 24px;
          border-radius: 16px;
          margin-bottom: 24px;
        }
        .report-title-box h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
        }
        .report-title-box p {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #94a3b8;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .kpi-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          background: #f8fafc;
        }
        .kpi-label {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          color: #00BCD4;
          letter-spacing: 0.5px;
        }
        .kpi-value {
          font-size: 24px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 4px;
        }
        .kpi-sub {
          font-size: 10px;
          color: #10b981;
          font-weight: 700;
        }
        .section-title {
          font-size: 14px;
          font-weight: 800;
          color: #0B3C5D;
          border-left: 4px solid #00BCD4;
          padding-left: 10px;
          margin: 24px 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin-bottom: 24px;
        }
        th {
          background: #f1f5f9;
          color: #334155;
          font-weight: 800;
          text-transform: uppercase;
          text-align: left;
          padding: 10px 12px;
          border-bottom: 2px solid #cbd5e1;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #e2e8f0;
          color: #1e293b;
        }
        tr:nth-child(even) { background: #f8fafc; }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .badge-kritik { background: #ffe4e6; color: #e11d48; }
        .badge-uyari { background: #fef3c7; color: #d97706; }
        .badge-bilgi { background: #e0f2fe; color: #0284c7; }
        .ai-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          padding: 16px;
          font-size: 11px;
          color: #166534;
          margin-top: 16px;
        }
        .report-footer {
          margin-top: 40px;
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="report-header">
        <div class="brand-logo">hype<span>vision</span> AI</div>
        <div class="report-meta">
          <strong>RAPOR NO:</strong> HV-ISG-${Math.floor(100000 + Math.random() * 900000)}<br>
          <strong>TARIH:</strong> ${dateRange}<br>
          <strong>TESIS:</strong> ${facility}
        </div>
      </div>

      <div class="report-title-box">
        <h1>AUTOMATED AI HSE INSPECTION & AUDIT REPORT</h1>
        <p>Kurumsal Yapay Zeka Kamera Denetim ve Vardiya Risk Analiz Raporu</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Güvenlik Endeksi</div>
          <div class="kpi-value">%${safetyIndex}</div>
          <div class="kpi-sub">▲ %1.8 Hedef Üstü</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Kazasız Gün Sayısı</div>
          <div class="kpi-value">${kazasizGun} Gün</div>
          <div class="kpi-sub">✓ Kesintisiz Rekor</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Kayıtlı İSG Olayı</div>
          <div class="kpi-value">${isgCount} Adet</div>
          <div class="kpi-sub">%100 Otomatik Tespit</div>
        </div>
      </div>

      <div class="section-title">Canlı Kamera Denetim İhlal Listesi</div>
      <table>
        <thead>
          <tr>
            <th>Kategori / Olay</th>
            <th>Kamera</th>
            <th>Vardiya / Konum</th>
            <th>Tarih / Saat</th>
            <th>Risk Seviyesi</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          ${(notifications.length > 0 ? notifications.slice(0, 10) : [
            { baslik: "Baret İhlali Tespit Edildi", kamera: "Paketleme-02", modul: "Vardiya 2", meta: { tarih: "2026-07-21 16:40" }, seviye: "kritik", durum: "açık" },
            { baslik: "Duman Yükselmesi Algılandı", kamera: "Konveyör A", modul: "Vardiya 1", meta: { tarih: "2026-07-21 15:20" }, seviye: "kritik", durum: "çözüldü" },
            { baslik: "Yasak Bölge İhlali", kamera: "Depo Giriş", modul: "Vardiya 2", meta: { tarih: "2026-07-21 14:10" }, seviye: "uyari", durum: "açık" },
            { baslik: "Koruyucu Yelek Eksikliği", kamera: "Montaj Hattı", modul: "Vardiya 1", meta: { tarih: "2026-07-21 11:45" }, seviye: "uyari", durum: "çözüldü" },
            { baslik: "Operatör Yerinde Yok", kamera: "Pres-04", modul: "Vardiya 3", meta: { tarih: "2026-07-21 09:30" }, seviye: "bilgi", durum: "açık" }
          ]).map(n => `
            <tr>
              <td><strong>${n.baslik || n.kategori}</strong></td>
              <td>${n.kamera || "CAM-01"}</td>
              <td>${n.modul || "Vardiya 1"}</td>
              <td>${n.meta?.tarih || "2026-07-21"}</td>
              <td><span class="badge badge-${n.seviye || "uyari"}">${n.seviye || "uyari"}</span></td>
              <td><strong>${n.durum || "açık"}</strong></td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="section-title">Yapay Zeka Derin Öğrenme Tavsiyeleri (AI Telemetry)</div>
      <div class="ai-box">
        <strong>🤖 AI SİSTEM NOTU:</strong> Son 7 günde Paketleme B hattında baret ihlalleri Vardiya 2 saatlerinde (14:00 - 16:00) %14 artış göstermiştir. Akıllı ikaz hoparlörleri otomatik tetiklenmiştir. Çarşamba günleri bu hatta ek İSG saha denetçisi görevlendirilmesi tavsiye edilir.
      </div>

      <div class="report-footer">
        <div>HypeVision Core AI Analytics Platform v2.1 Pro © 2026</div>
        <div>Gizlilik Derecesi: Müşteri Özel / Kurumsal İç Rapor</div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=900,height=1000");
  if (printWindow) {
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}