import { cn } from "@/lib/utils";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
}

export function SectionHead({
  eyebrow,
  title,
  description,
  className,
  size = "md",
  align = "left",
}: Props) {
  const titleClass =
    size === "lg"
      ? "text-2xl font-semibold tracking-tight"
      : size === "sm"
        ? "text-sm font-semibold tracking-tight"
        : "text-base font-semibold tracking-tight";

  return (
    <div className={cn("space-y-1", align === "center" && "text-center", className)}>
      {eyebrow ? (
        <p
          className={cn(
            "inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80",
            align === "center" && "justify-center w-full"
          )}
        >
          <span aria-hidden className="inline-block w-3 h-px bg-muted-foreground/40" />
          {eyebrow}
        </p>
      ) : null}
      <h2 className={titleClass}>{title}</h2>
      {description ? (
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}
