import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { haversineDistance } from "@/lib/geo";

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") ?? "");
  const radius = parseFloat(req.nextUrl.searchParams.get("radius") ?? "500");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "Nevaljani parametri" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Rough bounding box: 500m ≈ 0.0045° lat, 0.006° lon at Split's latitude
  const latDelta = radius / 111000;
  const lonDelta = radius / (111000 * Math.cos((lat * Math.PI) / 180));

  const { data } = await supabase
    .from("flags")
    .select("id, confidence_unregistered, candidate_listings(title, approx_lat, approx_lon, platform, price_per_night)")
    .eq("status", "open")
    .gte("confidence_unregistered", 0.4)
    .not("candidate_listings", "is", null);

  if (!data) return NextResponse.json({ flags: [] });

  const nearby = data
    .filter((f) => {
      const l = (f.candidate_listings as unknown) as Record<string, unknown> | null;
      if (!l?.approx_lat || !l?.approx_lon) return false;
      const d = haversineDistance(lat, lon, Number(l.approx_lat), Number(l.approx_lon));
      return d <= radius;
    })
    .map((f) => {
      const l = (f.candidate_listings as unknown) as Record<string, unknown>;
      return {
        id: f.id,
        title: l.title,
        distance_m: haversineDistance(lat, lon, Number(l.approx_lat), Number(l.approx_lon)),
        confidence_unregistered: f.confidence_unregistered,
        platform: l.platform,
        price_per_night: l.price_per_night,
      };
    })
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, 20);

  void latDelta; void lonDelta;
  return NextResponse.json({ flags: nearby });
}
