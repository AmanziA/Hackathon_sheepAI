"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MagnifyingGlass, MapPin, WarningCircle } from "@phosphor-icons/react";
import { ConfidenceBadge } from "./confidence-badge";
import { geocodeAddress } from "@/lib/geo";
import { formatEur } from "@/lib/format";
import { cn } from "@/lib/utils";

interface NearbyFlag {
  id: string;
  title: string;
  distance_m: number;
  confidence_unregistered: number;
  platform: string;
  price_per_night: number | null;
}

export function AddressLookup() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<NearbyFlag[] | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!address.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const coords = await geocodeAddress(address);
      if (!coords) {
        setError("Adresa nije pronađena. Pokušajte s preciznijim unosom.");
        return;
      }

      const res = await fetch(
        `/api/nearby-flags?lat=${coords.lat}&lon=${coords.lon}&radius=500`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data.flags ?? []);
    } catch {
      setError("Došlo je do pogreške. Pokušajte ponovo.");
    } finally {
      setLoading(false);
    }
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

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <WarningCircle size={16} />
          {error}
        </div>
      )}

      {results !== null && (
        <div className="space-y-4">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nema označenih oglasa unutar 500m od ove adrese.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Pronađeno <strong>{results.length}</strong> označenih oglasa unutar 500m.
              </p>
              <div className="space-y-3">
                {results.map((f) => (
                  <Card key={f.id}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <WarningCircle size={20} className="text-destructive shrink-0" />
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-medium truncate">{f.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin size={11} />
                          {Math.round(f.distance_m)}m dalje · {f.platform}
                          {f.price_per_night && ` · ${formatEur(f.price_per_night)}/noć`}
                        </p>
                      </div>
                      <ConfidenceBadge score={f.confidence_unregistered} size="sm" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Legalni iznajmljivač? Pridružite se zajednici.
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
    </div>
  );
}
