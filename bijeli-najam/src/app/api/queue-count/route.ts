import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { MOCK_FLAGS } from "@/lib/mock-data";
import { DEMO_MONITORING_ALERTS } from "@/lib/monitoring-demo";
import { monitoringStatusFor } from "@/lib/evisitor-mock";

type RegisteredRow = {
  id: string;
  name: string | null;
  beds: number | null;
  category: string | null;
};

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [flagsRes, registeredRes] = await Promise.all([
    supabase.from("flags").select("id").limit(500),
    supabase
      .from("registered_units")
      .select("id, name, beds, category")
      .limit(500),
  ]);

  // Mirror /dashboard/page.tsx: real flags if any, else MOCK_FLAGS fallback
  const flagIds: string[] =
    flagsRes.data && flagsRes.data.length > 0
      ? flagsRes.data.map((f) => f.id as string)
      : MOCK_FLAGS.map((f) => f.id);

  const registered = (registeredRes.data as RegisteredRow[] | null) ?? [];
  const computedRedIds = registered
    .filter((u) => {
      const status = monitoringStatusFor({
        id: u.id,
        name: u.name,
        beds: u.beds,
        category: u.category,
      });
      return status.kind === "occupied_silent" || status.kind === "empty_reporting";
    })
    .map((u) => u.id);

  // Dedupe: demo alerts override computed (matches dashboard/page.tsx)
  const demoIds = new Set(DEMO_MONITORING_ALERTS.map((d) => d.id));
  const monitoringIds = [
    ...DEMO_MONITORING_ALERTS.map((d) => d.id),
    ...computedRedIds.filter((id) => !demoIds.has(id)),
  ];

  const ids = [...flagIds, ...monitoringIds];

  return NextResponse.json({ ids, total: ids.length });
}
