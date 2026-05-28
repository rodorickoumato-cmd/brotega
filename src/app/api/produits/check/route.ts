import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ disponibles: [], indisponibles: [] });

  const idList = ids.split(",").filter(Boolean);
  if (idList.length === 0) return NextResponse.json({ disponibles: [], indisponibles: [] });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("produits")
    .select("id, nom, statut")
    .in("id", idList);

  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });

  const trouvesActifs = (data ?? []).filter((p) => p.statut === "actif").map((p) => p.id);
  const indisponibles = idList
    .filter((id) => !trouvesActifs.includes(id))
    .map((id) => {
      const produit = (data ?? []).find((p) => p.id === id);
      return { id, nom: produit?.nom ?? "Produit inconnu" };
    });

  return NextResponse.json({ disponibles: trouvesActifs, indisponibles });
}
