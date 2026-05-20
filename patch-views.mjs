import fs from "fs";

const tag = "d" + "iv";
const o = `<${tag}`;
const c = `</${tag}>`;
const chartTooltip = `contentStyle={{ background: "var(--tooltip-bg)", border: "1px solid var(--border)", borderRadius: 8 }}`;

function patchCharts(file) {
  let s = fs.readFileSync(file, "utf8");
  s = s
    .replaceAll(`stroke="#334155"`, `stroke="var(--chart-grid)"`)
    .replaceAll(`tick={{ fill: "#a1a1aa", fontSize: 10 }}`, `tick={{ fill: "var(--text-muted)", fontSize: 10 }}`)
    .replaceAll(`tick={{ fill: "#71717a", fontSize: 10 }}`, `tick={{ fill: "var(--text-muted)", fontSize: 10 }}`)
    .replaceAll(
      `contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}`,
      chartTooltip
    );
  fs.writeFileSync(file, s);
}

// MesView
{
  let s = fs.readFileSync("src/views/MesView.jsx", "utf8");
  const a = s.indexOf('        <Panel title="Personel Verimlilik Tablosu"');
  const b = s.indexOf('        <Panel title="Vardiya Ortalamaları"');
  const block = `        <Panel title="Personel Verimlilik Tablosu" subtitle="Bireysel performans" className="xl:col-span-2" flush>
          <DataTable minWidth="640px">
            <thead>
              <tr><th>ID</th><th>Ad Soyad</th><th>Hat</th><th>Vardiya</th><th>Verimlilik</th><th>Durum</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr className="empty-row"><td colSpan={6}>Personel bulunamadı</td></tr>
              ) : filtered.map((person) => (
                <tr key={person.id}>
                  <td className="font-mono text-xs text-[var(--text-muted)]">{person.id}</td>
                  <td className="font-medium">{person.ad}</td>
                  <td className="text-[var(--text-muted)]">{person.hat}</td>
                  <td className="text-[var(--text-muted)]">{person.vardiya}</td>
                  <td>
                    ${o} className="flex items-center gap-2">
                      ${o} className="progress-track h-2 w-20 max-w-full">
                        ${o}
                          className={\`h-full rounded-full \${person.verimlilik >= 95 ? "bg-emerald-500" : person.verimlilik >= 90 ? "bg-sky-500" : "bg-amber-500"}\`}
                          style={{ width: \`\${person.verimlilik}%\` }}
                        />
                      ${c}
                      <span className="font-semibold text-emerald-500">%{person.verimlilik}</span>
                    ${c}
                  </td>
                  <td><StatusBadge variant={person.durum}>{person.durum}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>

`;
  s = s.slice(0, a) + block + s.slice(b);
  s = s.replace(`text-zinc-500`, `text-[var(--text-muted)]`);
  s = s.replace(`text-emerald-400 font-semibold`, `text-emerald-500 font-semibold`);
  fs.writeFileSync("src/views/MesView.jsx", s);
  patchCharts("src/views/MesView.jsx");
}

// ProductView
{
  let s = fs.readFileSync("src/views/ProductView.jsx", "utf8");
  if (!s.includes("DataTable")) {
    s = s.replace(`import { Panel, StatCard }`, `import { DataTable, Panel, StatCard }`);
  }
  const a = s.indexOf('          <Panel title="Hat Bazlı Sayım"');
  const b = s.indexOf('          </Panel>', a) + '          </Panel>'.length;
  const block = `          <Panel title="Hat Bazlı Sayım" subtitle="Her üretim hattı ayrı" flush>
            <DataTable minWidth="500px">
              <thead>
                <tr><th>Hat</th><th className="text-right">Adet</th><th>Pay</th></tr>
              </thead>
              <tbody>
                {hatlar.map((h) => {
                  const pay = pc?.toplam ? Math.round((h.adet / pc.toplam) * 100) : 0;
                  return (
                    <tr key={h.hat}>
                      <td className="font-medium">{h.hat}</td>
                      <td className="text-right font-semibold text-violet-500">{h.adet.toLocaleString("tr-TR")}</td>
                      <td>
                        ${o} className="flex items-center gap-2">
                          ${o} className="progress-track h-2 flex-1 max-w-[120px]">
                            ${o} className="h-full rounded-full bg-violet-500" style={{ width: \`\${pay}%\` }} />
                          ${c}
                          <span className="text-xs text-[var(--text-muted)]">%{pay}</span>
                        ${c}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </Panel>
`;
  s = s.slice(0, a) + block + s.slice(b);
  fs.writeFileSync("src/views/ProductView.jsx", s);
  patchCharts("src/views/ProductView.jsx");
}

