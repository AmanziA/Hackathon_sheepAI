import { cn } from "@/lib/utils";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
  tone?: "orange" | "red" | "green" | "blue" | "muted";
}

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  orange: "bg-[hsl(28_85%_55%)]",
  red: "bg-destructive",
  green: "bg-success",
  blue: "bg-blue-500",
  muted: "bg-muted-foreground/40",
};

export function SectionHead({
  eyebrow,
  title,
  description,
  className,
  size = "md",
  align = "left",
  tone = "orange",
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
            "inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
            align === "center" && "justify-center w-full"
          )}
        >
          <span className={cn("inline-block w-1.5 h-1.5 rounded-full", TONE[tone])} aria-hidden />
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
