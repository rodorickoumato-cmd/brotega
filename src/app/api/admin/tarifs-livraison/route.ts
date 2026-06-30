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
  const { data, error } = await admin.from("tarifs_livraison").select("*").order("province_vendeur").order("province_acheteur");
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
  return NextResponse.json({ tarifs: data });
}

export async function POST(req: NextRequest) {
  const user = await verifierAdmin();
  if (!user) return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });

  const { tarifs } = await req.json() as { tarifs: Array<{ province_vendeur: string; province_acheteur: string; tarif_xaf: number }> };
  if (!Array.isArray(tarifs) || !tarifs.length) return NextResponse.json({ erreur: "Aucun tarif fourni" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("tarifs_livraison").upsert(tarifs, { onConflict: "province_vendeur,province_acheteur" });
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
  revalidatePath("/", "layout");
  return NextResponse.json({ succes: true });
}
