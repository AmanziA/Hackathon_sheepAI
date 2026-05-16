import { cookies } from "next/headers";
import { StatNumber } from "@/components/domain/stat-number";
import { NeighborhoodBar } from "@/components/domain/neighborhood-bar";
import { ImpactMap } from "@/components/domain/impact-map";
import { SectionHead } from "@/components/domain/section-head";
import { DashedDivider } from "@/components/domain/dashed-divider";
import { createClient } from "@/utils/supabase/server";
import type { Neighborhood } from "@/lib/types";

export const dynamic = "force-dynamic";

const MOCK_NEIGHBORHOODS: Neighborhood[] = [
  { slug: "veli-varos",  name: "Veli Varoš",  city: "Split", geojson: null, flag_count: 38, registered_count: 12, estimated_annual_loss_eur: 312400 },
  { slug: "bacvice",     name: "Bačvice",      city: "Split", geojson: null, flag_count: 31, registered_count: 9,  estimated_annual_loss_eur: 268700 },
  { slug: "spinut",      name: "Spinut",       city: "Split", geojson: null, flag_count: 27, registered_count: 14, estimated_annual_loss_eur: 221500 },
  { slug: "meje",        name: "Meje",         city: "Split", geojson: null, flag_count: 22, registered_count: 8,  estimated_annual_loss_eur: 187300 },
  { slug: "znjan",       name: "Žnjan",        city: "Split", geojson: null, flag_count: 19, registered_count: 6,  estimated_annual_loss_eur: 154600 },
  { slug: "firule",      name: "Firule",       city: "Split", geojson: null, flag_count: 17, registered_count: 11, estimated_annual_loss_eur: 132800 },
  { slug: "sucidar",     name: "Sućidar",      city: "Split", geojson: null, flag_count: 14, registered_count: 5,  estimated_annual_loss_eur: 108400 },
  { slug: "grad",        name: "Grad (Stari grad)", city: "Split", geojson: null, flag_count: 12, registered_count: 31, estimated_annual_loss_eur: 94100 },
  { slug: "trstenik",    name: "Trstenik",     city: "Split", geojson: null, flag_count: 9,  registered_count: 4,  estimated_annual_loss_eur: 71200 },
  { slug: "lovret",      name: "Lovret",       city: "Split", geojson: null, flag_count: 7,  registered_count: 3,  estimated_annual_loss_eur: 54800 },
  { slug: "kman",        name: "Kman",         city: "Split", geojson: null, flag_count: 5,  registered_count: 2,  estimated_annual_loss_eur: 38500 },
  { slug: "mejaši",      name: "Mejaši",       city: "Split", geojson: null, flag_count: 4,  registered_count: 1,  estimated_annual_loss_eur: 29300 },
];

export default async function ImpactPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from("neighborhoods")
    .select("slug, name, city, geojson, flag_count, registered_count, estimated_annual_loss_eur")
    .order("estimated_annual_loss_eur", { ascending: false })
    .limit(50);

  const hasReal =
    data && data.length > 0 && data.some((n) => (n.estimated_annual_loss_eur ?? 0) > 0);
  const neighborhoods: Neighborhood[] = hasReal
    ? (data as Neighborhood[])
    : MOCK_NEIGHBORHOODS;
  const usingMock = !hasReal;

  const flagCount = neighborhoods.reduce((s, n) => s + n.flag_count, 0);
  const totalLoss = neighborhoods.reduce((s, n) => s + n.estimated_annual_loss_eur, 0);
  const maxLoss = neighborhoods[0]?.estimated_annual_loss_eur ?? 1;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      <SectionHead
        eyebrow="Statistika · Split"
        title="Fiskalni utjecaj neregistriranog najma"
        description={`Procijenjeni godišnji gubitak grada od oglasa kojih nema u HTZ registru.${usingMock ? " Indikativni mock podaci dok se baza ne popuni." : ""}`}
        size="lg"
      />

      <div className="grid grid-cols-3 gap-8">
        <StatNumber value={flagCount} label="Označenih oglasa u Splitu" />
        <StatNumber value={totalLoss} label="Procijenjeni godišnji gubitak (EUR)" format="eur" />
        <StatNumber value={neighborhoods.length} label="Zahvaćenih kvartova" />
      </div>

      <DashedDivider />

      <div className="space-y-4">
        <SectionHead
          eyebrow="Geografski"
          title="Mapa gubitaka po kvartu"
          description="Visina stupa = godišnji gubitak. Crveno = najviše. Klikni ili lebdi za detalje."
        />
        <ImpactMap neighborhoods={neighborhoods} />
      </div>

      <DashedDivider />

      <div className="space-y-5">
        <SectionHead
          eyebrow="Rang lista"
          title="Po kvartovima"
          description="Sortirano po procijenjenom gubitku."
        />
        <div className="space-y-4">
          {neighborhoods.map((n, i) => (
            <NeighborhoodBar key={n.slug} neighborhood={n} maxLoss={maxLoss} rank={i + 1} />
          ))}
        </div>
      </div>

      <DashedDivider />

      <p className="text-xs text-muted-foreground pt-2">
        Metodologija: procijenjeni gubitak uključuje boravišnu pristojbu, paušalni porez i turističku
        članarinu po prosječnom broju noćenja za kategoriju smještaja. Podaci su indikativni i ne
        predstavljaju pravno obvezujuću procjenu.
      </p>
    </div>
  );
}
