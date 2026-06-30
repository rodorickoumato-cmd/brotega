import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function verifierAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profil } = await supabase.from("utilisateurs").select("role").eq("id", user.id).single();
  return profil?.role === "admin" ? user : null;
}

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin.from("villes_livraison").select("*").order("province_code").order("nom");
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
  return NextResponse.json({ villes: data });
}

export async function POST(req: NextRequest) {
  const user = await verifierAdmin();
  if (!user) return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const admin = createAdminClient();
  const { error } = await admin.from("villes_livraison").upsert({ ...body, actif: true }, { onConflict: "nom" });
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
  revalidatePath("/", "layout");
  return NextResponse.json({ succes: true });
}

export async function PATCH(req: NextRequest) {
  const user = await verifierAdmin();
  if (!user) return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });

  const { nom, ...updates } = await req.json();
  if (!nom) return NextResponse.json({ erreur: "nom requis" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("villes_livraison").update(updates).eq("nom", nom);
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
  revalidatePath("/", "layout");
  return NextResponse.json({ succes: true });
}
