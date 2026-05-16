import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { MagnifyingGlass, ChartBar } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/domain/app-shell";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-24 space-y-10">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Bijeli Najam: izravnavamo teren za legalne iznajmljivače
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Svakodnevno uspoređujemo aktivne oglase na Airbnbu i Bookingu s
            Hrvatskim turističkim zajednicama. Neupareni oglasi — potencijalno
            neregistrirani iznajmljivači — idu inspektorima.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/lookup" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
            <MagnifyingGlass size={18} />
            Provjeri svoju adresu
          </Link>
          <Link href="/impact" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}>
            <ChartBar size={18} />
            Vidi učinak
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-6 pt-8 border-t">
          {[
            { value: "1.200+", label: "pregledanih oglasa" },
            { value: "Split", label: "grad pilot" },
            { value: "2 baze", label: "HTZ registar × platforme" },
          ].map((s) => (
            <div key={s.label} className="space-y-1">
              <p className="text-2xl font-bold tracking-tight">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
