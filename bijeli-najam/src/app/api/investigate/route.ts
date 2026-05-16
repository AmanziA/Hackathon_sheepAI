import { NextResponse } from "next/server";

const PIPELINE_URL = process.env.PIPELINE_API_URL ?? "http://localhost:8001";

export async function POST(req: Request) {
  let body: { candidate_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const id = body.candidate_id;
  if (!id) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${PIPELINE_URL}/investigate/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
