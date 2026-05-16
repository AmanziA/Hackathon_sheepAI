import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  headline: string;
  body?: string;
  cta?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon, headline, body, cta, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 py-16 text-center", className)}>
      <div className="text-muted-foreground [&>svg]:size-10">{icon}</div>
      <div className="space-y-1">
        <p className="text-lg font-semibold">{headline}</p>
        {body && <p className="text-sm text-muted-foreground max-w-xs">{body}</p>}
      </div>
      {cta && (
        <Button variant="outline" onClick={cta.onClick}>
          {cta.label}
        </Button>
      )}
    </div>
  );
}
