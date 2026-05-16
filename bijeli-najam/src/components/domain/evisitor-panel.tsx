import { Badge } from "@/components/ui/badge";
import {
  Buildings,
  CalendarBlank,
  CheckCircle,
  WarningCircle,
  CurrencyEur,
  Bed,
  ClipboardText,
  WarningOctagon,
} from "@phosphor-icons/react/dist/ssr";
import type { EvisitorLookup, EvisitorRecord } from "@/lib/evisitor-mock";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatEur(n: number): string {
  return n.toLocaleString("hr-HR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

const STATUS_META: Record<
  EvisitorRecord["status"],
  { label: string; tone: "success" | "warning" | "destructive" }
> = {
  aktivan: { label: "Aktivan", tone: "success" },
  neaktivan: { label: "Neaktivan", tone: "warning" },
  suspendiran: { label: "Suspendiran", tone: "destructive" },
};

function MetricRow({
  icon,
  label,
  value,
  emphasis,
  warning,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
  warning?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm", emphasis ? "font-semibold" : "font-medium")}>{value}</p>
        {warning ? (
          <p className="text-xs text-warning mt-0.5 flex items-center gap-1">
            <WarningOctagon size={11} weight="fill" />
            {warning}
          </p>
        ) : null}
      </div>
    </div>
  );
}

interface RecordProps {
  record: EvisitorRecord;
  expectedBeds?: number | null;
}

export function EvisitorRecordPanel({ record, expectedBeds }: RecordProps) {
  const status = STATUS_META[record.status];
  const bedsMismatch =
    expectedBeds != null && expectedBeds !== record.registered_beds
      ? `Oglas navodi ${expectedBeds} kreveta — registar kaže ${record.registered_beds}.`
      : undefined;

  return (
    <div className="rounded-lg border bg-card">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Buildings size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold">eVisitor sustav</span>
          <code className="text-xs text-muted-foreground font-mono">{record.mbo}</code>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            status.tone === "success" && "border-success/40 text-success bg-success/5",
            status.tone === "warning" && "border-warning/40 text-warning bg-warning/5",
            status.tone === "destructive" && "border-destructive/40 text-destructive bg-destructive/5"
          )}
        >
          {status.label}
        </Badge>
      </header>

      <div className="grid grid-cols-2 gap-x-6 gap-y-0 px-4 py-2">
        <MetricRow
          icon={<CalendarBlank size={14} />}
          label="Kategorizirano"
          value={formatDate(record.categorized_at)}
        />
        <MetricRow
          icon={<ClipboardText size={14} />}
          label="Kategorija"
          value={record.registered_category}
        />
        <MetricRow
          icon={<Bed size={14} />}
          label="Registrirano kreveta"
          value={record.registered_beds}
          warning={bedsMismatch}
        />
        <MetricRow
          icon={<Buildings size={14} />}
          label="Turistička zajednica"
          value={record.tourist_board}
        />
        <MetricRow
          icon={<CheckCircle size={14} />}
          label="Prijavljena noćenja (2026)"
          value={record.reported_nights_ytd.toLocaleString("hr-HR")}
          emphasis
        />
        <MetricRow
          icon={<CurrencyEur size={14} />}
          label="Boravišna pristojba (YTD)"
          value={formatEur(record.tax_paid_ytd_eur)}
          emphasis
        />
        <MetricRow
          icon={<CalendarBlank size={14} />}
          label="Posljednja prijava gosta"
          value={formatDate(record.last_check_in_at)}
          warning={
            record.status === "aktivan" && !record.last_check_in_at
              ? "Aktivan, ali bez prijavljenih noćenja."
              : undefined
          }
        />
      </div>
    </div>
  );
}

interface LookupProps {
  lookup: EvisitorLookup;
  expectedBeds?: number | null;
}

export function EvisitorPanel({ lookup, expectedBeds }: LookupProps) {
  if (lookup.found) {
    return <EvisitorRecordPanel record={lookup.record} expectedBeds={expectedBeds} />;
  }

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <WarningCircle size={16} weight="fill" className="text-destructive" />
        <span className="text-sm font-semibold text-destructive">
          Nije pronađen u eVisitor sustavu
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Svaki legalni iznajmljivač u Hrvatskoj mora prijavljivati svako noćenje u eVisitor. Za
        ovaj oglas nije pronađena niti jedna evidencija — nema MBO-a, kategorizacije, prijava
        noćenja ni uplaćene boravišne pristojbe.
      </p>
    </div>
  );
}
