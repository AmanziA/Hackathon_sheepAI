import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { DashboardClient } from "./dashboard-client";
import { MOCK_FLAGS } from "@/lib/mock-data";
import type { Flag } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from("flags")
    .select(
      "id, candidate_id, entity_link_id, trace_id, confidence_unregistered, status, evidence_pdf_url, screenshot_url, notes, created_at, updated_at, candidate_listings(*), agent_traces(*)"
    )
    .order("confidence_unregistered", { ascending: false })
    .limit(500);

  const flags: Flag[] =
    data && data.length > 0 ? (data as unknown as Flag[]) : MOCK_FLAGS;

  return <DashboardClient flags={flags} />;
}
