"use client";

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
  last_check_in_at: string | null;
};

const STATUS_META: Record<
  MonitoringRow["status"],
  { label: string; cls: string; sortOrder: number }
> = {
  occupied_silent: {
    label: "Aktivan ali ne prijavljuje",
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
    key: "neighborhood",
    label: "Kvart",
    accessor: (r) => r.neighborhood,
    sortable: true,
    filterable: true,
    cellClassName: "text-sm",
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
    key: "reported",
    label: "Noćenja YTD",
    accessor: (r) => r.reported_nights_ytd,
    sortable: true,
    filterable: true,
    align: "right",
    cellClassName: "text-sm tabular-nums",
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

export function MonitoringClient({ rows }: { rows: MonitoringRow[] }) {
  const router = useRouter();
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      onRowClick={(r) => router.push(`/dashboard/registrirani/${r.id}`)}
      searchPlaceholder="Pretraži po objektu, vlasniku, kvartu…"
    />
  );
}
