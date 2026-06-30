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
  const { data, error } = await admin.from("categories_produits").select("*").order("ordre");
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
  return NextResponse.json({ categories: data });
}

export async function POST(req: NextRequest) {
  const user = await verifierAdmin();
  if (!user) return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const { slug, nom, icone, couleur, bg, ordre } = body;

  if (!slug || !nom) return NextResponse.json({ erreur: "slug et nom requis" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("categories_produits").upsert({
    slug, nom, icone: icone ?? "🛒",
    couleur: couleur ?? "#E63946",
    bg: bg ?? "#FEF2F2",
    ordre: ordre ?? 0,
    actif: true,
  }, { onConflict: "slug" });

  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
  revalidatePath("/", "layout");
  return NextResponse.json({ succes: true });
}

export async function PATCH(req: NextRequest) {
  const user = await verifierAdmin();
  if (!user) return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const { slug, ...updates } = body;
  if (!slug) return NextResponse.json({ erreur: "slug requis" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("categories_produits").update(updates).eq("slug", slug);
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
  revalidatePath("/", "layout");
  return NextResponse.json({ succes: true });
}

export async function DELETE(req: NextRequest) {
  const user = await verifierAdmin();
  if (!user) return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ erreur: "slug requis" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("categories_produits").delete().eq("slug", slug);
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
  revalidatePath("/", "layout");
  return NextResponse.json({ succes: true });
}
