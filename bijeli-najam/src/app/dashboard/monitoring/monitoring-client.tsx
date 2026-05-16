"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/domain/data-table";
import { cn } from "@/lib/utils";

export type MonitoringRow = {
  id: string;
  name: string;
  owner: string | null;
  neighborhood: string | null;
  beds: number | null;
  status: "occupied_reporting" | "occupied_silent" | "empty_silent" | "empty_reporting";
  hep_kwh_per_day: number;
  vodovod_m3_per_month: number;
  reported_nights_ytd: number;
  online_nights_ytd: number;
  last_check_in_at: string | null;
};

type FilterKey = "sve" | MonitoringRow["status"];

const STATUS_META: Record<
  MonitoringRow["status"],
  { label: string; cls: string; sortOrder: number }
> = {
  occupied_silent: {
    label: "Aktivan, ne prijavljuje",
    cls: "border-destructive/40 text-destructive bg-destructive/5",
    sortOrder: 0,
  },
  empty_reporting: {
    label: "Prijavljuje, prazan",
    cls: "border-destructive/40 text-destructive bg-destructive/5",
    sortOrder: 1,
  },
  occupied_reporting: {
    label: "Aktivan i prijavljuje",
    cls: "border-success/40 text-success bg-success/5",
    sortOrder: 2,
  },
  empty_silent: {
    label: "Prazan",
    cls: "border-muted-foreground/40 text-muted-foreground bg-muted/40",
    sortOrder: 3,
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("hr-HR", { day: "numeric", month: "short" });
}

function nightsDeltaClass(online: number, reported: number): string {
  if (reported === 0 && online === 0) return "text-muted-foreground";
  // Online noticeably exceeds reported → unreported turnover. Red.
  if (online >= reported * 1.5 && online - reported >= 20) return "text-destructive font-medium";
  // Reported noticeably exceeds online → possible false reports. Red.
  if (reported >= online * 1.5 && reported - online >= 20) return "text-destructive font-medium";
  return "text-foreground";
}

const columns: Column<MonitoringRow>[] = [
  {
    key: "name",
    label: "Objekt",
    accessor: (r) => r.name,
    sortable: true,
    filterable: true,
    width: "w-[260px]",
    cellClassName: "font-medium text-sm",
  },
  {
    key: "status",
    label: "Status",
    accessor: (r) => STATUS_META[r.status].sortOrder,
    sortable: true,
    filterable: true,
    render: (r) => {
      const meta = STATUS_META[r.status];
      return (
        <Badge variant="outline" className={cn("text-xs", meta.cls)}>
          {meta.label}
        </Badge>
      );
    },
  },
  {
    key: "hep",
    label: "HEP kWh/dan",
    accessor: (r) => r.hep_kwh_per_day,
    sortable: true,
    filterable: true,
    align: "right",
    cellClassName: "text-sm font-mono tabular-nums",
    render: (r) => r.hep_kwh_per_day.toFixed(1),
  },
  {
    key: "vodovod",
    label: "Voda m³/mj",
    accessor: (r) => r.vodovod_m3_per_month,
    sortable: true,
    filterable: true,
    align: "right",
    cellClassName: "text-sm font-mono tabular-nums",
    render: (r) => r.vodovod_m3_per_month.toFixed(1),
  },
  {
    key: "nights",
    label: "Noćenja (online → prijavljeno)",
    accessor: (r) => r.online_nights_ytd,
    sortable: true,
    filterable: false,
    align: "right",
    cellClassName: "text-sm tabular-nums whitespace-nowrap",
    render: (r) => (
      <span className={cn("tabular-nums", nightsDeltaClass(r.online_nights_ytd, r.reported_nights_ytd))}>
        {r.online_nights_ytd}
        <span className="mx-1 text-muted-foreground">→</span>
        {r.reported_nights_ytd}
      </span>
    ),
  },
  {
    key: "last",
    label: "Posljednja prijava",
    accessor: (r) => r.last_check_in_at,
    sortable: true,
    filterable: true,
    align: "right",
    cellClassName: "text-sm text-muted-foreground tabular-nums",
    render: (r) => formatDate(r.last_check_in_at),
  },
];

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: "sve", label: "Svi statusi" },
  { key: "occupied_silent", label: "Aktivan, ne prijavljuje" },
  { key: "empty_reporting", label: "Prijavljuje, prazan" },
  { key: "occupied_reporting", label: "Aktivan i prijavljuje" },
  { key: "empty_silent", label: "Prazan" },
];

export function MonitoringClient({ rows }: { rows: MonitoringRow[] }) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("sve");

  const counts: Record<FilterKey, number> = {
    sve: rows.length,
    occupied_silent: rows.filter((r) => r.status === "occupied_silent").length,
    occupied_reporting: rows.filter((r) => r.status === "occupied_reporting").length,
    empty_silent: rows.filter((r) => r.status === "empty_silent").length,
    empty_reporting: rows.filter((r) => r.status === "empty_reporting").length,
  };

  const filtered = activeFilter === "sve" ? rows : rows.filter((r) => r.status === activeFilter);

  const filterDropdown = (
    <select
      value={activeFilter}
      onChange={(e) => setActiveFilter(e.target.value as FilterKey)}
      className={cn(
        "h-8 rounded-sm border border-input bg-background px-2 text-sm",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        activeFilter !== "sve" && "border-foreground/30 text-foreground"
      )}
      aria-label="Filtriraj po statusu"
    >
      {FILTER_OPTIONS.map(({ key, label }) => (
        <option key={key} value={key}>
          {label} ({counts[key]})
        </option>
      ))}
    </select>
  );

  return (
    <DataTable
      rows={filtered}
      columns={columns}
      rowKey={(r) => r.id}
      onRowClick={(r) => router.push(`/dashboard/registrirani/${r.id}`)}
      searchPlaceholder="Pretraži po objektu ili statusu…"
      toolbar={filterDropdown}
    />
  );
}
