/**
 * API: GET /api/livraisons - Get deliveries with data masking
 * ✅ Mask sensitive info before sending to client
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { maskDeliveryData } from "@/lib/data-masking";
import { logAuditEvent } from "@/lib/audit-logger";
import { getClientIP } from "@/lib/validation";
import { verifyJWT } from "@/lib/jwt-secure";

export async function GET(req: NextRequest) {
  const ip = getClientIP(Object.fromEntries(req.headers));

  try {
    // ✅ Get authenticated user from JWT cookie
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { erreur: "Non authentifié" },
        { status: 401 }
      );
    }

    // ✅ Verify JWT signature
    const payload = verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { erreur: "Token invalide" },
        { status: 401 }
      );
    }

    const userId = payload.user_id;
    const userRole = payload.role || "customer";

    // ✅ Build query based on role
    const admin = createAdminClient();
    let query = admin.from("livraisons" as any).select("*");

    // Filter by role
    if (userRole === "customer") {
      // ✅ Customers see only their own deliveries
      query = query.eq("client_id", userId);
    } else if (userRole === "livreur") {
      // ✅ Drivers see assigned deliveries
      query = query.eq("driver_id", userId);
    } else if (userRole === "vendor") {
      // ✅ Vendors see their store's deliveries
      const { data: vendorStore } = await (admin
        .from("vendeurs" as any)
        .select("id")
        .eq("user_id", userId)
        .single()) as any;

      if (vendorStore) {
        query = query.eq("vendor_id", vendorStore.id);
      } else {
        return NextResponse.json(
          { erreur: "Vendor store not found" },
          { status: 404 }
        );
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
      user_id: userId,
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
