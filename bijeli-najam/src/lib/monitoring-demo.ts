import type { MonitoringAlert } from "@/app/dashboard/dashboard-client";

export const DEMO_MONITORING_ALERTS: MonitoringAlert[] = [
  {
    id: "demo-mon-1",
    name: "Apartman Marin — Bačvice",
    owner: "Marin Kovačić",
    neighborhood: "Bačvice",
    beds: 4,
    lat: 43.5058,
    lon: 16.4498,
    status: "occupied_silent",
    reason:
      "HEP 12.4 kWh/dan i Vodovod 7.8 m³/mj pokazuju kontinuiranu zauzetost, ali u eVisitoru samo 18 prijavljenih noćenja u 2026.",
    hep_kwh_per_day: 12.4,
    vodovod_m3_per_month: 7.8,
    reported_nights_ytd: 18,
    mbo: "HR-ST-204117",
    last_check_in_at: "2026-02-21T00:00:00Z",
  },
  {
    id: "demo-mon-2",
    name: "Studio Lovre — Veli Varoš",
    owner: "Lovre Bilić",
    neighborhood: "Veli Varoš",
    beds: 2,
    lat: 43.5081,
    lon: 16.4372,
    status: "occupied_silent",
    reason:
      "Potrošnja struje 9.6 kWh/dan zadnja 4 mjeseca — 5× iznad praznog stana. eVisitor: 0 prijavljenih noćenja u 2026.",
    hep_kwh_per_day: 9.6,
    vodovod_m3_per_month: 6.2,
    reported_nights_ytd: 0,
    mbo: "HR-ST-318042",
    last_check_in_at: null,
  },
  {
    id: "demo-mon-3",
    name: "Sobe Dora — Spinut",
    owner: "Dora Vukšić",
    neighborhood: "Spinut",
    beds: 3,
    lat: 43.5128,
    lon: 16.4418,
    status: "empty_reporting",
    reason:
      "eVisitor: 142 prijavljena noćenja u 2026, ali HEP samo 1.4 kWh/dan i Vodovod 2.1 m³/mj — gotovo prazan stan. Moguće lažno prijavljivanje.",
    hep_kwh_per_day: 1.4,
    vodovod_m3_per_month: 2.1,
    reported_nights_ytd: 142,
    mbo: "HR-ST-451883",
    last_check_in_at: "2026-05-09T00:00:00Z",
  },
];

export function demoAlertById(id: string): MonitoringAlert | undefined {
  return DEMO_MONITORING_ALERTS.find((a) => a.id === id);
}
