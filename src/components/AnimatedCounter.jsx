import { useEffect, useState } from "react";

export default function AnimatedCounter({ value = 0, prefix = "", suffix = "", decimals = 0, locale = "tr-TR" }) {
  const [display, setDisplay] = useState(0);
  const target = Number(value) || 0;

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    let frame;

    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - p) ** 3;
      setDisplay(target * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const formatted = display.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className="tabular-nums">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
