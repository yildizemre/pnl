import { useTheme } from "../context/ThemeContext";
import logoDark from "../public/beyaz.png";
import logoLight from "../public/siyah.png";

/**
 * Koyu (siyah) tema → beyaz.png
 * Açık (beyaz) tema → siyah.png
 */
export default function HypeLogo({ className = "h-8 w-auto max-w-[180px]", centered = false }) {
  const { isDark } = useTheme();
  const src = isDark ? logoDark : logoLight;

  return (
    <img
      src={src}
      alt="HypeVision"
      className={`object-contain ${centered ? "object-center mx-auto" : "object-left"} ${className}`}
      draggable={false}
    />
  );
}
