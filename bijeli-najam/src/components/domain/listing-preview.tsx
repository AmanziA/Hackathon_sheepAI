import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, ArrowSquareOut, Buildings } from "@phosphor-icons/react";
import type { CandidateListing } from "@/lib/types";
import { formatEur } from "@/lib/format";

interface Props {
  listing: CandidateListing;
  screenshotUrl?: string | null;
}

export function ListingPreview({ listing, screenshotUrl }: Props) {
  return (
    <Card>
      <CardContent className="p-0 overflow-hidden">
        {screenshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={screenshotUrl}
            alt={listing.title}
            className="w-full h-48 object-cover border-b"
          />
        ) : (
          <div className="w-full h-48 bg-muted flex items-center justify-center border-b">
            <Buildings size={40} className="text-muted-foreground" />
          </div>
        )}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="font-semibold leading-tight">{listing.title}</p>
              {listing.host_name && (
                <p className="text-sm text-muted-foreground">Domaćin: {listing.host_name}</p>
              )}
            </div>
            <Badge variant="outline" className="shrink-0 capitalize">
              {listing.platform}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {listing.neighborhood && (
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {listing.neighborhood}
              </span>
            )}
            {listing.beds && <span>{listing.beds} kreveta</span>}
            {listing.price_per_night && (
              <span className="font-medium text-foreground">
                {formatEur(listing.price_per_night)}/noć
              </span>
            )}
          </div>

          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Pogledaj oglas <ArrowSquareOut size={14} />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
