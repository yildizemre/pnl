import { Map, MessageSquare, LayoutGrid, Clock, Layers } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";

const MODES = [
  { id: "overview", icon: Layers, labelKey: "modeOverview" },
  { id: "dashboard", icon: LayoutGrid, labelKey: "modeDashboard" },
  { id: "twin", icon: Map, labelKey: "modeTwin" },
  { id: "timeline", icon: Clock, labelKey: "modeTimeline" },
  { id: "assistant", icon: MessageSquare, labelKey: "modeAssistant" },
];

export default function ExperienceModeTabs({ value, onChange }) {
  const { t } = useLocale();

  return (
    <div className="experience-tabs" role="tablist">
      {MODES.map(({ id, icon: Icon, labelKey }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`experience-tab ${value === id ? "experience-tab--active" : ""}`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{t[labelKey]}</span>
        </button>
      ))}
    </div>
  );
}
