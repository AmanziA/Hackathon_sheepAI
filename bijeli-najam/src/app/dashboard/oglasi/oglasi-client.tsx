"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface Candidate {
  id: string;
  platform: string;
  title: string;
  host_name: string;
  neighborhood: string;
  price_per_night: number;
  beds: number;
  guests: number;
  scraped_at: string;
  url: string;
}

interface Props {
  candidates: Candidate[];
}

export function OglasiClient({ candidates }: Props) {
  const airbnbCount = candidates.filter((c) => c.platform === "airbnb").length;
  const bookingCount = candidates.filter((c) => c.platform === "booking").length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Online oglasi</h1>
        <div className="flex items-center gap-2 ml-2">
          <Badge variant="secondary">{candidates.length}</Badge>
          <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 text-xs">
            Airbnb {airbnbCount}
          </Badge>
          <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50 text-xs">
            Booking {bookingCount}
          </Badge>
        </div>
      </div>



      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Platforma</TableHead>
              <TableHead className="w-[300px]">Naziv</TableHead>
              <TableHead>Domaćin</TableHead>
              <TableHead>Kvart</TableHead>
              <TableHead className="text-right">Cijena/noć</TableHead>
              <TableHead className="text-center">Kreveti</TableHead>
              <TableHead className="text-center">Gosti</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      c.platform === "airbnb"
                        ? "border-blue-300 text-blue-700 bg-blue-50"
                        : "border-orange-300 text-orange-700 bg-orange-50"
                    )}
                  >
                    {c.platform === "airbnb" ? "Airbnb" : "Booking"}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-sm">{c.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.host_name}</TableCell>
                <TableCell className="text-sm">{c.neighborhood}</TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {c.price_per_night} €
                </TableCell>
                <TableCell className="text-center text-sm">{c.beds}</TableCell>
                <TableCell className="text-center text-sm">{c.guests}</TableCell>
                <TableCell>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Otvori oglas ${c.title} u novom tabu`}
                    className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowSquareOut size={15} />
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
