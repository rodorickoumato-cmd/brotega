import { NextRequest, NextResponse } from "next/server";

// POST : PVIT envoie la nouvelle clé secrète ici
export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    console.log("PVIT_NEW_SECRET_PAYLOAD:", text);
  } catch (err) {
    console.error("PVIT reception error:", err);
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
