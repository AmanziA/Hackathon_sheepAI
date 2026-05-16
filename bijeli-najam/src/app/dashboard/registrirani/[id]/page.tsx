import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { BackLink } from "@/components/domain/back-link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  MapPin,
  Bed,
  Star,
  User,
  ArrowSquareOut,
  Lightning,
  Drop,
  CalendarBlank,
  ListBullets,
} from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/utils/supabase/server";
import { EvisitorRecordPanel } from "@/components/domain/evisitor-panel";
import { DiscoveryTrigger } from "@/components/domain/discovery-trigger";
import { StaysCalendar } from "@/components/domain/stays-calendar";
import { RecentStaysTable } from "@/components/domain/recent-stays-table";
import {
  evisitorFor,
  staysFor,
  occupancyByDay,
  hepFor,
  vodovodFor,
  monitoringStatusFor,
  type EvisitorRecord,
  type UtilityReading,
} from "@/lib/evisitor-mock";
import { demoAlertById } from "@/lib/monitoring-demo";
import { cn } from "@/lib/utils";
import type { RegisteredUnit } from "../registrirani-client";

export const dynamic = "force-dynamic";

const MOCK_BY_ID: Record<string, RegisteredUnit> = {
  r1:  { id: "r1",  name: "Apartman Kovač",   owner: "Kovač Ivan",   neighborhood: "Meje",       address: "Šetalište I. Meštrovića 22", street: null, number: null, beds: 6, category: "Apartman",        stars: 3,    scraped_at: "2026-05-14" },
  r2:  { id: "r2",  name: "Sobe Marović",     owner: "Marović Ante", neighborhood: "Veli Varoš", address: "Ulica od Pjace 8",           street: null, number: null, beds: 2, category: "Soba",            stars: null, scraped_at: "2026-05-14" },
  r3:  { id: "r3",  name: "Studio Sunčani",   owner: "Sunčić Josip", neighborhood: "Spinut",     address: "Spinutska 44",               street: null, number: null, beds: 6, category: "Studio apartman", stars: 2,    scraped_at: "2026-05-14" },
};

interface Props {
  params: Promise<{ id: string }>;
}

