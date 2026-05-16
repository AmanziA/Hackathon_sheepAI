import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {
  evisitorFor,
  hepFor,
  vodovodFor,
  monitoringStatusFor,
} from "@/lib/evisitor-mock";
import { MonitoringClient, type MonitoringRow } from "./monitoring-client";

export const dynamic = "force-dynamic";

type RegisteredUnitRow = {
  id: string;
  name: string | null;
  owner: string | null;
  neighborhood: string | null;
  beds: number | null;
  category: string | null;
};

const MOCK: RegisteredUnitRow[] = [
  { id: "r1",  name: "Apartman Kovač",            owner: "Kovač Ivan",          neighborhood: "Meje",       beds: 6, category: "Apartman" },
  { id: "r2",  name: "Sobe Marović",              owner: "Marović Ante",        neighborhood: "Veli Varoš", beds: 2, category: "Soba" },
  { id: "r3",  name: "Studio Sunčani",            owner: "Sunčić Josip",        neighborhood: "Spinut",     beds: 6, category: "Studio apartman" },
  { id: "r4",  name: "Apartman Jadran",           owner: "Perić Mara",          neighborhood: "Bačvice",    beds: 4, category: "Apartman" },
  { id: "r5",  name: "Kuća za odmor Luka",        owner: "Lukić Luka",          neighborhood: "Žnjan",      beds: 8, category: "Kuća za odmor" },
  { id: "r6",  name: "Sobe Toni",                 owner: "Antunović Toni",      neighborhood: "Firule",     beds: 3, category: "Soba" },
  { id: "r7",  name: "Apartman Stjepan",          owner: "Stjepanović Stjepan", neighborhood: "Sućidar",    beds: 5, category: "Apartman" },
  { id: "r8",  name: "Stari grad sobe",           owner: "Grubić Ana",          neighborhood: "Grad",       beds: 2, category: "Soba" },
  { id: "r9",  name: "Apartments Duje",           owner: "Dujmović Duje",       neighborhood: "Trstenik",   beds: 4, category: "Apartman" },
  { id: "r10", name: "Soba more",                 owner: "Morić Pero",          neighborhood: "Meje",       beds: 2, category: "Soba" },
];

function toRow(u: RegisteredUnitRow): MonitoringRow {
  const record = evisitorFor({
    id: u.id,
    name: u.name,
    beds: u.beds,
    category: u.category,
  });
  const hep = hepFor({ id: u.id });
  const vodovod = vodovodFor({ id: u.id });
  const status = monitoringStatusFor({
    id: u.id,
    name: u.name,
    beds: u.beds,
    category: u.category,
  });
  return {
    id: u.id,
    name: u.name ?? "—",
    owner: u.owner,
    neighborhood: u.neighborhood,
    beds: u.beds,
    status: status.kind,
    hep_kwh_per_day: hep.avg_per_period,
    vodovod_m3_per_month: vodovod.avg_per_period,
    reported_nights_ytd: record.reported_nights_ytd,
    last_check_in_at: record.last_check_in_at,
  };
}

export default async function MonitoringPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from("registered_units")
    .select("id, name, owner, neighborhood, beds, category")
    .limit(500);

  const units: RegisteredUnitRow[] =
    ((data as RegisteredUnitRow[] | null) ?? []).length > 0
      ? (data as RegisteredUnitRow[])
      : MOCK;

  const rows = units.map(toRow);

  const counts = rows.reduce(
    (acc, r) => {
      acc[r.status]++;
      return acc;
    },
    { occupied_reporting: 0, occupied_silent: 0, empty_silent: 0, empty_reporting: 0 }
  );

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Praćenje zauzetosti</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Križna provjera HEP/Vodovod potrošnje s prijavama u eVisitoru. Crveni status označava
          nesuglasje — registrirani objekti koji ili ne prijavljuju iako su zauzeti, ili
          prijavljuju a komunalije pokazuju prazno.
        </p>
      </div>

      <MonitoringClient rows={rows} />
    </div>
  );
}
