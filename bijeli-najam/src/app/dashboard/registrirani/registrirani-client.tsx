"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/domain/data-table";
import { Bed, CheckCircle, CircleNotch, Star } from "@phosphor-icons/react";
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
    key: "objekt",
    label: "Objekt",
    accessor: (u) => u.name ?? "",
    sortable: true,
    filterable: true,
    cellClassName: "py-2 min-w-0",
    render: (u) => (
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle
            size={14}
            className="text-[hsl(var(--success))] shrink-0"
            weight="fill"
          />
          <span className="font-medium text-sm truncate">{u.name ?? "—"}</span>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
          {u.owner ? <span className="truncate">{u.owner}</span> : null}
          {u.owner && (u.neighborhood || formatAddress(u) !== "—") ? (
            <span aria-hidden>·</span>
          ) : null}
          {u.neighborhood ? <span>{u.neighborhood}</span> : null}
          {u.neighborhood && formatAddress(u) !== "—" ? <span aria-hidden>·</span> : null}
          <span className="truncate">{formatAddress(u)}</span>
        </div>
      </div>
    ),
  },
  {
    key: "detalji",
    label: "K / Z",
    accessor: (u) => u.beds ?? 0,
    sortable: true,
    filterable: false,
    align: "right",
    cellClassName: "py-2 text-right whitespace-nowrap",
    render: (u) => (
      <div className="text-right">
        <div className="text-sm tabular-nums flex items-center justify-end gap-2">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Bed size={12} />
            {u.beds ?? "—"}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Star size={12} weight="fill" className="text-warning" />
            {u.stars ?? "—"}
          </span>
        </div>
        {u.category ? (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {u.category}
          </div>
        ) : null}
      </div>
    ),
  },
  {
    key: "ai_status",
    label: "AI status",
    accessor: (u) => aiStatusRank(u),
    sortable: true,
    filterable: false,
    cellClassName: "py-2",
    render: (u) => (
      <div>
        <AiStatusBadge trace={u.latest_trace ?? null} />
        {u.latest_trace?.match_count && u.latest_trace.match_count > 0 ? (
          <div className="text-xs text-muted-foreground mt-0.5">
            {u.latest_trace.match_count}{" "}
            {u.latest_trace.match_count === 1 ? "podudaranje" : "podudaranja"}
          </div>
        ) : null}
      </div>
    ),
  },
];

export function RegistriraniClient({ rows }: { rows: RegisteredUnit[] }) {
  const router = useRouter();
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(u) => u.id}
      searchPlaceholder="Pretraži po nazivu, vlasniku, adresi…"
      onRowClick={(u) => router.push(`/dashboard/registrirani/${u.id}`)}
    />
  );
}
