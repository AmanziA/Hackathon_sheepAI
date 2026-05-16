"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/domain/data-table";
import { CheckCircle, CircleNotch } from "@phosphor-icons/react";
import { formatConfidence } from "@/lib/format";

export type LatestTrace = {
  final_verdict: string;
  final_confidence: number;
  completed_at: string;
  match_count: number;
};

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
  latest_trace?: LatestTrace | null;
};

function aiStatusRank(u: RegisteredUnit): number {
  const t = u.latest_trace;
  if (!t) return 0;
  if (t.final_verdict === "running") return 1;
  if (t.final_verdict === "clear" || t.match_count > 0) return 4;
  if (t.final_verdict === "no_listings_found") return 2;
  if (t.final_verdict === "error") return -1;
  return 3; // inconclusive
}

function AiStatusBadge({ trace }: { trace: LatestTrace | null | undefined }) {
  if (!trace) {
    return <Badge variant="outline" className="text-xs">Nije pretraženo</Badge>;
  }
  if (trace.final_verdict === "running") {
    return (
      <Badge variant="outline" className="text-xs gap-1">
        <CircleNotch size={10} className="animate-spin" /> u tijeku
      </Badge>
    );
  }
  if (trace.final_verdict === "clear" || trace.match_count > 0) {
    return (
      <Badge variant="default" className="text-xs">
        {trace.match_count} {trace.match_count === 1 ? "oglas" : "oglasa"} ·{" "}
        {formatConfidence(trace.final_confidence)}
      </Badge>
    );
  }
  if (trace.final_verdict === "no_listings_found") {
    return <Badge variant="secondary" className="text-xs">Bez oglasa</Badge>;
  }
  if (trace.final_verdict === "error") {
    return <Badge variant="destructive" className="text-xs">Greška</Badge>;
  }
  return <Badge variant="outline" className="text-xs">Neodlučno</Badge>;
}

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
  {
    key: "ai_status",
    label: "AI status",
    accessor: (u) => aiStatusRank(u),
    sortable: true,
    filterable: false,
    render: (u) => <AiStatusBadge trace={u.latest_trace ?? null} />,
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
