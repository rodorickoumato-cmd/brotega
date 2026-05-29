import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    console.log("PVIT_NEW_SECRET_PAYLOAD:", text);
  } catch { /* ignore */ }
  return NextResponse.json({ ok: true }, { status: 200 });
}
