"use client";

import { Badge } from "@/components/ui/badge";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { DataTable, type Column } from "@/components/domain/data-table";

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

const columns: Column<Candidate>[] = [
  {
    key: "platform",
    label: "Platforma",
    accessor: (c) => c.platform,
    sortable: true,
    filterable: true,
    width: "w-[110px]",
    render: (c) => (
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
    ),
  },
  {
    key: "title",
    label: "Naziv",
    accessor: (c) => c.title,
    sortable: true,
    filterable: true,
    width: "w-[300px]",
    cellClassName: "font-medium text-sm",
  },
  {
    key: "host_name",
    label: "Domaćin",
    accessor: (c) => c.host_name,
    sortable: true,
    filterable: true,
    cellClassName: "text-sm text-muted-foreground",
  },
  {
    key: "neighborhood",
    label: "Kvart",
    accessor: (c) => c.neighborhood,
    sortable: true,
    filterable: true,
    cellClassName: "text-sm",
  },
  {
    key: "price_per_night",
    label: "Cijena/noć",
    accessor: (c) => c.price_per_night,
    sortable: true,
    filterable: true,
    align: "right",
    cellClassName: "text-sm font-medium",
    render: (c) => `${c.price_per_night} €`,
  },
  {
    key: "beds",
    label: "Kreveti",
    accessor: (c) => c.beds,
    sortable: true,
    filterable: true,
    align: "center",
    cellClassName: "text-sm",
  },
  {
    key: "guests",
    label: "Gosti",
    accessor: (c) => c.guests,
    sortable: true,
    filterable: true,
    align: "center",
    cellClassName: "text-sm",
  },
  {
    key: "url",
    label: "",
    accessor: () => "",
    width: "w-[40px]",
    render: (c) => (
      <a
        href={c.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Otvori oglas ${c.title} u novom tabu`}
        className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <ArrowSquareOut size={15} />
      </a>
    ),
  },
];

export function OglasiClient({ candidates }: Props) {
  const airbnbCount = candidates.filter((c) => c.platform === "airbnb").length;
  const bookingCount = candidates.filter((c) => c.platform === "booking").length;

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Online oglasi</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {candidates.length} oglasa
          </Badge>
          <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 text-xs">
            Airbnb {airbnbCount}
          </Badge>
          <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50 text-xs">
            Booking {bookingCount}
          </Badge>
        </div>
      </div>

      <DataTable
        rows={candidates}
        columns={columns}
        rowKey={(c) => c.id}
        searchPlaceholder="Pretraži po nazivu, domaćinu, kvartu…"
      />
    </div>
  );
}
