import { useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useLocale } from "../context/LocaleContext";

const STEPS = ["step1", "step2", "step3"];

export default function OnboardingTour({ open, onComplete }) {
  const { t } = useLocale();
  const [step, setStep] = useState(0);

  if (!open) return null;

  const finish = () => {
    setStep(0);
    onComplete(true);
  };

  const next = () => {
    if (step >= STEPS.length - 1) finish();
    else setStep((s) => s + 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={finish} aria-label={t.kapat} />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl">
        <button
          type="button"
          onClick={finish}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-500">
          {t.onboardingTitle} · {step + 1}/{STEPS.length}
        </p>
        <h3 className="mt-2 text-lg font-bold text-[var(--text-primary)]">{t[`onboarding_${STEPS[step]}_title`]}</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{t[`onboarding_${STEPS[step]}_body`]}</p>
        <div className="mt-6 flex gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-cyan-500" : "bg-[var(--border)]"}`} />
          ))}
        </div>
        <button type="button" onClick={next} className="btn-primary mt-6 w-full">
          {step < STEPS.length - 1 ? t.onboardingNext : t.onboardingDone}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
