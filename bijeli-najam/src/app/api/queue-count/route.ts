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

  // Match the dashboard fallback rules
  const flagCount =
    flagsRes.data && flagsRes.data.length > 0
      ? flagsRes.data.length
      : MOCK_FLAGS.length;

  // Mirror dashboard/page.tsx — only "red" monitoring statuses surface as todos
  const registered = (registeredRes.data as RegisteredRow[] | null) ?? [];
  const computedRed = registered.filter((u) => {
    const status = monitoringStatusFor({
      id: u.id,
      name: u.name,
      beds: u.beds,
      category: u.category,
    });
    return status.kind === "occupied_silent" || status.kind === "empty_reporting";
  }).length;

  const monitoringCount = DEMO_MONITORING_ALERTS.length + computedRed;
  const total = flagCount + monitoringCount;

  return NextResponse.json({ total, flagCount, monitoringCount });
}
