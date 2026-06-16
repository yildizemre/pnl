import { useState } from "react";
import { Key } from "lucide-react";
import { api } from "../api";
import { useLocale } from "../context/LocaleContext";
import { Panel } from "../components/ui";
import IntegrationPanel from "../components/settings/IntegrationPanel";

export default function SettingsView({ onRefresh }) {
  const { t } = useLocale();
  const [passwords, setPasswords] = useState({ mevcut: "", yeni: "", tekrar: "" });
  const [msg, setMsg] = useState(null);

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.yeni !== passwords.tekrar) {
      setMsg({ type: "err", text: t.sifrelerEslesmiyor });
      return;
    }
    try {
      const res = await api.changePassword(passwords.mevcut, passwords.yeni);
      setMsg({ type: "ok", text: res.mesaj });
      setPasswords({ mevcut: "", yeni: "", tekrar: "" });
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {msg && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${msg.type === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-red-500/30 bg-red-500/10 text-red-600"}`}>
          {msg.text}
        </div>
      )}

      <IntegrationPanel onTestComplete={() => onRefresh?.()} />

      <Panel title={t.sifreDegistir} subtitle={t.hesapGuvenligi}>
        <form onSubmit={changePassword} className="max-w-md space-y-4">
          <input type="password" placeholder={t.mevcutSifre} value={passwords.mevcut} onChange={(e) => setPasswords({ ...passwords, mevcut: e.target.value })} className="input-dark w-full" required />
          <input type="password" placeholder={t.yeniSifre} value={passwords.yeni} onChange={(e) => setPasswords({ ...passwords, yeni: e.target.value })} className="input-dark w-full" required minLength={6} />
          <input type="password" placeholder={t.yeniSifreTekrar} value={passwords.tekrar} onChange={(e) => setPasswords({ ...passwords, tekrar: e.target.value })} className="input-dark w-full" required />
          <button type="submit" className="btn-primary">
            <Key className="h-4 w-4" /> {t.guncelle}
          </button>
        </form>
      </Panel>

      <p className="text-center text-sm text-[var(--text-muted)]">{t.krokiKameraAdminHint}</p>
    </div>
  );
}
