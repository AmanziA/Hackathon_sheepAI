"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/domain/data-table";
import { CheckCircle } from "@phosphor-icons/react";

export type RegisteredUnit = {
  id: string;
  name: string | null;
  owner: string | null;
  neighborhood: string | null;
  address: string | null;
  street: string | null;
  number: string | null;
  beds: number | null;
  category: string | null;
  stars: number | null;
  scraped_at: string | null;
};

function formatAddress(u: RegisteredUnit) {
  if (u.address) return u.address;
  const parts = [u.street, u.number].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

const columns: Column<RegisteredUnit>[] = [
  {
    key: "name",
    label: "Naziv",
    accessor: (u) => u.name,
    sortable: true,
    filterable: true,
    width: "w-[280px]",
    render: (u) => (
      <div className="flex items-center gap-2">
        <CheckCircle size={14} className="text-[hsl(var(--success))] shrink-0" />
        <span className="font-medium">{u.name ?? "—"}</span>
      </div>
    ),
  },
  {
    key: "owner",
    label: "Vlasnik",
    accessor: (u) => u.owner,
    sortable: true,
    filterable: true,
    cellClassName: "text-sm text-muted-foreground",
  },
  {
    key: "neighborhood",
    label: "Kvart",
    accessor: (u) => u.neighborhood,
    sortable: true,
    filterable: true,
    cellClassName: "text-sm",
  },
  {
    key: "address",
    label: "Adresa",
    accessor: (u) => formatAddress(u),
    sortable: true,
    filterable: true,
    cellClassName: "text-sm text-muted-foreground",
  },
  {
    key: "beds",
    label: "Kreveti",
    accessor: (u) => u.beds,
    sortable: true,
    filterable: true,
    align: "center",
    cellClassName: "text-sm",
  },
  {
    key: "category",
    label: "Kategorija",
    accessor: (u) => u.category,
    sortable: true,
    filterable: true,
    render: (u) =>
      u.category ? (
        <Badge variant="outline" className="text-xs">
          {u.category}
        </Badge>
      ) : (
        "—"
      ),
  },
  {
    key: "stars",
    label: "Zvjezdice",
    accessor: (u) => u.stars,
    sortable: true,
    filterable: true,
    align: "center",
    cellClassName: "text-sm",
    render: (u) => (u.stars != null ? u.stars : "—"),
  },
];

export function RegistriraniClient({ rows }: { rows: RegisteredUnit[] }) {
  const router = useRouter();
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(u) => u.id}
      searchPlaceholder="Pretraži po nazivu, vlasniku, kvartu…"
      onRowClick={(u) => router.push(`/dashboard/registrirani/${u.id}`)}
    />
  );
}
