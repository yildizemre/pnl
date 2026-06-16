import { Video } from "lucide-react";
import { useLocale } from "../context/LocaleContext";

export default function CameraGrid({ cameras = [] }) {
  const { t } = useLocale();
  const items = (cameras || []).slice(0, 6);

  if (!items.length) return null;

  return (
    <div className="camera-grid">
      {items.map((cam, i) => (
        <div key={cam.id || i} className="camera-tile">
          <div className="camera-tile-visual">
            <div className="camera-tile-scan" />
            <Video className="camera-tile-icon" />
            <span className="camera-live-badge">
              <span className="camera-live-dot" />
              {t.canli}
            </span>
          </div>
          <p className="camera-tile-name">{cam.ad || `${t.kameraAlan} ${i + 1}`}</p>
          <p className="camera-tile-mod">{cam.modul || "genel"}</p>
        </div>
      ))}
    </div>
  );
}
