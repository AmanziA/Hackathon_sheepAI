import { AddressLookup } from "@/components/domain/address-lookup";

export default function LookupPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Provjeri adresu</h1>
        <p className="text-sm text-muted-foreground">
          Unesite adresu u Splitu i provjerite postoje li neregistrirani iznajmljivači u blizini.
        </p>
      </div>
      <AddressLookup />
    </div>
  );
}
