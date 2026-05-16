import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { EvisitorStay } from "@/lib/evisitor-mock";

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

function flagEmoji(country: string): string {
  if (country.length !== 2) return country;
  const base = 0x1f1e6;
  return (
    String.fromCodePoint(base + (country.charCodeAt(0) - 65)) +
    String.fromCodePoint(base + (country.charCodeAt(1) - 65))
  );
}

interface Props {
  stays: EvisitorStay[];
  limit?: number;
}

export function RecentStaysTable({ stays, limit = 10 }: Props) {
  const rows = stays.slice(0, limit);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nema prijavljenih noćenja u zadnjih 90 dana.
      </p>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">Dolazak</TableHead>
            <TableHead className="w-[110px]">Odlazak</TableHead>
            <TableHead className="text-center w-[70px]">Noći</TableHead>
            <TableHead className="text-center w-[70px]">Gosti</TableHead>
            <TableHead className="w-[80px]">Zemlja</TableHead>
            <TableHead>Izvor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="text-sm">{fmt(s.check_in)}</TableCell>
              <TableCell className="text-sm">{fmt(s.check_out)}</TableCell>
              <TableCell className="text-center text-sm tabular-nums">{s.nights}</TableCell>
              <TableCell className="text-center text-sm tabular-nums">{s.guests}</TableCell>
              <TableCell className="text-sm font-mono">
                <span aria-hidden className="mr-1">
                  {flagEmoji(s.country)}
                </span>
                {s.country}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {s.source}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
