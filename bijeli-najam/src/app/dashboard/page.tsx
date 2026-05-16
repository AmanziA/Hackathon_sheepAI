import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { DashboardClient } from "./dashboard-client";
import type { Flag } from "@/lib/types";

export const revalidate = 60;

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from("flags")
    .select(`
      *,
      candidate_listings(*),
      agent_traces(*)
    `)
    .order("confidence_unregistered", { ascending: false })
    .limit(200);

  const flags: Flag[] = data ?? [];

  return <DashboardClient flags={flags} />;
}
