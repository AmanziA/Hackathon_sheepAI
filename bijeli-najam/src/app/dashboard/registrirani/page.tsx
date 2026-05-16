import { Badge } from "@/components/ui/badge";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { RegistriraniClient, type RegisteredUnit } from "./registrirani-client";
import { RefreshButton } from "./refresh-button";

export const dynamic = "force-dynamic";

const MOCK_REGISTERED: RegisteredUnit[] = [
  { id: "r1",  name: "Apartman Kovač",              owner: "Kovač Ivan",          neighborhood: "Meje",       address: "Šetalište I. Meštrovića 22", street: null, number: null, beds: 6, category: "Apartman",         stars: 3,    scraped_at: "2026-05-14" },
  { id: "r2",  name: "Sobe Marović",                owner: "Marović Ante",        neighborhood: "Veli Varoš", address: "Ulica od Pjace 8",           street: null, number: null, beds: 2, category: "Soba",             stars: null, scraped_at: "2026-05-14" },
  { id: "r3",  name: "Studio Sunčani",              owner: "Sunčić Josip",        neighborhood: "Spinut",     address: "Spinutska 44",               street: null, number: null, beds: 6, category: "Studio apartman",  stars: 2,    scraped_at: "2026-05-14" },
];

function formatSnapshotDate(units: RegisteredUnit[]) {
  const latest = units
    .map((u) => u.scraped_at)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);
  if (!latest) return "—";
  return new Date(latest).toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function RegistriranePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("registered_units")
    .select(
      "id, name, owner, neighborhood, address, street, number, beds, category, stars, scraped_at",
    )
    .order("name", { ascending: true })
    .limit(1000);

  let units: RegisteredUnit[] = (data as RegisteredUnit[] | null) ?? [];
  const usingMock = !!error || units.length === 0;
  if (usingMock) {
    units = MOCK_REGISTERED;
  } else {
    // Join in the latest discovery trace + match count per unit so the list
    // can show an "AI status" badge alongside each registered objekt.
    const ids = units.map((u) => u.id);
    const { data: traces } = await supabase
      .from("agent_traces")
      .select("registered_id, final_verdict, final_confidence, completed_at")
      .in("registered_id", ids)
      .order("completed_at", { ascending: false });

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

    units = units.map((u) => {
      const t = latestByUnit.get(u.id);
      return {
        ...u,
        latest_trace: t ? { ...t, match_count: matchCount.get(u.id) ?? 0 } : null,
      };
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Registrirani objekti</h1>
          <p className="text-sm text-muted-foreground">
            Accommodation.croatia.hr · snimak {formatSnapshotDate(units)}
          </p>
          {error ? (
            <p className="text-xs text-destructive">Supabase: {error.message}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {units.length} objekata
          </Badge>
          <RefreshButton count={units.length} />
        </div>
      </div>

      <RegistriraniClient rows={units} />
    </div>
  );
}
