import { NextResponse } from "next/server";

import { searchAlbums } from "@/lib/deezer";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return jsonError("Parámetro 'q' requerido (mín. 2 caracteres)", 400);
    }

    const rawLimit = Number(searchParams.get("limit"));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), 25)
      : 10;

    const results = await searchAlbums(q, limit);
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("[GET /api/music/search] unexpected", err);
    return NextResponse.json(
      { ok: false, error: "Error interno", details: String(err) },
      { status: 500 },
    );
  }
}
