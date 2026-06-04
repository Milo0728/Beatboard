import { NextResponse } from "next/server";

import { getAlbum } from "@/lib/deezer";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0 || !Number.isInteger(numericId)) {
      return jsonError("ID de álbum inválido", 400);
    }

    const album = await getAlbum(numericId);
    if (!album) return jsonError("Álbum no encontrado", 404);

    return NextResponse.json({ ok: true, album });
  } catch (err) {
    console.error("[GET /api/music/album/:id] unexpected", err);
    return NextResponse.json(
      { ok: false, error: "Error interno", details: String(err) },
      { status: 500 },
    );
  }
}
