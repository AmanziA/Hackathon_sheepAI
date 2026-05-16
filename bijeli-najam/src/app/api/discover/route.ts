import { NextResponse } from "next/server";

const PIPELINE_URL = process.env.PIPELINE_API_URL ?? "http://localhost:8001";

export async function POST(req: Request) {
  let body: { registered_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const id = body.registered_id;
  if (!id) {
    return NextResponse.json({ error: "registered_id required" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${PIPELINE_URL}/discover/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Discovery can take ~30s per unit; let Next route handler wait.
      signal: AbortSignal.timeout(120_000),
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Pipeline unreachable at ${PIPELINE_URL}: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}
