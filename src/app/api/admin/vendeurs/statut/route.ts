import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { vendeurId, statut } = await req.json() as {
      vendeurId: string;
      statut: "verifie" | "suspendu" | "en_attente";
    };

    if (!vendeurId || !["verifie", "suspendu", "en_attente"].includes(statut)) {
      return NextResponse.json({ erreur: "Paramètres invalides" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });

    const { data: profil } = await supabase
      .from("utilisateurs").select("role").eq("id", user.id).single();
    if (profil?.role !== "admin") {
      return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("vendeurs").update({ statut }).eq("id", vendeurId);
    if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });

    return NextResponse.json({ succes: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erreur: "Erreur serveur : " + msg }, { status: 500 });
  }
}
