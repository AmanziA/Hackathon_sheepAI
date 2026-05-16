import { OglasiClient } from "./oglasi-client";

const MOCK_CANDIDATES = [
  { id: "c1",  platform: "airbnb",  title: "Luksuzni apartman — Veli Varoš, Split", host_name: "Marko",                    neighborhood: "Veli Varoš", price_per_night: 145, beds: 4, guests: 8,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/001" },
  { id: "c2",  platform: "airbnb",  title: "Studio uz more — Bačvice",              host_name: "Ana",                      neighborhood: "Bačvice",   price_per_night: 98,  beds: 2, guests: 4,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/002" },
  { id: "c3",  platform: "booking", title: "Apartments Sunce d.o.o. — Spinut",      host_name: "Apartments Sunce d.o.o.",  neighborhood: "Spinut",    price_per_night: 210, beds: 8, guests: 16, scraped_at: "2026-05-14", url: "https://booking.com/hotel/003" },
  { id: "c4",  platform: "airbnb",  title: "Pogled na more — Meje",                 host_name: "Ivan",                     neighborhood: "Meje",      price_per_night: 175, beds: 3, guests: 6,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/004" },
  { id: "c5",  platform: "airbnb",  title: "Žnjan raj — uz plažu",                  host_name: "Petra",                    neighborhood: "Žnjan",     price_per_night: 122, beds: 2, guests: 4,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/005" },
  { id: "c6",  platform: "airbnb",  title: "Centralni studio Split",                host_name: "Josip",                    neighborhood: "Grad",      price_per_night: 89,  beds: 1, guests: 2,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/006" },
  { id: "c7",  platform: "booking", title: "Spinut Family Apartment",               host_name: "Obitelj Tomić",            neighborhood: "Spinut",    price_per_night: 155, beds: 5, guests: 10, scraped_at: "2026-05-14", url: "https://booking.com/hotel/007" },
  { id: "c8",  platform: "airbnb",  title: "Firule Beach Studio",                   host_name: "Karlo",                    neighborhood: "Firule",    price_per_night: 110, beds: 2, guests: 4,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/008" },
  { id: "c9",  platform: "airbnb",  title: "Bačvice Sunset Rooms",                  host_name: "Nikolina",                 neighborhood: "Bačvice",   price_per_night: 135, beds: 3, guests: 6,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/009" },
  { id: "c10", platform: "booking", title: "Split Old Town Gem",                    host_name: "Heritage Stay d.o.o.",     neighborhood: "Grad",      price_per_night: 245, beds: 2, guests: 4,  scraped_at: "2026-05-14", url: "https://booking.com/hotel/010" },
  { id: "c11", platform: "airbnb",  title: "Lovret mirni apartman",                 host_name: "Dubravka",                 neighborhood: "Lovret",    price_per_night: 78,  beds: 2, guests: 4,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/011" },
  { id: "c12", platform: "airbnb",  title: "Žnjan Beach House",                     host_name: "Tomislav",                 neighborhood: "Žnjan",     price_per_night: 198, beds: 5, guests: 10, scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/012" },
  { id: "c13", platform: "booking", title: "Meje Sea View Premium",                 host_name: "Adriatic Rentals d.o.o.",  neighborhood: "Meje",      price_per_night: 310, beds: 4, guests: 8,  scraped_at: "2026-05-14", url: "https://booking.com/hotel/013" },
  { id: "c14", platform: "airbnb",  title: "Sućidar quiet flat",                    host_name: "Branka",                   neighborhood: "Sućidar",   price_per_night: 65,  beds: 2, guests: 3,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/014" },
  { id: "c15", platform: "airbnb",  title: "Veli Varoš charming studio",            host_name: "Filip",                    neighborhood: "Veli Varoš",price_per_night: 118, beds: 1, guests: 2,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/015" },
  { id: "c16", platform: "booking", title: "Trstenik Family Home",                  host_name: "Obitelj Barić",            neighborhood: "Trstenik",  price_per_night: 142, beds: 4, guests: 8,  scraped_at: "2026-05-14", url: "https://booking.com/hotel/016" },
  { id: "c17", platform: "airbnb",  title: "Spinut modern apartment",               host_name: "Vedran",                   neighborhood: "Spinut",    price_per_night: 95,  beds: 2, guests: 4,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/017" },
  { id: "c18", platform: "airbnb",  title: "Kman cosy flat",                        host_name: "Silvana",                  neighborhood: "Kman",      price_per_night: 58,  beds: 2, guests: 4,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/018" },
  { id: "c19", platform: "booking", title: "Firule Apartments",                     host_name: "Firule Stay d.o.o.",       neighborhood: "Firule",    price_per_night: 178, beds: 6, guests: 12, scraped_at: "2026-05-14", url: "https://booking.com/hotel/019" },
  { id: "c20", platform: "airbnb",  title: "Old Town Dioklecijan Studio",           host_name: "Helena",                   neighborhood: "Grad",      price_per_night: 220, beds: 2, guests: 4,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/020" },
];

export default function OglasiPage() {
  return <OglasiClient candidates={MOCK_CANDIDATES} />;
}
