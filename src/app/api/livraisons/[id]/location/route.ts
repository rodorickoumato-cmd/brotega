// API: Enregistrer localisation livreur + tracer itinéraire

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: livraisonId } = await params;
    const { latitude, longitude, accuracy, speed } = await req.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { erreur: "Latitude et longitude requises" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Mettre à jour la localisation du livreur dans livraisons
    const { error: updateError } = await (admin
      .from("livraisons" as any)
      .update({
        livreur_latitude: latitude,
        livreur_longitude: longitude,
        livreur_location_updated_at: new Date().toISOString(),
      })
      .eq("id", livraisonId)) as any;

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { erreur: "Erreur mise à jour localisation" },
        { status: 500 }
      );
    }

    // 2. Insérer dans l'historique de suivi
    const { error: trackingError } = await (admin
      .from("delivery_tracking" as any)
      .insert({
        livraison_id: livraisonId,
        latitude,
        longitude,
        accuracy_meters: Math.round(accuracy || 0),
        speed_kmh: speed ? Math.round(speed * 3.6) : null, // Convert m/s to km/h
      })) as any;

    if (trackingError) {
      console.error("Tracking error:", trackingError);
      // Don't fail if tracking history fails
    }

    // 3. Calculer la distance et l'ETA
    const { data: livraison, error: fetchError } = await (admin
      .from("livraisons" as any)
      .select("latitude, longitude")
      .eq("id", livraisonId)
      .single()) as any;

    if (livraison && livraison.latitude && livraison.longitude) {
      const distance = calculateDistance(
        latitude,
        longitude,
        livraison.latitude,
        livraison.longitude
      );

      // Estimer l'arrivée (25 km/h moyenne en ville)
      const estimatedMinutes = Math.round((distance / 25) * 60);
      const estimatedArrival = new Date(
        Date.now() + estimatedMinutes * 60 * 1000
      );

      await (admin
        .from("livraisons" as any)
        .update({
          distance_km: Math.round(distance * 10) / 10,
          estimated_arrival_at: estimatedArrival.toISOString(),
        })
        .eq("id", livraisonId)) as any;
    }

    return NextResponse.json(
      {
        succes: true,
        message: "Localisation enregistrée",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/livraisons/[id]/location]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}

// Haversine formula - calculate distance between two points
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
