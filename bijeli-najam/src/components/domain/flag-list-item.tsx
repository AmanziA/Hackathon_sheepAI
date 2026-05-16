import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, MapPin, Clock } from "@phosphor-icons/react";
import { ConfidenceBadge } from "./confidence-badge";
import { formatDateTime, formatEur } from "@/lib/format";
import type { Flag } from "@/lib/types";

interface Props {
  flag: Flag;
  onSelect: (id: string) => void;
}

export function FlagListItem({ flag, onSelect }: Props) {
  const listing = flag.candidate_listings;

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(flag.id)}>
      <TableCell>
        <ConfidenceBadge score={flag.confidence_unregistered} size="sm" />
      </TableCell>
      <TableCell className="font-medium max-w-xs truncate">
        {listing?.title ?? "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {listing?.neighborhood ? (
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {listing.neighborhood}
          </span>
        ) : "—"}
      </TableCell>
      <TableCell className="text-sm">
        {listing?.price_per_night ? formatEur(listing.price_per_night) + "/noć" : "—"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {listing?.scraped_at ? formatDateTime(listing.scraped_at) : "—"}
        </span>
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Pregledaj dokaze"
          onClick={(e) => { e.stopPropagation(); onSelect(flag.id); }}
        >
          <Eye size={16} />
        </Button>
      </TableCell>
    </TableRow>
  );
}
