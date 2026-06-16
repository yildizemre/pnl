import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, Bot, Flame, GraduationCap, List } from "lucide-react";
import { useLocale } from "../context/LocaleContext";
import { translateSeviye } from "../i18n/helpers";
import FilterBar from "../components/FilterBar";
import { Panel, StatCard } from "../components/ui";
import NotificationTable from "../components/notifications/NotificationTable";
import NotificationDetailModal from "../components/notifications/NotificationDetailModal";
import NotificationInsightsView from "../components/notifications/NotificationInsightsView";
import TrainingFeedbackView from "../components/notifications/TrainingFeedbackView";
import {
  EVENT_TYPES, SEVIYELER, countByEventType, kritikCount,
} from "../data/notificationTypes";

const TABS = [
  { id: "liste", icon: List, labelKey: "notifTabListe" },
  { id: "analiz", icon: Bot, labelKey: "notifTabAnaliz" },
  { id: "egitim", icon: GraduationCap, labelKey: "notifTabEgitim" },
];

export default function NotificationsView({ data, onNotificationUpdated }) {
  const { t, locale } = useLocale();
  const dates = data.dates || [];
  const [tab, setTab] = useState("liste");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("tumu");
  const [seviyeFilter, setSeviyeFilter] = useState("tumu");
  const [selected, setSelected] = useState(null);

  const list = data.notifications || [];

  useEffect(() => {
    if (dates[0]) setDate(dates[0]);
  }, [dates[0]]);

  const filtered = useMemo(() => {
    return list.filter((n) => {
      if (date && n.tarih !== date) return false;
      if (eventFilter !== "tumu" && n.kategori !== eventFilter) return false;
      if (seviyeFilter !== "tumu" && n.seviye !== seviyeFilter) return false;
      const q = search.toLowerCase();
      if (!q) return true;
      return [n.baslik, n.detay, n.kamera, n.kategori, n.modul].some((x) =>
        String(x).toLowerCase().includes(q)
      );
    });
  }, [list, date, search, eventFilter, seviyeFilter]);

  const typeCounts = useMemo(() => countByEventType(filtered), [filtered]);
  const kritik = kritikCount(filtered);
  const unread = filtered.filter((n) => !n.okundu).length;

  return (
    <div className="notif-page">
      <div className="notif-page-tabs" role="tablist">
        {TABS.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "dash-pill dash-pill--active" : "dash-pill"}
            onClick={() => setTab(id)}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{t[labelKey]}</span>
          </button>
        ))}
      </div>

      {tab === "analiz" ? (
        <NotificationInsightsView dates={dates} />
      ) : tab === "egitim" ? (
        <TrainingFeedbackView />
      ) : (
        <>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t.bildirimAra}
            date={date}
            onDateChange={setDate}
            dates={dates}
            showGranularity={false}
          />

          <div className="notif-summary-row">
            <StatCard title={t.toplamFiltre} value={filtered.length} subtitle={t.seciliTarihArama} icon={Bell} accent="blue" />
            <StatCard title={t.okunmamisKritik} value={kritik} subtitle={t.acilMudahale} icon={AlertTriangle} accent="red" />
            <StatCard title={t.okunmamis} value={unread} subtitle={t.bekleyenKayit} icon={Bell} accent="orange" />
            <StatCard title={t.olayTipleri} value={EVENT_TYPES.filter((e) => typeCounts[e.id] > 0).length} subtitle={t.aktifAlgilama} icon={Flame} accent="cyan" />
          </div>

          <Panel title={t.olayTipiKpi} subtitle={t.olayTipiKpiAlt} className="notif-events-panel">
            <div className="notif-event-kpis">
              <button
                type="button"
                className={`notif-event-kpi ${eventFilter === "tumu" ? "notif-event-kpi--active" : ""}`}
                onClick={() => setEventFilter("tumu")}
              >
                <span className="notif-event-kpi-val">{filtered.length}</span>
                <span className="notif-event-kpi-lbl">{t.tumKategoriler}</span>
              </button>
              {EVENT_TYPES.map((ev) => {
                const Icon = ev.icon;
                const cnt = typeCounts[ev.id] || 0;
                if (cnt === 0 && eventFilter !== ev.id) return null;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    className={`notif-event-kpi ${eventFilter === ev.id ? "notif-event-kpi--active" : ""}`}
                    style={{ "--ev-color": ev.color }}
                    onClick={() => setEventFilter(eventFilter === ev.id ? "tumu" : ev.id)}
                  >
                    <Icon className="notif-event-kpi-icon" />
                    <span className="notif-event-kpi-val">{cnt}</span>
                    <span className="notif-event-kpi-lbl">{locale === "EN" ? ev.labelEn : ev.labelTr}</span>
                    <span className="notif-event-kpi-desc">{locale === "EN" ? ev.descEn : ev.descTr}</span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <div className="notif-sev-filters">
            {["tumu", ...SEVIYELER].map((s) => (
              <button
                key={s}
                type="button"
                className={seviyeFilter === s ? "notif-sev-pill notif-sev-pill--active" : "notif-sev-pill"}
                onClick={() => setSeviyeFilter(s)}
              >
                {s === "tumu" ? t.tumSeviyeler : translateSeviye(locale, s)}
              </button>
            ))}
          </div>

          <Panel
            title={t.bildirimTablosu}
            subtitle={`${filtered.length} ${t.kayit} · ${t.gorselOnizleme}`}
            className="notif-table-panel"
            flush
          >
            <NotificationTable items={filtered} onSelect={setSelected} onUpdated={onNotificationUpdated} />
          </Panel>

          {selected && (
            <NotificationDetailModal
              item={selected}
              onClose={() => setSelected(null)}
              onUpdated={(item) => {
                onNotificationUpdated?.(item);
                setSelected(item);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
