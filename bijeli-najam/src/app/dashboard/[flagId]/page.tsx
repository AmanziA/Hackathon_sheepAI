import { notFound } from "next/navigation";
import { EvidenceCard } from "@/components/domain/evidence-card";
import { MOCK_FLAGS, MOCK_TRACE_STEPS, MOCK_ENTITY_LINKS } from "@/lib/mock-data";

interface Props {
  params: Promise<{ flagId: string }>;
}

export default async function FlagDetailPage({ params }: Props) {
  const { flagId } = await params;

  const flag = MOCK_FLAGS.find((f) => f.id === flagId);
  if (!flag) notFound();

  const trace = flag.agent_traces ?? null;
  const steps = trace ? (MOCK_TRACE_STEPS[trace.id] ?? []) : [];
  const entityLink = MOCK_ENTITY_LINKS[flagId] ?? null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <a href="/dashboard" className="text-sm text-muted-foreground hover:underline mb-6 inline-block">
        ← Natrag na popis
      </a>
      <h1 className="text-2xl font-bold tracking-tight mb-8">
        {flag.candidate_listings?.title ?? "Detalji nalaza"}
      </h1>
      <EvidenceCard flag={flag} trace={trace} steps={steps} entityLink={entityLink} />
    </div>
  );
}
