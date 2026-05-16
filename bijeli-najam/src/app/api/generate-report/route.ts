import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const flagId = req.nextUrl.searchParams.get("flag_id");
  if (!flagId) return NextResponse.json({ error: "Nedostaje flag_id" }, { status: 400 });

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [flagRes] = await Promise.all([
    supabase
      .from("flags")
      .select("*, candidate_listings(*), agent_traces(*)")
      .eq("id", flagId)
      .single(),
  ]);

  if (!flagRes.data) return NextResponse.json({ error: "Oznaka nije pronađena" }, { status: 404 });

  const flag = flagRes.data;
  const listing = flag.candidate_listings as Record<string, unknown> | null;
  const trace = flag.agent_traces as Record<string, unknown> | null;

  const stepsRes = trace
    ? await supabase
        .from("trace_steps")
        .select("*")
        .eq("trace_id", trace.id as string)
        .order("step_index")
    : { data: [] };
  const steps = stepsRes.data ?? [];

  const now = new Date().toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const stepsHtml = steps
    .map(
      (s: Record<string, unknown>, i: number) => `
      <tr>
        <td style="padding:4px 8px;border:1px solid #e5e7eb">${i + 1}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb;font-family:monospace;font-size:11px">${s.tool_called}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb;font-size:12px">${s.why}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb;font-size:12px">${s.updated_hypothesis}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb;font-size:12px;text-align:right">${Number(s.confidence_delta) >= 0 ? "+" : ""}${(Number(s.confidence_delta) * 100).toFixed(0)}%</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="hr">
<head><meta charset="UTF-8"><title>Prijava</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; margin: 40px; }
  h1 { font-size: 16px; margin-bottom: 4px; }
  h2 { font-size: 13px; margin-top: 24px; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th { background: #f9fafb; padding: 4px 8px; border: 1px solid #e5e7eb; text-align: left; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  .disclaimer { color: #9ca3af; font-size: 11px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
</style>
</head>
<body>
  <h1>Prijava sumnje na neregistrirano pružanje ugostiteljskih usluga</h1>
  <p class="meta">Datum izrade: ${now} · Izvor: Bijeli Najam · automatski sustav detekcije</p>

  <h2>Predmet prijave</h2>
  <table>
    <tr><th>Platforma</th><td>${listing?.platform ?? "—"}</td></tr>
    <tr><th>Naziv oglasa</th><td>${listing?.title ?? "—"}</td></tr>
    <tr><th>URL</th><td><a href="${listing?.url}">${listing?.url}</a></td></tr>
    <tr><th>Domaćin</th><td>${listing?.host_name ?? "—"}</td></tr>
    <tr><th>Kvart</th><td>${listing?.neighborhood ?? "—"}</td></tr>
    <tr><th>Broj kreveta</th><td>${listing?.beds ?? "—"}</td></tr>
    <tr><th>Cijena/noć</th><td>${listing?.price_per_night ? listing.price_per_night + " EUR" : "—"}</td></tr>
    <tr><th>Pouzdanost (neregistrirano)</th><td>${Math.round(Number(flag.confidence_unregistered) * 100)}%</td></tr>
    <tr><th>Prikupljeno</th><td>${listing?.scraped_at ?? "—"}</td></tr>
  </table>

  <h2>Trag istrage agenta</h2>
  <p style="font-size:12px;color:#6b7280">Model: ${trace?.model ?? "—"} · Koraka: ${trace?.step_count ?? 0}</p>
  <table>
    <tr>
      <th>#</th><th>Alat</th><th>Razlog poziva</th><th>Ažurirana hipoteza</th><th>Δ</th>
    </tr>
    ${stepsHtml || '<tr><td colspan="5" style="padding:8px;color:#9ca3af">Nema koraka</td></tr>'}
  </table>

  <p class="disclaimer">
    Ova prijava je automatski generirana tip Turističkoj inspekciji. Nije pravno obvezujuće rješenje.
    Svaka daljnja radnja zahtijeva ljudski nadzor i provjeru. Bijeli Najam ne preuzima odgovornost
    za konačnu odluku inspektora.
  </p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="prijava-${flagId.slice(0, 8)}.html"`,
    },
  });
}
