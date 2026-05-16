import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { EvidenceCard } from "@/components/domain/evidence-card";
import type { Flag, AgentTrace, TraceStep, EntityLink } from "@/lib/types";

interface Props {
  params: Promise<{ flagId: string }>;
}

export default async function FlagDetailPage({ params }: Props) {
  const { flagId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [flagRes, entityLinkRes] = await Promise.all([
    supabase
      .from("flags")
      .select("*, candidate_listings(*), agent_traces(*)")
      .eq("id", flagId)
      .single(),
    supabase.from("entity_links").select("*").eq("candidate_id", flagId).maybeSingle(),
  ]);

  if (!flagRes.data) notFound();

  const flag = flagRes.data as Flag;
  const trace = (flag.agent_traces as unknown as AgentTrace) ?? null;
  const entityLink = entityLinkRes.data as EntityLink | null;

  const stepsRes = trace
    ? await supabase
        .from("trace_steps")
        .select("*")
        .eq("trace_id", trace.id)
        .order("step_index")
    : { data: [] };

  const steps: TraceStep[] = stepsRes.data ?? [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight mb-8">
        {flag.candidate_listings?.title ?? "Detalji oznake"}
      </h1>
      <EvidenceCard flag={flag} trace={trace} steps={steps} entityLink={entityLink} />
    </div>
  );
}
