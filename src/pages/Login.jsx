import { useEffect, useState } from "react";
import { ArrowRight, Lock, Mail, Moon, Sun } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";
import HypeLogo from "../components/HypeLogo";
import faviconUrl from "../public/siyah.png";

export default function Login() {
  const { login } = useAuth();
  const { toggle, isDark } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = `${t.giris} · HypeVision`;
    let link = document.getElementById("hv-favicon");
    if (!link) {
      link = document.createElement("link");
      link.id = "hv-favicon";
      link.rel = "icon";
      link.type = "image/png";
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [t]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(loginId, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tags = [t.tagCanli, t.tagIsg, t.tagMes, t.tagSayim];

  return (
    <div className="login-shell relative min-h-screen overflow-hidden bg-[var(--bg-page)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="login-mesh" />
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-grid absolute inset-0 opacity-[0.2]" />
      </div>

      <div className="absolute right-5 top-5 z-20 flex items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]/60 p-0.5 backdrop-blur-xl">
          {["TR", "EN"].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLocale(l)}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                locale === l ? "bg-sky-500/20 text-sky-500" : "text-[var(--text-muted)]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggle}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)]/60 text-[var(--text-muted)] backdrop-blur-xl transition hover:text-[var(--text-primary)]"
          aria-label={t.tema}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
        <div className="login-brand-panel relative hidden overflow-hidden border-r border-[var(--border)]/60 lg:flex">
          <div className="login-panel-shine absolute inset-0" />
          <div className="login-brand-mesh absolute inset-0" />
          <div className="login-brand-inner relative flex w-full flex-col items-center justify-between px-10 py-12 xl:px-16">
            <HypeLogo centered className="h-11 w-auto max-w-[240px]" />

            <div className="flex w-full max-w-lg flex-col items-center text-center space-y-6">
              <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-[var(--text-primary)] xl:text-5xl">
                {t.loginHero1}
                <span className="mt-1 block bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
                  {t.loginHero2}
                </span>
              </h1>
              <p className="max-w-md text-base leading-relaxed text-[var(--text-muted)]">
                {t.loginHeroDesc}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-500 backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)]">© HypeVision {t.sidebarTagline}</p>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-16 sm:px-12">
          <div className="w-full max-w-[420px]">
            <div className="mb-10 flex w-full flex-col items-center text-center lg:hidden">
              <HypeLogo centered className="h-10 w-auto max-w-[200px]" />
              <p className="sidebar-tagline mt-2">{t.sidebarTagline}</p>
            </div>

            <div className="login-card login-card-glass rounded-3xl border border-[var(--border)]/80 p-8 sm:p-10">
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-500">{t.hosgeldiniz}</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">{t.hesabaGiris}</h2>
                <p className="mt-1.5 text-sm text-[var(--text-muted)]">{t.yoneticiErisim}</p>
              </div>

              {error && (
                <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="login" className="text-xs font-medium text-[var(--text-muted)]">
                    {t.girisKimlik}
                  </label>
                  <div className="login-input-wrap group">
                    <Mail className="login-input-icon h-[18px] w-[18px]" />
                    <input
                      id="login"
                      type="text"
                      autoComplete="username"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      placeholder={t.girisKimlikPlaceholder}
                      className="login-input login-input-glass"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-medium text-[var(--text-muted)]">
                    {t.sifre}
                  </label>
                  <div className="login-input-wrap group">
                    <Lock className="login-input-icon h-[18px] w-[18px]" />
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="login-input login-input-glass"
                      required
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="login-btn group mt-2 w-full">
                  <span>{loading ? t.girisYapiliyor : t.giris}</span>
                  {!loading && (
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  )}
                  {loading && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
