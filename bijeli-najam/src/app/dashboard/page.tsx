import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { DashboardClient, type MonitoringAlert } from "./dashboard-client";
import { MOCK_FLAGS } from "@/lib/mock-data";
import {
  evisitorFor,
  hepFor,
  vodovodFor,
  monitoringStatusFor,
} from "@/lib/evisitor-mock";
import type { Flag } from "@/lib/types";

export const dynamic = "force-dynamic";

type RegisteredRow = {
  id: string;
  name: string | null;
  owner: string | null;
  neighborhood: string | null;
  beds: number | null;
  category: string | null;
  lat: number | null;
  lon: number | null;
};

const MOCK_REGISTERED: RegisteredRow[] = [
  { id: "r1",  name: "Apartman Kovač",            owner: "Kovač Ivan",          neighborhood: "Meje",       beds: 6, category: "Apartman",        lat: 43.5078, lon: 16.4290 },
  { id: "r3",  name: "Studio Sunčani",            owner: "Sunčić Josip",        neighborhood: "Spinut",     beds: 6, category: "Studio apartman", lat: 43.5130, lon: 16.4420 },
  { id: "r5",  name: "Kuća za odmor Luka",        owner: "Lukić Luka",          neighborhood: "Žnjan",      beds: 8, category: "Kuća za odmor",   lat: 43.4990, lon: 16.4600 },
  { id: "r7",  name: "Apartman Stjepan",          owner: "Stjepanović Stjepan", neighborhood: "Sućidar",    beds: 5, category: "Apartman",        lat: 43.5120, lon: 16.4480 },
  { id: "r11", name: "Apartman Vila Ruža",        owner: "Ružić Ruža",          neighborhood: "Bačvice",    beds: 3, category: "Apartman",        lat: 43.5055, lon: 16.4501 },
  { id: "r14", name: "Apartman Katarina",         owner: "Katarić Katarina",    neighborhood: "Žnjan",      beds: 4, category: "Apartman",        lat: 43.5005, lon: 16.4620 },
];

function toMonitoringAlert(u: RegisteredRow): MonitoringAlert | null {
  const status = monitoringStatusFor({
    id: u.id,
    name: u.name,
    beds: u.beds,
    category: u.category,
  });
  if (status.kind !== "occupied_silent" && status.kind !== "empty_reporting") return null;

  const record = evisitorFor({ id: u.id, name: u.name, beds: u.beds, category: u.category });
  const hep = hepFor({ id: u.id });
  const vodovod = vodovodFor({ id: u.id });

  return {
    id: u.id,
    name: u.name ?? "—",
    owner: u.owner,
    neighborhood: u.neighborhood,
    beds: u.beds,
    lat: u.lat,
    lon: u.lon,
    status: status.kind,
    reason: status.reason,
    hep_kwh_per_day: hep.avg_per_period,
    vodovod_m3_per_month: vodovod.avg_per_period,
    reported_nights_ytd: record.reported_nights_ytd,
    mbo: record.mbo,
    last_check_in_at: record.last_check_in_at,
  };
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [flagsRes, registeredRes] = await Promise.all([
    supabase
      .from("flags")
      .select(
        "id, candidate_id, entity_link_id, trace_id, confidence_unregistered, status, evidence_pdf_url, screenshot_url, notes, created_at, updated_at, candidate_listings(*), agent_traces(*)"
      )
      .order("confidence_unregistered", { ascending: false })
      .limit(500),
    supabase
      .from("registered_units")
      .select("id, name, owner, neighborhood, beds, category, lat, lon")
      .limit(500),
  ]);

  const flags: Flag[] =
    flagsRes.data && flagsRes.data.length > 0
      ? (flagsRes.data as unknown as Flag[])
      : MOCK_FLAGS;

  const registered: RegisteredRow[] =
    (registeredRes.data as RegisteredRow[] | null)?.length
      ? (registeredRes.data as RegisteredRow[])
      : MOCK_REGISTERED;

  const computed: MonitoringAlert[] = registered
    .map(toMonitoringAlert)
    .filter((a): a is MonitoringAlert => a !== null);

  const monitoringAlerts: MonitoringAlert[] = [
    ...DEMO_MONITORING_ALERTS,
    ...computed.filter((c) => !DEMO_MONITORING_ALERTS.some((d) => d.id === c.id)),
  ];

  return <DashboardClient flags={flags} monitoringAlerts={monitoringAlerts} />;
}

const DEMO_MONITORING_ALERTS: MonitoringAlert[] = [
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
