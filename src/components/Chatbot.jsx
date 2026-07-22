import { useState, useEffect, useRef } from "react";
import { MessageCircle, Bot, Send, X, Sparkles } from "lucide-react";
import { api } from "../api";
import { useLocale } from "../context/LocaleContext";

const QUICK_QUESTIONS = [
  "Bugünkü kritik olaylar?",
  "En riskli kamera hangisi?",
  "KKD uyum oranı nedir?",
  "Bu hafta yangın alarmı oldu mu?",
];

const now = () => new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

export default function Chatbot() {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "bot", text: locale === "EN" ? "Hello! I am HypeVision AI Assistant. I can help you with cameras, violations, and safety analytics." : "Merhaba! Ben HypeVision AI Asistan. Kamera, ihlal, yangın, KKD ve personel verileri hakkında sorularınızı yanıtlayabilirim.", time: now() },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg = { role: "user", text: trimmed, time: now() };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.fetchChatResponse(trimmed);
      const botMsg = { role: "bot", text: res.response, time: now() };
      setMessages((p) => [...p, botMsg]);
    } catch {
      setMessages((p) => [...p, { role: "bot", text: locale === "EN" ? "I am sorry, I cannot respond right now. Please try again." : "Üzgünüm, şu anda yanıt veremiyorum. Lütfen tekrar deneyin.", time: now() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl shadow-[0_8px_30px_rgba(11,60,93,0.35)] flex items-center justify-center text-white transition-all duration-300 hover:scale-110 hover:shadow-[0_12px_40px_rgba(0,188,212,0.4)] ${
          open ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100 animate-bounce-slow"
        }`}
        style={{ background: "linear-gradient(135deg, #0B3C5D, #00BCD4)" }}
      >
        <MessageCircle size={22} />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#00BCD4] rounded-full border-2 border-white animate-pulse" />
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 z-40 w-[360px] max-w-[calc(100vw-32px)] transition-all duration-300 ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="bg-[var(--bg-card)] rounded-3xl shadow-[0_16px_60px_rgba(11,60,93,0.35)] border border-[var(--border)] flex flex-col overflow-hidden" style={{ maxHeight: "620px", height: "620px" }}>
          {/* Header */}
          <div className="px-4 py-3.5 flex items-center justify-between flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0B3C5D, #0D4A72)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                <Bot size={15} className="text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-bold flex items-center gap-1.5">
                  HypeVision AI
                  <span className="w-2 h-2 rounded-full bg-[#00BCD4] animate-pulse" />
                </p>
                <p className="text-white/50 text-[10px]">{locale === "EN" ? "Online · Responds instantly" : "Çevrimiçi · Hemen yanıt veriyor"}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-xl hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-[var(--bg-table-head)]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {msg.role === "bot" && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "linear-gradient(135deg, #0B3C5D, #00BCD4)" }}>
                    <Bot size={10} className="text-white" />
                  </div>
                )}
                <div className={`flex flex-col max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "text-white rounded-tr-sm"
                      : "bg-[var(--bg-card)] text-[var(--text-primary)] rounded-tl-sm border border-[var(--border)]"
                  }`}
                    style={msg.role === "user" ? { background: "linear-gradient(135deg, #0B3C5D, #00BCD4)" } : undefined}
                  >
                    {msg.text}
                  </div>
                  <p className="text-[9px] text-[var(--text-muted)] mt-1 px-1">{msg.time}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-end gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #0B3C5D, #00BCD4)" }}>
                  <Bot size={10} className="text-white" />
                </div>
                <div className="bg-[var(--bg-card)] rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-1.5 border border-[var(--border)]">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#00BCD4] animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Questions */}
          {messages.length <= 2 && !loading && (
            <div className="px-3 pb-2 flex-shrink-0">
              <p className="text-[9px] text-[var(--text-muted)] mb-1.5 font-bold uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={9} /> {locale === "EN" ? "Quick Questions" : "Hızlı Sorular"}
              </p>
              <div className="flex flex-wrap gap-1">
                {QUICK_QUESTIONS.map((q) => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[#00BCD4]/10 text-[#00BCD4] hover:bg-[#00BCD4]/20 transition-colors border border-[#00BCD4]/20">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-1.5 border-t border-[var(--border)] bg-[var(--bg-card)] flex-shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                placeholder={locale === "EN" ? "Type your message..." : "Mesajınızı yazın..."}
                className="flex-1 bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00BCD4] transition"
              />
              <button onClick={() => sendMessage(input)} disabled={!input.trim()}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white hover:shadow-[0_4px_16px_rgba(0,188,212,0.4)] transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #0B3C5D, #00BCD4)" }}>
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
