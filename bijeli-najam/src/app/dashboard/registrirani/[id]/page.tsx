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
  unreportedOnlineDays,
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

  // Count how many online listings the AI agent has matched to this unit.
  // Only units with at least one matched candidate get red discrepancy cells.
  const { count: matchedListingCount } = await supabase
    .from("entity_links")
    .select("id", { count: "exact", head: true })
    .eq("registered_id", unit.id)
    .eq("verdict", "matched");

  const unreported = unreportedOnlineDays(
    { id: unit.id, name: unit.name, beds: unit.beds, category: unit.category },
    { daysBack: 90, matchedListingCount: matchedListingCount ?? 0 },
  );
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
    <div className="max-w-5xl mx-auto px-6 py-5 space-y-4">
      <BackLink fallback="/dashboard/registrirani" label="← Natrag" />

      {/* Compact header — title + chips + address in two tight rows */}
      <header className="space-y-1.5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle size={16} weight="fill" className="text-success shrink-0" />
            <h1 className="text-xl font-semibold tracking-tight truncate">{unit.name ?? "—"}</h1>
            {unit.category && (
              <Badge variant="outline" className="text-xs">
                {unit.category}
              </Badge>
            )}
          </div>
          <Badge variant="outline" className={cn("text-xs", monitoringMeta.cls)}>
            {monitoringMeta.label}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {formatAddress(unit)}
            {unit.neighborhood ? ` · ${unit.neighborhood}` : ""}
          </span>
          {unit.owner && (
            <span className="flex items-center gap-1">
              <User size={12} />
              {unit.owner}
            </span>
          )}
          {unit.beds != null && (
            <span className="flex items-center gap-1">
              <Bed size={12} />
              {unit.beds} kreveta
            </span>
          )}
          {unit.stars != null && (
            <span className="flex items-center gap-1">
              <Star size={12} weight="fill" className="text-warning" />
              {unit.stars}
            </span>
          )}
        </div>
      </header>

      {/* Above-the-fold 2-col band: AI istraga (left, primary) + eVisitor + utility summary (right) */}
      <div className="grid lg:grid-cols-2 gap-3 items-stretch">
        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            AI istraga online oglasa
          </h2>
          <div className="flex-1">
            <DiscoveryTrigger registeredId={unit.id} unitName={unit.name} />
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            eVisitor evidencija
          </h2>
          <div className="flex-1">
            <EvisitorRecordPanel record={record} expectedBeds={unit.beds} />
          </div>
        </section>
      </div>

      {/* Compact utility row */}
      <section className="space-y-1.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Komunalna provjera — {monitoring.kind === "empty_silent" ? "stan miruje" : "live podaci"}
        </h2>
        <p className="text-xs text-muted-foreground">{monitoring.reason}</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <div className="rounded-md border px-3 py-2 flex items-center gap-3">
            <Lightning size={14} className="text-warning shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">HEP struja</div>
              <div className="text-sm tabular-nums">
                <span className="font-semibold">{hep.avg_per_period}</span>
                <span className="text-xs text-muted-foreground"> kWh/dan</span>
                <span className="text-xs text-muted-foreground"> · {hep.occupancy_ratio.toFixed(1)}× baseline</span>
              </div>
            </div>
            <a
              href="https://mojracun.hep.hr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary shrink-0"
              aria-label="mojracun.hep.hr"
            >
              <ArrowSquareOut size={12} />
            </a>
          </div>
          <div className="rounded-md border px-3 py-2 flex items-center gap-3">
            <Drop size={14} className="text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Vodovod</div>
              <div className="text-sm tabular-nums">
                <span className="font-semibold">{vodovod.avg_per_period}</span>
                <span className="text-xs text-muted-foreground"> m³/mj</span>
                <span className="text-xs text-muted-foreground"> · {vodovod.occupancy_ratio.toFixed(1)}× baseline</span>
              </div>
            </div>
            <a
              href="https://www.vik-split.hr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary shrink-0"
              aria-label="vik-split.hr"
            >
              <ArrowSquareOut size={12} />
            </a>
          </div>
        </div>
      </section>

      {/* Below-the-fold detail: calendar + recent stays + source */}
      <section className="space-y-2 pt-2 border-t">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <CalendarBlank size={12} />
          Kalendar zauzetosti
        </h2>
        <div className="rounded-md border p-3">
          <StaysCalendar
            occupancyByDay={calendar}
            unreportedOnline={unreported}
            daysBack={90}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <ListBullets size={12} />
          Posljednje prijave noćenja
        </h2>
        <RecentStaysTable stays={stays} limit={10} />
      </section>

      <section className="pt-2 border-t">
        <a
          href="https://www.accommodation.croatia.hr"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
        >
          Izvor: accommodation.croatia.hr <ArrowSquareOut size={11} />
        </a>
      </section>
    </div>
  );
}
