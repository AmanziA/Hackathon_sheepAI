import { AddressLookup } from "@/components/domain/address-lookup";

export default function LookupPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Ivanino zrcalo</h1>
        <p className="text-muted-foreground">
          Unesite adresu u Splitu i provjerite postoje li neregistrirani iznajmljivači u blizini.
        </p>
      </div>
      <AddressLookup />
    </div>
  );
}
