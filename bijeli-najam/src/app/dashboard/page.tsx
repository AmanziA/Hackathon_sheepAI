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

  const monitoringAlerts: MonitoringAlert[] = registered
    .map(toMonitoringAlert)
    .filter((a): a is MonitoringAlert => a !== null);

  return <DashboardClient flags={flags} monitoringAlerts={monitoringAlerts} />;
}
