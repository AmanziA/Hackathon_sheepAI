import { cn } from "@/lib/utils";

export function DashedDivider({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "orange";
}) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn(
        "h-px w-full",
        tone === "orange"
          ? "[background-image:repeating-linear-gradient(to_right,hsl(28_85%_55%/0.6)_0_6px,transparent_6px_12px)]"
          : "[background-image:repeating-linear-gradient(to_right,hsl(var(--border))_0_6px,transparent_6px_12px)]",
        className
      )}
    />
  );
}
