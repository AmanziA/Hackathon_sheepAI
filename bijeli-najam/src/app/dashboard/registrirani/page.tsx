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
  { id: "r4",  name: "Apartman Jadran",             owner: "Perić Mara",          neighborhood: "Bačvice",    address: "Vukovarska 12",              street: null, number: null, beds: 4, category: "Apartman",         stars: 4,    scraped_at: "2026-05-14" },
  { id: "r5",  name: "Kuća za odmor Luka",          owner: "Lukić Luka",          neighborhood: "Žnjan",      address: "Žnjanska cesta 3",           street: null, number: null, beds: 8, category: "Kuća za odmor",    stars: 3,    scraped_at: "2026-05-14" },
  { id: "r6",  name: "Sobe Toni",                   owner: "Antunović Toni",      neighborhood: "Firule",     address: "Firulska 7",                 street: null, number: null, beds: 3, category: "Soba",             stars: null, scraped_at: "2026-05-14" },
  { id: "r7",  name: "Apartman Stjepan",            owner: "Stjepanović Stjepan", neighborhood: "Sućidar",    address: "Sućidarska 19",              street: null, number: null, beds: 5, category: "Apartman",         stars: 3,    scraped_at: "2026-05-14" },
  { id: "r8",  name: "Stari grad sobe",             owner: "Grubić Ana",          neighborhood: "Grad",       address: "Krešimirova 2",              street: null, number: null, beds: 2, category: "Soba",             stars: null, scraped_at: "2026-05-14" },
  { id: "r9",  name: "Apartments Duje",             owner: "Dujmović Duje",       neighborhood: "Trstenik",   address: "Trstenička 5",               street: null, number: null, beds: 4, category: "Apartman",         stars: 3,    scraped_at: "2026-05-14" },
  { id: "r10", name: "Soba more",                   owner: "Morić Pero",          neighborhood: "Meje",       address: "Mejska obala 1",             street: null, number: null, beds: 2, category: "Soba",             stars: null, scraped_at: "2026-05-14" },
  { id: "r11", name: "Apartman Vila Ruža",          owner: "Ružić Ruža",          neighborhood: "Bačvice",    address: "Bačvička 3",                 street: null, number: null, beds: 3, category: "Apartman",         stars: 4,    scraped_at: "2026-05-14" },
  { id: "r12", name: "Studio Petar",                owner: "Petrović Petar",      neighborhood: "Spinut",     address: "Spinutska 12",               street: null, number: null, beds: 2, category: "Studio apartman",  stars: 2,    scraped_at: "2026-05-14" },
  { id: "r13", name: "Sobe obitelj Knez",           owner: "Knez Zlatko",         neighborhood: "Lovret",     address: "Lovrečka 8",                 street: null, number: null, beds: 4, category: "Soba",             stars: null, scraped_at: "2026-05-14" },
  { id: "r14", name: "Apartman Katarina",           owner: "Katarić Katarina",    neighborhood: "Žnjan",      address: "Žnjanska 11",                street: null, number: null, beds: 4, category: "Apartman",         stars: 3,    scraped_at: "2026-05-14" },
  { id: "r15", name: "Luxury Apartment Dioklecijan",owner: "Diklić Jozo",         neighborhood: "Grad",       address: "Dioklecijanova 1",            street: null, number: null, beds: 2, category: "Apartman",         stars: 5,    scraped_at: "2026-05-14" },
  { id: "r16", name: "Sobe Maja",                   owner: "Majić Maja",          neighborhood: "Veli Varoš", address: "Varoška 5",                  street: null, number: null, beds: 2, category: "Soba",             stars: null, scraped_at: "2026-05-14" },
  { id: "r17", name: "Kuća Mirko",                  owner: "Mirković Mirko",      neighborhood: "Kman",       address: "Kmanska 3",                  street: null, number: null, beds: 6, category: "Kuća za odmor",    stars: 2,    scraped_at: "2026-05-14" },
  { id: "r18", name: "Apartman Sunce",              owner: "Sunić Darko",         neighborhood: "Firule",     address: "Firulska 22",                street: null, number: null, beds: 4, category: "Apartman",         stars: 3,    scraped_at: "2026-05-14" },
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
    .select("id, name, owner, neighborhood, address, street, number, beds, category, stars, scraped_at")
    .order("name", { ascending: true })
    .limit(1000);

  const units: RegisteredUnit[] = (data as RegisteredUnit[] | null) ?? [];
  const usingMock = !!error || units.length === 0;
  const rows: RegisteredUnit[] = usingMock ? MOCK_REGISTERED : units;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Registrirani objekti</h1>
          <p className="text-sm text-muted-foreground">
            Accommodation.croatia.hr · snimak {formatSnapshotDate(rows)}
            {usingMock ? " · mock fallback" : ""}
          </p>
          {error ? (
            <p className="text-xs text-destructive">
              Supabase: {error.message}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {rows.length} objekata
          </Badge>
          <RefreshButton count={rows.length} />
        </div>
      </div>

      <RegistriraniClient rows={rows} />
    </div>
  );
}
