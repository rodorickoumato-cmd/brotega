/**
 * API: POST /api/livraisons/photos/upload - Upload delivery photo with validation
 * ✅ Photo validation (type, size, magic numbers)
 * ✅ Duplicate detection
 * ✅ Audit logging
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePhotoUpload, getUploadPath } from "@/lib/photo-moderation";
import { logAuditEvent } from "@/lib/audit-logger";
import { getClientIP } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const ip = getClientIP(Object.fromEntries(req.headers));

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const livraisonId = formData.get("livraison_id") as string;

    // ✅ VALIDATE INPUTS
    if (!file || !livraisonId) {
      await logAuditEvent({
        action: "suspicious_activity",
        resource_type: "photo",
        status: "failure",
        ip_address: ip,
        details: { reason: "Missing photo or livraison_id" },
      });

      return NextResponse.json(
        { erreur: "Fichier ou livraison_id manquant" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // ✅ VERIFY DELIVERY EXISTS
    const { data: livraison, error: fetchError } = await (admin
      .from("livraisons" as any)
      .select("id, driver_id, client_id")
      .eq("id", livraisonId)
      .single()) as any;

    if (fetchError || !livraison) {
      return NextResponse.json(
        { erreur: "Livraison non trouvée" },
        { status: 404 }
      );
    }

    // ✅ VALIDATE PHOTO FILE
    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = await validatePhotoUpload(
      buffer,
      file.name,
      file.type,
      livraison.driver_id
    );

    if (!validation.valid) {
      await logAuditEvent({
        user_id: livraison.driver_id,
        action: "suspicious_activity",
        resource_type: "photo",
        status: "failure",
        ip_address: ip,
        details: { reason: validation.error, filename: file.name },
      });

      return NextResponse.json(
        { erreur: validation.error },
        { status: 400 }
      );
    }

    // ✅ GENERATE SAFE UPLOAD PATH
    const uploadPath = getUploadPath(
      livraison.driver_id,
      file.name,
      "deliveries"
    );

    // TODO: Upload to Cloudinary/S3 here
    // const cloudinaryResult = await cloudinary.uploader.upload(...);
    // const photoUrl = cloudinaryResult.secure_url;

    // For MVP: Use mock URL (in production, use real storage)
    const photoUrl = `/uploads/deliveries/${uploadPath}`;

    // ✅ INSERT INTO DATABASE
    const { data: photoRecord, error: insertError } = await (admin
      .from("delivery_photos" as any)
      .insert({
        livraison_id: livraisonId,
        user_id: livraison.driver_id,
        photo_url: photoUrl,
        photo_hash: validation.metadata?.hash,
        photo_type: "delivery",
        mime_type: validation.metadata?.mimeType,
        file_size: validation.metadata?.size,
        description: "Photo de confirmation de livraison",
        verified: false, // Pending admin review
        uploaded_at: new Date().toISOString(),
      })
      .select("id")
      .single()) as any;

    if (insertError) {
      console.error("[PHOTO UPLOAD] Insert error:", insertError);
      return NextResponse.json(
        { erreur: "Erreur enregistrement photo" },
        { status: 500 }
      );
    }

    // ✅ UPDATE DELIVERY
    const { error: updateError } = await (admin
      .from("livraisons" as any)
      .update({
        proof_photo_url: photoUrl,
        proof_photo_id: photoRecord.id,
        proof_photo_taken_at: new Date().toISOString(),
      })
      .eq("id", livraisonId)) as any;

    if (updateError) {
      console.error("[PHOTO UPLOAD] Update error:", updateError);
      return NextResponse.json(
        { erreur: "Erreur mise à jour livraison" },
        { status: 500 }
      );
    }

    // ✅ LOG SUCCESS
    await logAuditEvent({
      user_id: livraison.driver_id,
      action: "delivery_complete",
      resource_type: "delivery",
      resource_id: livraisonId,
      status: "success",
      ip_address: ip,
      details: {
        photo_id: photoRecord.id,
        file_size: validation.metadata?.size,
        mime_type: validation.metadata?.mimeType,
      },
    });

    return NextResponse.json(
      {
        succes: true,
        photo_id: photoRecord.id,
        url: photoUrl,
        message: "Photo enregistrée avec succès (en attente de vérification)",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/livraisons/photos/upload]", err);

    await logAuditEvent({
      action: "suspicious_activity",
      resource_type: "photo",
      status: "failure",
      ip_address: ip,
      details: { reason: String(err) },
    });

    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
