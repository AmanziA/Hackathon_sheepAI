import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { EvidenceCard } from "@/components/domain/evidence-card";
import { BackLink } from "@/components/domain/back-link";
import { IssueOrderCTA } from "@/components/domain/issue-order-cta";
import { MOCK_FLAGS, MOCK_TRACE_STEPS, MOCK_ENTITY_LINKS } from "@/lib/mock-data";
import { createClient } from "@/utils/supabase/server";
import type { Flag, TraceStep, EntityLink } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ flagId: string }>;
}

export default async function FlagDetailPage({ params }: Props) {
  const { flagId } = await params;

  // Try mock first (covers flag-1 … flag-9)
  let flag: Flag | null = MOCK_FLAGS.find((f) => f.id === flagId) ?? null;
  let steps: TraceStep[] = [];
  let entityLink: EntityLink | null = null;

  if (flag) {
    const trace = flag.agent_traces ?? null;
    steps = trace ? (MOCK_TRACE_STEPS[trace.id] ?? []) : [];
    entityLink = MOCK_ENTITY_LINKS[flagId] ?? null;
  } else {
    // Fall back to Supabase for real flag IDs (UUIDs)
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

  const trace = flag.agent_traces ?? null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <BackLink
        fallback="/dashboard"
        label="← Natrag na popis"
        className="text-sm text-muted-foreground hover:underline mb-6 inline-block"
      />
      <h1 className="text-2xl font-bold tracking-tight mb-6">
        {flag.candidate_listings?.title ?? "Detalji predmeta"}
      </h1>
      <IssueOrderCTA
        id={flag.id}
        kind="flag"
        title={flag.candidate_listings?.title ?? "Predmet"}
        meta={flag.candidate_listings?.neighborhood ?? ""}
        href={`/dashboard/${flag.id}`}
        className="mb-6 rounded-lg border p-4 flex items-center gap-3"
      />
      <EvidenceCard flag={flag} trace={trace} steps={steps} entityLink={entityLink} />
    </div>
  );
}
