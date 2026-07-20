import { useMemo, useState } from "react";
import { Building2, Key, Moon, Shield, Sun, User } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../hooks/useAuth";
import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";
import { ROLE_LABELS_EN, ROLE_LABELS_TR } from "../lib/roles";
import { Panel } from "../components/ui";
import IntegrationPanel from "../components/settings/IntegrationPanel";

export default function SettingsView({ onRefresh }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [passwords, setPasswords] = useState({ mevcut: "", yeni: "", tekrar: "" });
  const [msg, setMsg] = useState(null);

  const roleLabel = useMemo(() => {
    const map = locale === "EN" ? ROLE_LABELS_EN : ROLE_LABELS_TR;
    return map[user?.rol] || user?.rol || "—";
  }, [locale, user?.rol]);

  const modules = (user?.moduller || []).filter((m) => m !== "urun" && m !== "ayarlar");

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
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {msg && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${msg.type === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-red-500/30 bg-red-500/10 text-red-600"}`}>
          {msg.text}
        </div>
      )}

      <Panel title={t.uyelikBilgisi} subtitle={t.uyelikBilgisiAlt}>
        <div className="settings-account-grid">
          <div className="settings-account-row">
            <User className="h-4 w-4 text-[var(--accent)]" />
            <div>
              <p className="settings-account-lbl">{t.gorunenAd}</p>
              <p className="settings-account-val">{user?.ad || "—"}</p>
            </div>
          </div>
          <div className="settings-account-row">
            <Key className="h-4 w-4 text-[var(--accent)]" />
            <div>
              <p className="settings-account-lbl">{t.email}</p>
              <p className="settings-account-val">{user?.email || "—"}</p>
            </div>
          </div>
          <div className="settings-account-row">
            <Shield className="h-4 w-4 text-[var(--accent)]" />
            <div>
              <p className="settings-account-lbl">{t.rol}</p>
              <p className="settings-account-val">{roleLabel}</p>
            </div>
          </div>
          <div className="settings-account-row">
            <Building2 className="h-4 w-4 text-[var(--accent)]" />
            <div>
              <p className="settings-account-lbl">{t.kurulum}</p>
              <p className="settings-account-val">{user?.kurulum || "—"}</p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <p className="settings-account-lbl mb-2">{t.aktifModuller}</p>
          <div className="flex flex-wrap gap-1.5">
            {modules.length ? modules.map((m) => (
              <span key={m} className="mes-shift-badge">{t[m === "mes" ? "personel" : m === "ana" ? "anaSayfa" : m] || m}</span>
            )) : <span className="text-sm text-[var(--text-muted)]">—</span>}
          </div>
        </div>
      </Panel>

      <Panel title={t.gorunum} subtitle={t.gorunumAlt}>
        <button
          type="button"
          onClick={toggle}
          className="flex w-full max-w-md items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3 text-sm hover:bg-[var(--bg-hover)]"
        >
          <span>{theme === "dark" ? t.vocDarkMode : t.acikMod}</span>
          {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </Panel>

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
    </div>
  );
}
