import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { StatNumber } from "@/components/domain/stat-number";
import { NeighborhoodBar } from "@/components/domain/neighborhood-bar";
import { ImpactEmptyState } from "./impact-empty-state";
import type { Neighborhood } from "@/lib/types";

export const revalidate = 300;

export default async function ImpactPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [flagsRes, neighborhoodsRes] = await Promise.all([
    supabase.from("flags").select("id", { count: "exact", head: true }),
    supabase
      .from("neighborhoods")
      .select("*")
      .order("estimated_annual_loss_eur", { ascending: false }),
  ]);

  const flagCount = flagsRes.count ?? 0;
  const neighborhoods: Neighborhood[] = neighborhoodsRes.data ?? [];
  const totalLoss = neighborhoods.reduce((s, n) => s + n.estimated_annual_loss_eur, 0);
  const maxLoss = neighborhoods[0]?.estimated_annual_loss_eur ?? 1;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Učinak na grad Split</h1>
        <p className="text-muted-foreground text-sm">
          Procijenjeni godišnji fiskalni gubitak od neregistriranih iznajmljivača.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <StatNumber value={flagCount} label="Označenih oglasa u Splitu" />
        <StatNumber value={totalLoss} label="Procijenjeni godišnji gubitak (EUR)" format="eur" />
        <StatNumber value={neighborhoods.length} label="Zahvaćenih kvartova" />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Po kvartovima</h2>
        {neighborhoods.length === 0 ? (
          <ImpactEmptyState />
        ) : (
          <div className="space-y-4">
            {neighborhoods.map((n) => (
              <NeighborhoodBar key={n.slug} neighborhood={n} maxLoss={maxLoss} />
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground border-t pt-4">
        Metodologija: procijenjeni gubitak uključuje boravišnu pristojbu, paušalni porez i turističku
        članarinu po prosječnom broju noćenja za kategoriju smještaja. Podaci su indikativni i ne
        predstavljaju pravno obvezujuću procjenu.
      </p>
    </div>
  );
}
