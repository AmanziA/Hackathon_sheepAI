import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  WarningCircle,
  MapPin,
  User,
  Bed,
  CurrencyEur,
  Globe,
  ArrowSquareOut,
  Lightning,
  Drop,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/domain/confidence-badge";
import { ListingPreview } from "@/components/domain/listing-preview";
import { EvisitorPanel } from "@/components/domain/evisitor-panel";
import { TraceSummary } from "@/components/domain/trace-summary";
import { ScoreBreakdown } from "@/components/domain/score-breakdown";
import { BackLink } from "@/components/domain/back-link";
import { IssueOrderCTA } from "@/components/domain/issue-order-cta";
import { evisitorLookupForCandidate } from "@/lib/evisitor-mock";
import { MOCK_FLAGS, MOCK_TRACE_STEPS, MOCK_ENTITY_LINKS } from "@/lib/mock-data";
import { createClient } from "@/utils/supabase/server";
import type { Flag, TraceStep, EntityLink } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ flagId: string }>;
}

export default async function FlagDetailPage({ params }: Props) {
  const { flagId } = await params;

  let flag: Flag | null = MOCK_FLAGS.find((f) => f.id === flagId) ?? null;
  let steps: TraceStep[] = [];
  let entityLink: EntityLink | null = null;

  if (flag) {
    const trace = flag.agent_traces ?? null;
    steps = trace ? (MOCK_TRACE_STEPS[trace.id] ?? []) : [];
    entityLink = MOCK_ENTITY_LINKS[flagId] ?? null;
  } else {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data } = await supabase
      .from("flags")
      .select(
        "id, candidate_id, entity_link_id, trace_id, confidence_unregistered, status, evidence_pdf_url, screenshot_url, notes, created_at, updated_at, candidate_listings(*), agent_traces(*)"
      )
      .eq("id", flagId)
      .maybeSingle();

    if (data) {
      flag = data as unknown as Flag;
      if (flag.trace_id) {
        const { data: stepRows } = await supabase
          .from("trace_steps")
          .select("*")
          .eq("trace_id", flag.trace_id)
          .order("step_index", { ascending: true });
        steps = (stepRows as TraceStep[] | null) ?? [];
      }
      if (flag.entity_link_id) {
        const { data: linkRow } = await supabase
          .from("entity_links")
          .select("*")
          .eq("id", flag.entity_link_id)
          .maybeSingle();
        entityLink = (linkRow as EntityLink | null) ?? null;
      }
    }
  }

  if (!flag) notFound();

  const listing = flag.candidate_listings;
  const trace = flag.agent_traces ?? null;
  const isFlag = flag.confidence_unregistered >= 0.5;

  const evisitor = listing
    ? evisitorLookupForCandidate(
        {
          id: listing.id,
          title: listing.title,
          neighborhood: listing.neighborhood,
        },
        { confidenceUnregistered: flag.confidence_unregistered }
      )
    : null;

  // Pull HEP/Vodovod readings from trace steps if the agent collected them
  const hepStep = steps.find((s) => s.tool_called === "check_hep_consumption");
  const vodovodStep = steps.find((s) => s.tool_called === "check_vodovod_consumption");
  const hepOut = hepStep?.tool_output as Record<string, number> | undefined;
  const vodovodOut = vodovodStep?.tool_output as Record<string, number> | undefined;

  return (
    <div className="max-w-5xl mx-auto px-6 py-5 space-y-4">
      <BackLink fallback="/dashboard" label="← Natrag" />

      <IssueOrderCTA
        id={flag.id}
        kind="flag"
        title={listing?.title ?? "Predmet"}
        meta={listing?.neighborhood ?? ""}
        href={`/dashboard/${flag.id}`}
      />

      {/* Compact header */}
      <header className="space-y-1.5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <WarningCircle
              size={16}
              weight="fill"
              className={isFlag ? "text-destructive shrink-0" : "text-success shrink-0"}
            />
            <h1 className="text-xl font-semibold tracking-tight truncate">
              {listing?.title ?? "Detalji predmeta"}
            </h1>
            {listing?.platform && (
              <Badge variant="outline" className="text-xs capitalize">
                {listing.platform}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ConfidenceBadge score={flag.confidence_unregistered} size="sm" />
            <Badge
              variant="outline"
              className="text-xs border-destructive/40 text-destructive bg-destructive/5"
            >
              Vjerojatno neregistrirano
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {listing?.neighborhood && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {listing.neighborhood}, Split
            </span>
          )}
          {listing?.host_name && (
            <span className="flex items-center gap-1">
              <User size={12} />
              {listing.host_name}
            </span>
          )}
          {listing?.beds != null && (
            <span className="flex items-center gap-1">
              <Bed size={12} />
              {listing.beds} kreveta{listing.guests ? ` · ${listing.guests} gostiju` : ""}
            </span>
          )}
          {listing?.price_per_night != null && (
            <span className="flex items-center gap-1">
              <CurrencyEur size={12} />
              {listing.price_per_night} € / noć
            </span>
          )}
        </div>
      </header>

      {/* Above-the-fold 2-col band */}
      <div className="grid lg:grid-cols-2 gap-3 items-stretch">
        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Globe size={12} />
            Oglas kandidata
          </h2>
          <div className="flex-1">
            {listing ? (
              <ListingPreview listing={listing} screenshotUrl={flag.screenshot_url} />
            ) : (
              <p className="text-sm text-muted-foreground">Oglas nije dostupan.</p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Provjera u eVisitor sustavu
          </h2>
          <div className="flex-1">
            {evisitor ? (
              <EvisitorPanel lookup={evisitor} expectedBeds={listing?.beds} />
            ) : (
              <p className="text-sm text-muted-foreground">Nema podataka.</p>
            )}
          </div>
        </section>
      </div>

      {/* Komunalna provjera — only when the agent actually checked utilities */}
      {(hepOut || vodovodOut) && (
        <section className="space-y-1.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Komunalna provjera — live podaci
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {hepOut && (
              <div className="rounded-md border px-3 py-2 flex items-center gap-3">
                <Lightning size={14} className="text-warning shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">HEP struja</div>
                  <div className="text-sm tabular-nums">
                    <span className="font-semibold">{hepOut.avg_kwh_per_day}</span>
                    <span className="text-xs text-muted-foreground"> kWh/dan</span>
                    {hepOut.occupancy_ratio ? (
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        · {hepOut.occupancy_ratio.toFixed(1)}× baseline
                      </span>
                    ) : null}
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
            )}
            {vodovodOut && (
              <div className="rounded-md border px-3 py-2 flex items-center gap-3">
                <Drop size={14} className="text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Vodovod</div>
                  <div className="text-sm tabular-nums">
                    <span className="font-semibold">{vodovodOut.avg_m3_per_month}</span>
                    <span className="text-xs text-muted-foreground"> m³/mj</span>
                    {vodovodOut.occupancy_ratio ? (
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        · {vodovodOut.occupancy_ratio.toFixed(1)}× baseline
                      </span>
                    ) : null}
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
            )}
          </div>
        </section>
      )}

      {/* Trace */}
      {trace && (
        <section className="space-y-2 pt-2 border-t">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Trag istrage agenta
          </h2>
          <TraceSummary
            trace={trace}
            steps={steps}
            confidence={flag.confidence_unregistered}
          />
        </section>
      )}

      {/* Signal contributions (no big button — Pokreni nalog is at top) */}
      {entityLink && (
        <section className="space-y-2 pt-2 border-t">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Doprinos signala
          </h2>
          <ScoreBreakdown signals={entityLink.match_signals} />
        </section>
      )}
    </div>
  );
}
