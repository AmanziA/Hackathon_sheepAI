"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MagnifyingGlass, MapPin, WarningCircle, TrendDown } from "@phosphor-icons/react";
import { ConfidenceBadge } from "./confidence-badge";
import { formatEur } from "@/lib/format";
import { cn } from "@/lib/utils";

interface NearbyFlag {
  id: string;
  title: string;
  distance_m: number;
  confidence_unregistered: number;
  platform: string;
  price_per_night: number | null;
  neighborhood: string;
  undercut_pct?: number;
}

const MOCK_RESULTS: NearbyFlag[] = [
  {
    id: "flag-1",
    title: "Luksuzni apartman — Veli Varoš, Split",
    distance_m: 87,
    confidence_unregistered: 0.95,
    platform: "Airbnb",
    price_per_night: 145,
    neighborhood: "Veli Varoš",
    undercut_pct: 32,
  },
  {
    id: "flag-3",
    title: "Apartments Sunce d.o.o. — Spinut",
    distance_m: 214,
    confidence_unregistered: 0.87,
    platform: "Booking.com",
    price_per_night: 210,
    neighborhood: "Spinut",
    undercut_pct: 48,
  },
  {
    id: "flag-4",
    title: "Pogled na more — Meje",
    distance_m: 390,
    confidence_unregistered: 0.82,
    platform: "Airbnb",
    price_per_night: 175,
    neighborhood: "Meje",
    undercut_pct: 28,
  },
];

const AVG_LEGAL_PRICE = 195;

export function AddressLookup() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchedAddress, setSearchedAddress] = useState<string | null>(null);
  const [results, setResults] = useState<NearbyFlag[] | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!address.trim()) return;

    setLoading(true);
    setResults(null);

    await new Promise((r) => setTimeout(r, 900));

    setSearchedAddress(address.trim());
    setResults(MOCK_RESULTS);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="npr. Spinčićeva 5, Split"
          className="flex-1"
          aria-label="Unesite adresu"
          required
        />
        <Button type="submit" disabled={loading} className="gap-2">
          <MagnifyingGlass size={16} />
          {loading ? "Tražim..." : "Pretraži"}
        </Button>
      </form>

      {results !== null && results.length > 0 && (
        <div className="space-y-5">
          {/* Summary bar */}
          <div className="rounded-lg border bg-destructive/5 border-destructive/20 p-4 space-y-1">
            <div className="flex items-center gap-2">
              <WarningCircle size={18} className="text-destructive" />
              <span className="font-semibold text-sm">
                {results.length} neregistrirana oglasa unutar 500m od &ldquo;{searchedAddress}&rdquo;
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-6">
              <TrendDown size={13} className="text-destructive" />
              Prosječni undercut: &nbsp;
              <strong className="text-destructive">
                {Math.round(results.reduce((s, r) => s + (r.undercut_pct ?? 0), 0) / results.length)}%
              </strong>
              &nbsp;ispod prosječne legalne cijene ({formatEur(AVG_LEGAL_PRICE)}/noć)
            </div>
          </div>

          {/* Listing cards */}
          <div className="space-y-3">
            {results.map((f) => (
              <Card key={f.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Red left stripe */}
                    <div className="w-1 bg-destructive shrink-0" />
                    <div className="flex items-center gap-4 p-4 flex-1 min-w-0">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{f.title}</p>
                          <Badge variant="outline" className="text-xs shrink-0">{f.platform}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin size={11} />
                          {Math.round(f.distance_m)}m dalje · {f.neighborhood}
                          {f.price_per_night && (
                            <span className="ml-1">&middot; {formatEur(f.price_per_night)}/noć</span>
                          )}
                          {f.undercut_pct && (
                            <span className="ml-1 text-destructive font-medium">
                              ({f.undercut_pct}% jeftinije od legalnih)
                            </span>
                          )}
                        </p>
                      </div>
                      <ConfidenceBadge score={f.confidence_unregistered} size="sm" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center pt-4 border-t space-y-2">
            <p className="text-sm text-muted-foreground">
              Legalni iznajmljivač? Neregistrirani susjedi direktno utječu na vaš prihod.
            </p>
            <a
              href="https://www.iznajmljivaci.hr"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Pridruži se Klubu Iznajmljivača Hrvatske
            </a>
          </div>
        </div>
      )}

      {results !== null && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nema označenih oglasa unutar 500m od ove adrese.
        </p>
      )}
    </div>
  );
}
