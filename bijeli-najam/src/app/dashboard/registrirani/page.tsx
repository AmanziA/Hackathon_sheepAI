import { Badge } from "@/components/ui/badge";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { RegisteredTable, type RegisteredRow } from "./registered-table";

export const dynamic = "force-dynamic";

function formatSnapshotDate(rows: RegisteredRow[]) {
  // scraped_at isn't selected here; show today as a fallback.
  if (rows.length === 0) return "—";
  return new Date().toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function RegistriranePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: units, error: unitsError } = await supabase
    .from("registered_units")
    .select(
      "id, name, owner, neighborhood, address, street, number, beds, category, stars",
    )
    .order("name", { ascending: true })
    .limit(1000);

  let rows: RegisteredRow[] = (units ?? []) as RegisteredRow[];

  if (rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const { data: traces } = await supabase
      .from("agent_traces")
      .select(
        "registered_id, final_verdict, final_confidence, completed_at, candidate_id",
      )
      .in("registered_id", ids)
      .order("completed_at", { ascending: false });

    // Pick latest trace per registered_id and count entity_links for match_count.
    const latestByUnit = new Map<
      string,
      { final_verdict: string; final_confidence: number; completed_at: string }
    >();
    for (const t of (traces ?? []) as Array<{
      registered_id: string;
      final_verdict: string;
      final_confidence: number;
      completed_at: string;
    }>) {
      if (!latestByUnit.has(t.registered_id)) {
        latestByUnit.set(t.registered_id, {
          final_verdict: t.final_verdict,
          final_confidence: t.final_confidence,
          completed_at: t.completed_at,
        });
      }
    }

    // Count matches via entity_links per registered_id.
    const { data: links } = await supabase
      .from("entity_links")
      .select("registered_id")
      .in("registered_id", ids)
      .eq("verdict", "matched");

    const matchCount = new Map<string, number>();
    for (const l of (links ?? []) as Array<{ registered_id: string | null }>) {
      if (!l.registered_id) continue;
      matchCount.set(l.registered_id, (matchCount.get(l.registered_id) ?? 0) + 1);
    }

    rows = rows.map((r) => {
      const t = latestByUnit.get(r.id);
      return {
        ...r,
        latest_trace: t
          ? { ...t, match_count: matchCount.get(r.id) ?? 0 }
          : null,
      };
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Registrirani objekti</h1>
          <p className="text-sm text-muted-foreground">
            Accommodation.croatia.hr · snimak {formatSnapshotDate(rows)}
          </p>
          {unitsError ? (
            <p className="text-xs text-destructive">Supabase: {unitsError.message}</p>
          ) : null}
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {rows.length} objekata
        </Badge>
      </div>

      <RegisteredTable rows={rows} />
    </div>
  );
}