function formatAddress(u: RegisteredUnit): string {
  if (u.address) return u.address;
  const parts = [u.street, u.number].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

const STATUS_BADGE: Record<
  ReturnType<typeof monitoringStatusFor>["kind"],
  { label: string; cls: string }
> = {
  occupied_reporting: {
    label: "Aktivan i prijavljuje",
    cls: "border-success/40 text-success bg-success/5",
  },
  occupied_silent: {
    label: "Aktivan ali ne prijavljuje",
    cls: "border-destructive/40 text-destructive bg-destructive/5",
  },
  empty_reporting: {
    label: "Prijavljuje, ali prazan",
    cls: "border-destructive/40 text-destructive bg-destructive/5",
  },
  empty_silent: {
    label: "Prazan",
    cls: "border-muted-foreground/40 text-muted-foreground bg-muted/40",
  },
};

export default async function RegistriraniDetailPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const demoAlert = demoAlertById(id);

  const result = demoAlert
    ? { data: null, error: null }
    : await supabase
        .from("registered_units")
        .select(
          "id, name, owner, neighborhood, address, street, number, beds, category, stars, scraped_at"
        )
        .eq("id", id)
        .limit(1);
  const data = (result.data ?? [])[0] ?? null;

  let unit: RegisteredUnit | null = (data as RegisteredUnit | null) ?? MOCK_BY_ID[id] ?? null;
  if (!unit && demoAlert) {
    unit = {
      id: demoAlert.id,
      name: demoAlert.name,
      owner: demoAlert.owner,
      neighborhood: demoAlert.neighborhood,
      address: null,
      street: null,
      number: null,
      beds: demoAlert.beds,
      category: "Apartman",
      stars: null,
      scraped_at: "2026-05-14",
    };
  }
  if (!unit) notFound();

  const baseRecord = evisitorFor({
    id: unit.id,
    name: unit.name,
    beds: unit.beds,
    category: unit.category,
  });
  const record: EvisitorRecord = demoAlert
    ? {
        ...baseRecord,
        mbo: demoAlert.mbo,
        status: demoAlert.status === "empty_reporting" ? "aktivan" : "aktivan",
        registered_beds: demoAlert.beds ?? baseRecord.registered_beds,
        reported_nights_ytd: demoAlert.reported_nights_ytd,
        last_check_in_at: demoAlert.last_check_in_at,
        tax_paid_ytd_eur:
          Math.round(demoAlert.reported_nights_ytd * 1.65 * 100) / 100,
      }
    : baseRecord;
  const stays = staysFor({ id: unit.id });
  const calendar = occupancyByDay(stays, 90);
  const baseHep = hepFor({ id: unit.id });
  const baseVod = vodovodFor({ id: unit.id });
  const hep: UtilityReading = demoAlert
    ? {
        ...baseHep,
        avg_per_period: demoAlert.hep_kwh_per_day,
        last_value: demoAlert.hep_kwh_per_day,
        occupancy_ratio:
          Math.round((demoAlert.hep_kwh_per_day / baseHep.baseline_empty) * 10) / 10,
      }
    : baseHep;
  const vodovod: UtilityReading = demoAlert
    ? {
        ...baseVod,
        avg_per_period: demoAlert.vodovod_m3_per_month,
        last_value: demoAlert.vodovod_m3_per_month,
        occupancy_ratio:
          Math.round((demoAlert.vodovod_m3_per_month / baseVod.baseline_empty) * 10) / 10,
      }
    : baseVod;
  const monitoring = demoAlert
    ? { kind: demoAlert.status, reason: demoAlert.reason }
    : monitoringStatusFor(unit);
  const monitoringMeta = STATUS_BADGE[monitoring.kind];

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <BackLink fallback="/dashboard/registrirani" label="← Natrag" />

      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} weight="fill" className="text-success" />
              <h1 className="text-2xl font-semibold tracking-tight">{unit.name ?? "—"}</h1>
            </div>
            <p className="text-sm text-muted-foreground">Registrirani objekt · HTZ snimak</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {unit.category && (
              <Badge variant="outline" className="text-sm">
                {unit.category}
              </Badge>
            )}
            <Badge variant="outline" className={cn("text-xs", monitoringMeta.cls)}>
              {monitoringMeta.label}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {unit.owner && (
            <span className="flex items-center gap-1.5">
              <User size={14} />
              {unit.owner}
            </span>
          )}
          {unit.neighborhood && (
            <span className="flex items-center gap-1.5">
              <MapPin size={14} />
              {unit.neighborhood}, Split
            </span>
          )}
          {unit.beds != null && (
            <span className="flex items-center gap-1.5">
              <Bed size={14} />
              {unit.beds} kreveta
            </span>
          )}
          {unit.stars != null && (
            <span className="flex items-center gap-1.5">
              <Star size={14} weight="fill" className="text-warning" />
              {unit.stars}
            </span>
          )}
        </div>

        <p className="text-sm">{formatAddress(unit)}</p>
      </header>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          eVisitor evidencija
        </h2>
        <EvisitorRecordPanel record={record} expectedBeds={unit.beds} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <CalendarBlank size={14} />
          Kalendar zauzetosti
        </h2>
        <div className="rounded-lg border p-4">
          <StaysCalendar occupancyByDay={calendar} daysBack={90} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <ListBullets size={14} />
          Posljednje prijave noćenja
        </h2>
        <RecentStaysTable stays={stays} limit={10} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Komunalna provjera ({monitoring.kind === "empty_silent" ? "stan miruje" : "live podaci"})
        </h2>
        <p className="text-sm text-muted-foreground">{monitoring.reason}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Lightning size={14} className="text-warning" />
              HEP — struja
            </div>
            <p className="text-lg font-semibold tabular-nums">
              {hep.avg_per_period} <span className="text-xs font-normal text-muted-foreground">kWh/dan</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {hep.occupancy_ratio.toFixed(1)}× iznad praznog stana ({hep.baseline_empty} kWh/dan baseline)
            </p>
            <a
              href="https://mojracun.hep.hr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              mojracun.hep.hr <ArrowSquareOut size={11} />
            </a>
          </div>
          <div className="rounded-lg border p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Drop size={14} className="text-primary" />
              Vodovod — voda
            </div>
            <p className="text-lg font-semibold tabular-nums">
              {vodovod.avg_per_period} <span className="text-xs font-normal text-muted-foreground">m³/mj</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {vodovod.occupancy_ratio.toFixed(1)}× iznad praznog stana ({vodovod.baseline_empty} m³/mj baseline)
            </p>
            <a
              href="https://www.vik-split.hr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              vik-split.hr <ArrowSquareOut size={11} />
            </a>
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          AI istraga online oglasa
        </h2>
        <DiscoveryTrigger registeredId={unit.id} unitName={unit.name} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Izvor
        </h2>
        <a
          href="https://www.accommodation.croatia.hr"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          accommodation.croatia.hr <ArrowSquareOut size={14} />
        </a>
      </section>
    </div>
  );
}
