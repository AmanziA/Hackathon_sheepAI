"use client";

import { ReactNode, useMemo, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  CaretDown,
  CaretUp,
  CaretUpDown,
  FunnelSimple,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  label: ReactNode;
  accessor: (row: T) => string | number | null | undefined;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  headClassName?: string;
  cellClassName?: string;
};

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  searchPlaceholder?: string;
  empty?: ReactNode;
  className?: string;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

const alignClass: Record<NonNullable<Column<unknown>["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined
): number {
  const aNull = a == null || a === "";
  const bNull = b == null || b === "";
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "hr", { numeric: true });
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  rowClassName,
  searchPlaceholder = "Pretraži…",
  empty,
  className,
}: Props<T>) {
  const [search, setSearch] = useState("");
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const result = rows.filter((row) => {
      if (q) {
        const haystack = columns
          .map((c) => c.accessor(row))
          .filter((v) => v != null)
          .map((v) => String(v).toLowerCase())
          .join("   ");
        if (!haystack.includes(q)) return false;
      }

      for (const col of columns) {
        const f = colFilters[col.key];
        if (!f) continue;
        const v = col.accessor(row);
        if (v == null) return false;
        if (!String(v).toLowerCase().includes(f.toLowerCase())) return false;
      }

      return true;
    });

    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        const dir = sort.dir === "asc" ? 1 : -1;
        result.sort((a, b) => dir * compareValues(col.accessor(a), col.accessor(b)));
      }
    }

    return result;
  }, [rows, columns, search, colFilters, sort]);

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  function setFilter(key: string, value: string) {
    setColFilters((prev) => {
      if (!value) {
        const { [key]: _unused, ...rest } = prev;
        void _unused;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm w-full">
          <MagnifyingGlass
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} / {rows.length}
        </span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => {
                const isSorted = sort?.key === col.key;
                const SortIcon = !col.sortable
                  ? null
                  : !isSorted
                    ? CaretUpDown
                    : sort?.dir === "asc"
                      ? CaretUp
                      : CaretDown;
                const filterValue = colFilters[col.key] ?? "";
                const filterActive = filterValue.length > 0;
                return (
                  <TableHead
                    key={col.key}
                    className={cn(
                      col.width,
                      col.align && alignClass[col.align],
                      col.headClassName
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        col.align === "center" && "justify-center w-full",
                        col.align === "right" && "justify-end w-full"
                      )}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className={cn(
                            "inline-flex items-center gap-1 select-none hover:text-foreground transition-colors",
                            isSorted ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          <span>{col.label}</span>
                          {SortIcon ? <SortIcon size={12} /> : null}
                        </button>
                      ) : (
                        col.label
                      )}
                      {col.filterable ? (
                        <ColumnFilterPopover
                          columnLabel={typeof col.label === "string" ? col.label : col.key}
                          value={filterValue}
                          onChange={(v) => setFilter(col.key, v)}
                          active={filterActive}
                        />
                      ) : null}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-sm text-muted-foreground py-8"
                >
                  {empty ?? "Nema rezultata"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-muted/50",
                    rowClassName?.(row)
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => {
                    const value = col.render
                      ? col.render(row)
                      : (col.accessor(row) ?? "—");
                    return (
                      <TableCell
                        key={col.key}
                        className={cn(
                          col.width,
                          col.align && alignClass[col.align],
                          col.cellClassName
                        )}
                      >
                        {value as ReactNode}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ColumnFilterPopover({
  columnLabel,
  value,
  onChange,
  active,
}: {
  columnLabel: string;
  value: string;
  onChange: (v: string) => void;
  active: boolean;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        aria-label={`Filtriraj ${columnLabel}`}
        className={cn(
          "inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted transition-colors",
          active ? "text-primary" : "text-muted-foreground/60 hover:text-foreground"
        )}
      >
        <FunnelSimple size={12} weight={active ? "fill" : "regular"} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start">
          <Popover.Popup
            className={cn(
              "bg-popover text-popover-foreground rounded-md border shadow-md p-2 w-56",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
              "transition-opacity duration-150 z-50"
            )}
          >
            <div className="flex items-center gap-1.5">
              <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={`Filter ${columnLabel.toLowerCase()}…`}
                autoFocus
                className="h-8 text-sm"
              />
              {value ? (
                <button
                  type="button"
                  onClick={() => onChange("")}
                  aria-label="Očisti filter"
                  className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </button>
              ) : null}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
