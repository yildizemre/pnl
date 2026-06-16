import { useMemo, useState } from "react";
import { useLocale } from "../../context/LocaleContext";
import { buildTimelineEvents, snapshotAt } from "../../data/timelineEvents";

const TYPE_COLOR = {
  isg: "#f87171",
  sayim: "#a78bfa",
  mes: "#38bdf8",
  urun: "#34d399",
  personel: "#fbbf24",
};

export default function OperationsTimeline({ notifications = [] }) {
  const { t, locale } = useLocale();
  const events = useMemo(() => buildTimelineEvents(notifications, locale), [notifications, locale]);
  const [hour, setHour] = useState(9);

  const snapshot = snapshotAt(events, hour);
  const timeLabel = `${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.round((hour % 1) * 60)).padStart(2, "0")}`;

  return (
    <div className="timeline-shell panel">
      <div className="panel-header">
        <div>
          <h3>{t.modeTimeline}</h3>
          <p>{t.timelineDesc}</p>
        </div>
        <span className="timeline-clock">{timeLabel}</span>
      </div>

      <div className="panel-body">
        <div className="timeline-snapshot">
          <div className="timeline-snapshot-title">{t.timelineSnapshot} · {timeLabel}</div>
          <div className="timeline-snapshot-grid">
            <div><span className="ts-val">%{snapshot.verim}</span><span className="ts-lbl">{t.kpiOrtVerimlilik}</span></div>
            <div><span className="ts-val">{snapshot.personel}</span><span className="ts-lbl">{t.kpiAktifPersonel}</span></div>
            <div><span className="ts-val">{snapshot.urun?.toLocaleString?.() ?? snapshot.urun}</span><span className="ts-lbl">{t.kpiUrunSayim}</span></div>
            <div><span className="ts-val">{snapshot.bildirim}</span><span className="ts-lbl">{t.kpiOkunmamisBildirim}</span></div>
          </div>
        </div>

        <div className="timeline-track-wrap">
          <input
            type="range"
            min={6}
            max={22}
            step={0.25}
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="timeline-slider"
            aria-label={t.modeTimeline}
          />
          <div className="timeline-track">
            <div className="timeline-rail" />
            <div className="timeline-playhead" style={{ left: `${((hour - 6) / 16) * 100}%` }} />
            {events.map((ev) => {
              const left = ((ev.hour - 6) / 16) * 100;
              if (left < 0 || left > 100) return null;
              return (
                <button
                  key={ev.id}
                  type="button"
                  className="timeline-event"
                  style={{ left: `${left}%`, background: TYPE_COLOR[ev.type] || "#38bdf8" }}
                  title={`${ev.time} — ${ev.label}`}
                  onClick={() => setHour(ev.hour)}
                />
              );
            })}
          </div>
          <div className="timeline-hours">
            {Array.from({ length: 17 }, (_, i) => 6 + i).map((h) => (
              <span key={h}>{String(h).padStart(2, "0")}:00</span>
            ))}
          </div>
        </div>

        <ul className="timeline-event-list">
          {events
            .filter((e) => Math.abs(e.hour - hour) < 1.2)
            .map((e) => (
              <li key={e.id}>
                <span className="timeline-ev-time">{e.time}</span>
                <span className="timeline-ev-dot" style={{ background: TYPE_COLOR[e.type] }} />
                <span>{e.label}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