// ReportsView
{
  let s = fs.readFileSync("src/views/ReportsView.jsx", "utf8");
  s = s.replace(`import { Panel, StatusBadge }`, `import { DataTable, Panel, StatCard, StatusBadge }`);
  s = s.replace(`font-medium text-white`, `font-medium text-[var(--text-primary)]`);
  s = s.replace(`text-sm text-zinc-500`, `text-sm text-[var(--text-muted)]`);
  const a = s.indexOf("        <table");
  const b = s.indexOf("        </table>") + "        </table>".length;
  s = s.slice(0, a) + `        <DataTable>
          <thead>
            <tr><th>Rapor</th><th>Tarih</th><th>Durum</th><th className="text-right">İşlem</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.rapor}>
                <td>{r.rapor}</td>
                <td className="text-[var(--text-muted)]">{r.tarih}</td>
                <td><StatusBadge variant={r.tip}>{r.durum}</StatusBadge></td>
                <td className="text-right"><button type="button" className="btn-ghost">İndir</button></td>
              </tr>
            ))}
          </tbody>
        </DataTable>` + s.slice(b);
  const cStart = s.indexOf('      <motion className="mt-6 grid');
  if (cStart === -1) {
    const cStart2 = s.indexOf('      <div className="mt-6 grid');
    const cEnd = s.indexOf("    </>\n  );");
    s = s.slice(0, cStart2) + `      <motion className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Toplam log (bugün)" value={\`\${data.logs.length}+\`} accent="blue" />
        <StatCard title="Toplam bildirim" value={(data.notifications || []).length} accent="orange" />
        <StatCard title="Aktif kamera" value={\`\${data.summary.kameralar.aktif}/\${data.summary.kameralar.toplam}\`} accent="green" />
      </motion>

`.replaceAll("motion", "div") + s.slice(cEnd);
  }
  fs.writeFileSync("src/views/ReportsView.jsx", s);
}

// NotificationsView
{
  let s = fs.readFileSync("src/views/NotificationsView.jsx", "utf8");
  s = s.replace(`import { Panel, StatCard, StatusBadge }`, `import { DataTable, Panel, StatCard, StatusBadge }`);
  s = s.replace(
    `className="rounded-lg border border-slate-600/80 bg-slate-900/80 px-3 py-2 text-sm text-zinc-100 focus:border-sky-500/50 focus:outline-none"`,
    `className="input-dark w-auto"`
  );
  s = s.replace(/className="bg-slate-900"/g, "");
  s = s.replace(
    `className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/25"`,
    `className="btn-primary"`
  );
  s = s.replace(`className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-4 space-y-3"`, `className="panel panel-body space-y-3"`);
  s = s.replace(`text-sm font-medium text-white`, `text-sm font-semibold text-[var(--text-primary)]`);
  s = s.replace(
    `className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"`,
    `className="btn-primary disabled:opacity-50"`
  );
  s = s.replace(`className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-zinc-400"`, `className="btn-ghost"`);
  const a = s.indexOf('      <Panel title="Bildirim Tablosu"');
  const b = s.indexOf('      </Panel>', a) + '      </Panel>'.length;
  const block = `      <Panel title="Bildirim Tablosu" subtitle="Görsel önizleme ile" flush>
        <DataTable minWidth="800px">
          <thead>
            <tr><th>Görsel</th><th>Zaman</th><th>Kategori</th><th>Başlık</th><th>Kamera</th><th>Seviye</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="empty-row"><td colSpan={6}>Bildirim bulunamadı</td></tr>
            ) : filtered.map((n) => (
              <tr key={n.id}>
                <td>${o} className="thumb-box"><Image className="h-5 w-5 text-[var(--accent)]" />${c}</td>
                <td className="font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">{n.zaman}</td>
                <td>{n.kategori}</td>
                <td>
                  <p className="font-medium">{n.baslik}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 max-w-xs truncate">{n.detay}</p>
                </td>
                <td className="text-[var(--text-muted)]">{n.kamera}</td>
                <td><StatusBadge variant={n.seviye}>{n.seviye}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
`;
  s = s.slice(0, a) + block + s.slice(b);
  fs.writeFileSync("src/views/NotificationsView.jsx", s);
  patchCharts("src/views/NotificationsView.jsx");
}

console.log("patched");
