import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";

const MOCK_REGISTERED = [
  { id: "r1",  name: "Apartman Kovač",              owner: "Kovač Ivan",          neighborhood: "Meje",       address: "Šetalište I. Meštrovića 22", beds: 6, category: "Apartman",         stars: 3,    scraped_at: "2026-05-14" },
  { id: "r2",  name: "Sobe Marović",                owner: "Marović Ante",        neighborhood: "Veli Varoš", address: "Ulica od Pjace 8",           beds: 2, category: "Soba",             stars: null, scraped_at: "2026-05-14" },
  { id: "r3",  name: "Studio Sunčani",              owner: "Sunčić Josip",        neighborhood: "Spinut",     address: "Spinutska 44",               beds: 6, category: "Studio apartman",  stars: 2,    scraped_at: "2026-05-14" },
  { id: "r4",  name: "Apartman Jadran",             owner: "Perić Mara",          neighborhood: "Bačvice",    address: "Vukovarska 12",              beds: 4, category: "Apartman",         stars: 4,    scraped_at: "2026-05-14" },
  { id: "r5",  name: "Kuća za odmor Luka",          owner: "Lukić Luka",          neighborhood: "Žnjan",      address: "Žnjanska cesta 3",           beds: 8, category: "Kuća za odmor",    stars: 3,    scraped_at: "2026-05-14" },
  { id: "r6",  name: "Sobe Toni",                   owner: "Antunović Toni",      neighborhood: "Firule",     address: "Firulska 7",                 beds: 3, category: "Soba",             stars: null, scraped_at: "2026-05-14" },
  { id: "r7",  name: "Apartman Stjepan",            owner: "Stjepanović Stjepan", neighborhood: "Sućidar",    address: "Sućidarska 19",              beds: 5, category: "Apartman",         stars: 3,    scraped_at: "2026-05-14" },
  { id: "r8",  name: "Stari grad sobe",             owner: "Grubić Ana",          neighborhood: "Grad",       address: "Krešimirova 2",              beds: 2, category: "Soba",             stars: null, scraped_at: "2026-05-14" },
  { id: "r9",  name: "Apartments Duje",             owner: "Dujmović Duje",       neighborhood: "Trstenik",   address: "Trstenička 5",               beds: 4, category: "Apartman",         stars: 3,    scraped_at: "2026-05-14" },
  { id: "r10", name: "Soba more",                   owner: "Morić Pero",          neighborhood: "Meje",       address: "Mejska obala 1",             beds: 2, category: "Soba",             stars: null, scraped_at: "2026-05-14" },
  { id: "r11", name: "Apartman Vila Ruža",          owner: "Ružić Ruža",          neighborhood: "Bačvice",    address: "Bačvička 3",                 beds: 3, category: "Apartman",         stars: 4,    scraped_at: "2026-05-14" },
  { id: "r12", name: "Studio Petar",                owner: "Petrović Petar",      neighborhood: "Spinut",     address: "Spinutska 12",               beds: 2, category: "Studio apartman",  stars: 2,    scraped_at: "2026-05-14" },
  { id: "r13", name: "Sobe obitelj Knez",           owner: "Knez Zlatko",         neighborhood: "Lovret",     address: "Lovrečka 8",                 beds: 4, category: "Soba",             stars: null, scraped_at: "2026-05-14" },
  { id: "r14", name: "Apartman Katarina",           owner: "Katarić Katarina",    neighborhood: "Žnjan",      address: "Žnjanska 11",                beds: 4, category: "Apartman",         stars: 3,    scraped_at: "2026-05-14" },
  { id: "r15", name: "Luxury Apartment Dioklecijan",owner: "Diklić Jozo",         neighborhood: "Grad",       address: "Dioklecijanova 1",            beds: 2, category: "Apartman",         stars: 5,    scraped_at: "2026-05-14" },
  { id: "r16", name: "Sobe Maja",                   owner: "Majić Maja",          neighborhood: "Veli Varoš", address: "Varoška 5",                  beds: 2, category: "Soba",             stars: null, scraped_at: "2026-05-14" },
  { id: "r17", name: "Kuća Mirko",                  owner: "Mirković Mirko",      neighborhood: "Kman",       address: "Kmanska 3",                  beds: 6, category: "Kuća za odmor",    stars: 2,    scraped_at: "2026-05-14" },
  { id: "r18", name: "Apartman Sunce",              owner: "Sunić Darko",         neighborhood: "Firule",     address: "Firulska 22",                beds: 4, category: "Apartman",         stars: 3,    scraped_at: "2026-05-14" },
];

export default function RegistriranePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Registrirani objekti</h1>
          <p className="text-sm text-muted-foreground">
            Accommodation.croatia.hr · snimak 14. svi. 2026.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {MOCK_REGISTERED.length} objekata
        </Badge>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">Naziv</TableHead>
              <TableHead>Vlasnik</TableHead>
              <TableHead>Kvart</TableHead>
              <TableHead>Adresa</TableHead>
              <TableHead className="text-center">Kreveti</TableHead>
              <TableHead>Kategorija</TableHead>
              <TableHead className="text-center">Zvjezdice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_REGISTERED.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-[hsl(var(--success))] shrink-0" />
                    <span className="font-medium">{unit.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{unit.owner}</TableCell>
                <TableCell className="text-sm">{unit.neighborhood}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{unit.address}</TableCell>
                <TableCell className="text-center text-sm">{unit.beds}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {unit.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-sm">
                  {unit.stars !== null ? unit.stars : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
