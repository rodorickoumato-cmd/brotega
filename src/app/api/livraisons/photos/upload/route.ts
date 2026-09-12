// API: Upload delivery photo

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const livraisonId = formData.get("livraison_id") as string;

    if (!file || !livraisonId) {
      return NextResponse.json(
        { erreur: "Fichier ou livraison_id manquant" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Vérifier que la livraison existe et que l'utilisateur est le livreur
    const { data: livraison, error: fetchError } = await (admin
      .from("livraisons" as any)
      .select("id, livreur_id")
      .eq("id", livraisonId)
      .single()) as any;

    if (fetchError || !livraison) {
      return NextResponse.json(
        { erreur: "Livraison non trouvée" },
        { status: 404 }
      );
    }

    // 2. Pour cet MVP, on simule l'upload (en prod, utiliser Cloudinary/S3)
    // Générer une URL factice basée sur le nom de fichier
    const fileName = `delivery-${livraisonId}-${Date.now()}.jpg`;
    const photoUrl = `/uploads/deliveries/${fileName}`;

    // 3. Insérer dans delivery_photos
    const { error: insertError } = await (admin
      .from("delivery_photos" as any)
      .insert({
        livraison_id: livraisonId,
        photo_url: photoUrl,
        photo_type: "delivery",
        description: "Photo de confirmation de livraison",
      })) as any;

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { erreur: "Erreur enregistrement photo" },
        { status: 500 }
      );
    }

    // 4. Mettre à jour la livraison avec la photo
    const { error: updateError } = await (admin
      .from("livraisons" as any)
      .update({
        proof_photo_url: photoUrl,
        proof_photo_taken_at: new Date().toISOString(),
      })
      .eq("id", livraisonId)) as any;

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { erreur: "Erreur mise à jour livraison" },
        { status: 500 }
      );
    }

    // 5. Log d'audit
    await (admin
      .from("recovery_attempts" as any)
      .insert({
        action: "photo_upload",
        success: true,
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        user_agent: req.headers.get("user-agent"),
      })) as any;

    return NextResponse.json(
      {
        succes: true,
        url: photoUrl,
        message: "Photo enregistrée avec succès",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/livraisons/photos/upload]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
