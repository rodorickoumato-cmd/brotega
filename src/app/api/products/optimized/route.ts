/**
 * API: GET /api/products/optimized - Optimized product listing
 * ✅ Pagination
 * ✅ Caching
 * ✅ Indexed queries
 * ✅ Query profiling
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  normalizePagination,
  buildPaginatedResponse,
  profileQuery,
} from "@/lib/query-optimization";
import { cached, CACHE_TTL, getCacheKey } from "@/lib/cache";

export async function GET(req: NextRequest) {
  try {
    // ✅ PARSE QUERY PARAMS
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const vendorId = searchParams.get("vendor_id");
    const categoryId = searchParams.get("category_id");
    const search = searchParams.get("search");

    // ✅ NORMALIZE PAGINATION
    const pagination = normalizePagination(page, limit);

    // ✅ BUILD CACHE KEY
    const cacheKey = getCacheKey(
      "products",
      undefined,
      `v${pagination.page}_l${pagination.limit}_v${vendorId}_c${categoryId}_s${search}`
    );

    // ✅ TRY CACHE FIRST
    const cached_data = await cached(
      cacheKey,
      async () => {
        // ✅ FETCH WITH PROFILING
        return profileQuery("fetch_products", async () => {
          const supabase = createClient();

          // ✅ Build query with indexes
          let query = supabase
            .from("products")
            .select(
              `
              id,
              name,
              description,
              price,
              vendor_id,
              category_id,
              image_url,
              stock,
              created_at
            `,
              { count: "exact" }
            )
            .order("created_at", { ascending: false })
            .range(pagination.offset!, pagination.offset! + pagination.limit - 1);

          // ✅ Apply filters (uses indexes)
          if (vendorId) {
            query = query.eq("vendor_id", vendorId);
          }

          if (categoryId) {
            query = query.eq("category_id", categoryId);
          }

          // Search (note: ilike is slower, consider full-text search)
          if (search) {
            query = query.ilike("name", `%${search}%`);
          }

          const { data, count, error } = await query;

          if (error) {
            console.error("[PRODUCTS] Query error:", error);
            throw error;
          }

          return {
            data: data || [],
            total: count || 0,
          };
        });
      },
      CACHE_TTL.PRODUCT_SEARCH
    );

    // ✅ BUILD PAGINATED RESPONSE
    const response = buildPaginatedResponse(
      cached_data.data,
      cached_data.total,
      pagination
    );

    // ✅ ADD CACHE HEADERS
    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600", // 5min client, 10min CDN
        "X-Cache-Key": cacheKey,
        "X-Cache-TTL": String(CACHE_TTL.PRODUCT_SEARCH),
      },
    });
  } catch (err) {
    console.error("[GET /api/products/optimized]", err);

    return NextResponse.json(
      { erreur: "Erreur lors du chargement des produits" },
      { status: 500 }
    );
  }
}
