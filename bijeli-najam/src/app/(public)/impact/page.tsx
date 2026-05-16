import { StatNumber } from "@/components/domain/stat-number";
import { NeighborhoodBar } from "@/components/domain/neighborhood-bar";
import type { Neighborhood } from "@/lib/types";

export const revalidate = 300;

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
  const neighborhoods: Neighborhood[] = MOCK_NEIGHBORHOODS;
  const flagCount = neighborhoods.reduce((s, n) => s + n.flag_count, 0);
  const totalLoss = neighborhoods.reduce((s, n) => s + n.estimated_annual_loss_eur, 0);
  const maxLoss = neighborhoods[0]?.estimated_annual_loss_eur ?? 1;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Statistika — Split</h1>
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
        <div className="space-y-4">
          {neighborhoods.map((n) => (
            <NeighborhoodBar key={n.slug} neighborhood={n} maxLoss={maxLoss} />
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground border-t pt-4">
        Metodologija: procijenjeni gubitak uključuje boravišnu pristojbu, paušalni porez i turističku
        članarinu po prosječnom broju noćenja za kategoriju smještaja. Podaci su indikativni i ne
        predstavljaju pravno obvezujuću procjenu.
      </p>
    </div>
  );
}
