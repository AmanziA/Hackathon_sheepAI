import { DashboardClient } from "./dashboard-client";
import { MOCK_FLAGS } from "@/lib/mock-data";

export const revalidate = 60;

export default async function DashboardPage() {
  return <DashboardClient flags={MOCK_FLAGS} />;
}
