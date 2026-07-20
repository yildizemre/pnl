import { useCallback, useEffect, useState } from "react";
import { Activity, CheckCircle2, Link2, Radio, Send, XCircle } from "lucide-react";
import { api } from "../../api";
import { useLocale } from "../../context/LocaleContext";
import { Panel } from "../ui";

function fmtTime(iso, locale) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(locale === "EN" ? "en-GB" : "tr-TR");
  } catch {
    return iso;
  }
}

export default function IntegrationPanel({ onTestComplete }) {
  const { t, locale } = useLocale();
  const en = locale === "EN";
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.integrationStatus();
      setStatus(res);
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runTest = async () => {
    setTesting(true);
    setMsg(null);
    try {
      const res = await api.integrationTest();
      setStatus(res.integration);
      setMsg({ type: "ok", text: res.mesaj || t.integrationTestOk });
      onTestComplete?.(res);
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setTesting(false);
    }
  };

  const mins = Math.round((status?.heartbeat_max_seconds || 300) / 60);
  const recMins = Math.round((status?.heartbeat_recommended_seconds || 180) / 60);
  const endpoints = Array.isArray(status?.endpoints)
    ? status.endpoints
    : status?.endpoints
      ? Object.entries(status.endpoints).map(([name, url]) => ({ method: "—", name, url }))
      : [];

  return (
    <Panel title={t.integrationTitle} subtitle={t.integrationSubtitle}>
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">{t.yukleniyor}</p>
      ) : (
        <div className="integration-panel space-y-4">
          <div className="integration-status-grid">
            <div className={`integration-stat ${status?.ai_aktif ? "integration-stat--ok" : "integration-stat--warn"}`}>
              <Radio className="h-4 w-4" />
              <div>
                <span>{t.integrationAiStatus}</span>
                <strong>{status?.ai_aktif ? t.aiAktif : t.aiPasif}</strong>
              </div>
            </div>
            <div className={`integration-stat ${status?.has_api_key ? "integration-stat--ok" : "integration-stat--inactive"}`}>
              {status?.has_api_key ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <div>
                <span>{t.integrationApiKey}</span>
                <strong>{status?.has_api_key ? t.integrationApiKeyVar : t.integrationApiKeyYok}</strong>
              </div>
            </div>
            <div className="integration-stat">
              <Activity className="h-4 w-4" />
              <div>
                <span>{t.integrationLastHeartbeat}</span>
                <strong>{fmtTime(status?.last_heartbeat, locale)}</strong>
              </div>
            </div>
          </div>

          {!status?.ai_aktif && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {en
                ? `AI server sent no signal in the last ${mins} min. Send heartbeat every ${recMins} min or a notification from your integration.`
                : `AI sunucu son ${mins} dk içinde sinyal göndermedi. Entegrasyonunuzdan her ${recMins} dk heartbeat veya bildirim gönderin.`}
            </p>
          )}

          {status?.heartbeat_recommended_seconds && (
            <p className="text-sm text-[var(--text-muted)]">
              {en
                ? `Recommended: GET health or POST heartbeat every ${recMins} minutes. Panel marks AI inactive after ${mins} minutes without signal.`
                : `Önerilen: Her ${recMins} dakikada GET health veya POST heartbeat. ${mins} dakika sinyal gelmezse panel AI'yı pasif sayar.`}
            </p>
          )}

          {!status?.has_api_key && (
            <p className="text-sm text-[var(--text-muted)]">{t.integrationApiKeyHint}</p>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{t.integrationEndpoints}</p>
            <ul className="integration-endpoints">
              {endpoints.map((ep) => (
                <li key={`${ep.method}-${ep.name}`}>
                  <code>{ep.method}</code>
                  <code>{ep.name}</code>
                  <span>{ep.url}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={runTest} disabled={testing}>
              <Send className="h-4 w-4" />
              {testing ? "…" : t.integrationTestBtn}
            </button>
            <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
              <Link2 className="h-4 w-4" />
              {t.integrationRefresh}
            </button>
          </div>

          {msg && (
            <p className={`text-sm ${msg.type === "ok" ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</p>
          )}
        </div>
      )}
    </Panel>
  );
}
