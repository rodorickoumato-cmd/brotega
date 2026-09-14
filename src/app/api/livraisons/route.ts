/**
 * API: GET /api/livraisons - Get deliveries with data masking
 * ✅ Mask sensitive info before sending to client
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { maskDeliveryData } from "@/lib/data-masking";
import { logAuditEvent } from "@/lib/audit-logger";
import { getClientIP } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const ip = getClientIP(Object.fromEntries(req.headers));

  try {
    // ✅ Get authenticated user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
    }

    // ✅ Get user role
    const { data: userRecord } = await (supabase
      .from("utilisateurs_auth_v2" as any)
      .select("role")
      .eq("id", user.id)
      .single()) as any;

    const userRole = userRecord?.role || "customer";

    // ✅ BUILD QUERY based on role
    let query = supabase.from("livraisons" as any).select("*");

    // Filter by role
    if (userRole === "customer") {
      // ✅ Customers see only their own deliveries
      query = query.eq("client_id", user.id);
    } else if (userRole === "livreur") {
      // ✅ Drivers see assigned deliveries
      query = query.eq("driver_id", user.id);
    } else if (userRole === "vendor") {
      // ✅ Vendors see their store's deliveries
      const { data: vendorStore } = await (supabase
        .from("vendeurs" as any)
        .select("id")
        .eq("user_id", user.id)
        .single()) as any;

      if (vendorStore) {
        query = query.eq("vendor_id", vendorStore.id);
      }
    } else if (userRole === "admin") {
      // ✅ Admins see all (no filter)
    }

    // ✅ EXECUTE QUERY
    const { data: deliveries, error: queryError } = await query.order(
      "created_at",
      { ascending: false }
    );

    if (queryError) {
      console.error("[DELIVERY API] Query error:", queryError);
      return NextResponse.json(
        { erreur: "Erreur lors du chargement" },
        { status: 500 }
      );
    }

    // ✅ MASK SENSITIVE DATA before sending to client
    const masked = deliveries?.map((delivery) => {
      // Admins and vendors see full data, drivers/customers see masked
      if (userRole === "customer" || userRole === "livreur") {
        return maskDeliveryData(delivery);
      }
      return delivery; // Admins/vendors see full data
    }) || [];

    // ✅ LOG ACCESS
    await logAuditEvent({
      user_id: user.id,
      action: "data_export",
      resource_type: "delivery",
      status: "success",
      ip_address: ip,
      details: {
        count: masked.length,
        role: userRole,
      },
    });

    return NextResponse.json(
      {
        succes: true,
        count: masked.length,
        deliveries: masked,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/livraisons]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
