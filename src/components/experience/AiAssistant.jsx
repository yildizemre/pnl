import { useMemo, useRef, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";

function matchIntent(q, locale) {
  const s = q.toLowerCase();
  if (s.includes("yavaş") || s.includes("slow") || s.includes("verim") || s.includes("efficien"))
    return "slowdown";
  if (s.includes("ihlal") || s.includes("isg") || s.includes("hse") || s.includes("violation"))
    return "isg";
  if (s.includes("sayım") || s.includes("ürün") || s.includes("count") || s.includes("product"))
    return "product";
  if (s.includes("personel") || s.includes("staff") || s.includes("mes"))
    return "staff";
  if (s.includes("bugün") || s.includes("today") || s.includes("özet") || s.includes("summary"))
    return "today";
  return "default";
}

function buildReply(intent, summary, locale) {
  const tr = locale !== "EN";
  const templates = {
    slowdown: {
      title: tr ? "Üretim hattı yavaşlama analizi" : "Production slowdown analysis",
      body: tr
        ? `Saat 10:15–11:00 arası Hat B'de verim %${(summary?.hat_verimlilik?.ortalama ?? 78) - 6} seviyesine indi. Olası nedenler: vardiya değişimi, paketleme darboğazı.`
        : `Between 10:15–11:00 Line B efficiency dropped to %${(summary?.hat_verimlilik?.ortalama ?? 78) - 6}. Likely causes: shift change, packing bottleneck.`,
      actions: tr
        ? ["Hat B kamera akışını aç", "MES vardiya raporunu göster", "Raporlar"]
        : ["Open Line B camera", "Show MES shift report", "Reports"],
    },
    isg: {
      title: tr ? "İSG olay özeti" : "HSE incident summary",
      body: tr
        ? `Bugün ${summary?.isg_ihlaller?.bugun ?? 3} ihlal kaydı var. En sık: KKD eksikliği (Üretim Hattı A). Bildirimler listesinden detaya bakın.`
        : `Today ${summary?.isg_ihlaller?.bugun ?? 3} violations recorded. Most common: missing PPE (Line A). Check details in Notifications.`,
      actions: tr ? ["İhlal listesi", "PDF rapor"] : ["Violation list", "PDF report"],
    },
    product: {
      title: tr ? "Ürün sayım durumu" : "Product count status",
      body: tr
        ? `Günlük toplam hedefin %92'sine ulaşıldı. Paketleme bölgesi en yüksek throughput — son 1 saatte +340 birim.`
        : `Reached 92% of daily target. Packing zone highest throughput — +340 units last hour.`,
      actions: tr ? ["Ürün sayımı sayfası", "Hat kırılımı"] : ["Product count page", "Line breakdown"],
    },
    staff: {
      title: tr ? "Personel / MES" : "Staff / MES",
      body: tr
        ? `Aktif personel: ${summary?.aktif_personel?.sayi ?? 24}. Turnike girişleri normal; MES verimliliği ortalama %${summary?.hat_verimlilik?.ortalama ?? 81}.`
        : `Active staff: ${summary?.aktif_personel?.sayi ?? 24}. Turnstile entries normal; MES efficiency avg %${summary?.hat_verimlilik?.ortalama ?? 81}.`,
      actions: tr ? ["MES paneli", "Vardiya grafiği"] : ["MES panel", "Shift chart"],
    },
    today: {
      title: tr ? "Bugünkü operasyon özeti" : "Today's operations summary",
      body: tr
        ? `Verim %${summary?.hat_verimlilik?.ortalama ?? 0}, ${summary?.bildirim_sayisi ?? 0} okunmamış bildirim, ${summary?.isg_ihlaller?.bugun ?? 0} İSG ihlali. Sistem AI aktif.`
        : `Efficiency %${summary?.hat_verimlilik?.ortalama ?? 0}, ${summary?.bildirim_sayisi ?? 0} unread alerts, ${summary?.isg_ihlaller?.bugun ?? 0} HSE violations. AI system active.`,
      actions: tr ? ["Bildirimler", "Raporlar"] : ["Notifications", "Reports"],
    },
    default: {
      title: tr ? "HypeVision Asistan" : "HypeVision Assistant",
      body: tr
        ? "Örnek: \"Bugün üretim hattında neden yavaşlama oldu?\" veya \"İSG ihlalleri\" yazın. Demo modunda önceden tanımlı yanıtlar sunulur."
        : 'Try: "Why did the production line slow down today?" or "HSE violations". Demo mode returns predefined insights.',
      actions: tr ? ["Yavaşlama analizi", "İSG özeti", "Bugünkü özet"] : ["Slowdown analysis", "HSE summary", "Today summary"],
    },
  };
  return templates[intent] || templates.default;
}

const SUGGESTIONS_TR = [
  "Bugün üretim hattında neden yavaşlama oldu?",
  "İSG ihlallerini özetle",
  "Ürün sayımı durumu nedir?",
];

const SUGGESTIONS_EN = [
  "Why did the production line slow down today?",
  "Summarize HSE violations",
  "What is the product count status?",
];

export default function AiAssistant({ summary }) {
  const { t, locale } = useLocale();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);
  const suggestions = locale === "EN" ? SUGGESTIONS_EN : SUGGESTIONS_TR;

  const submit = (text) => {
    const q = (text || input).trim();
    if (!q) return;
    const intent = matchIntent(q, locale);
    const reply = buildReply(intent, summary, locale);
    setMessages((m) => [
      ...m,
      { role: "user", text: q },
      { role: "assistant", ...reply },
    ]);
    setInput("");
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);
  };

  const welcome = useMemo(
    () => buildReply("default", summary, locale),
    [summary, locale]
  );

  return (
    <div className="assistant-shell panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <div className="assistant-avatar">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3>{t.modeAssistant}</h3>
            <p>{t.assistantDesc}</p>
          </div>
        </div>
      </div>

      <div className="assistant-chat" ref={listRef}>
        <div className="assistant-msg assistant-msg--bot">
          <Sparkles className="h-4 w-4 shrink-0 text-cyan-500" />
          <div>
            <p className="font-semibold">{welcome.title}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{welcome.body}</p>
            <div className="assistant-chips">
              {suggestions.map((s) => (
                <button key={s} type="button" className="assistant-chip" onClick={() => submit(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="assistant-msg assistant-msg--user">
              {msg.text}
            </div>
          ) : (
            <div key={i} className="assistant-msg assistant-msg--bot">
              <Bot className="h-4 w-4 shrink-0 text-cyan-500" />
              <div>
                <p className="font-semibold">{msg.title}</p>
                <p className="mt-1 text-sm">{msg.body}</p>
                {msg.actions?.length > 0 && (
                  <ul className="assistant-actions">
                    {msg.actions.map((a) => (
                      <li key={a}>→ {a}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        )}
      </div>

      <form
        className="assistant-input-bar"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.assistantPlaceholder}
          className="assistant-input"
        />
        <button type="submit" className="btn-primary shrink-0 px-3" disabled={!input.trim()}>
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
