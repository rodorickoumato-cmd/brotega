/**
 * QUERY OPTIMIZATION - Production Grade
 * ✅ Pagination strategies
 * ✅ N+1 query prevention
 * ✅ Index recommendations
 * ✅ Query profiling
 */

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number; // 1-indexed
  limit: number; // items per page
  offset?: number; // calculated as (page - 1) * limit
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Validate and normalize pagination params
 */
export function normalizePagination(page?: number, limit?: number): PaginationParams {
  const p = Math.max(1, page || 1); // Default page 1
  const l = Math.min(100, Math.max(1, limit || 20)); // Default 20, max 100

  return {
    page: p,
    limit: l,
    offset: (p - 1) * l,
  };
}

/**
 * Build paginated response
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationParams
): PaginatedResponse<T> {
  const pages = Math.ceil(total / pagination.limit);

  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages,
      hasNext: pagination.page < pages,
      hasPrev: pagination.page > 1,
    },
  };
}

/**
 * ✅ CRITICAL INDEXES TO CREATE
 */
export const RECOMMENDED_INDEXES = `
-- Products
CREATE INDEX idx_products_vendor_id ON products(vendor_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_name_search ON products USING GIN(name gin_trgm_ops);

-- Orders
CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_client_status ON orders(client_id, status);

-- Livraisons/Deliveries
CREATE INDEX idx_livraisons_driver_id ON livraisons(driver_id);
CREATE INDEX idx_livraisons_order_id ON livraisons(order_id);
CREATE INDEX idx_livraisons_status ON livraisons(status);
CREATE INDEX idx_livraisons_created_at ON livraisons(created_at DESC);
CREATE INDEX idx_livraisons_driver_status ON livraisons(driver_id, status);

-- Messages
CREATE INDEX idx_messages_order_id ON messages(order_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Delivery Photos
CREATE INDEX idx_delivery_photos_livraison_id ON delivery_photos(livraison_id);
CREATE INDEX idx_delivery_photos_verified ON delivery_photos(verified);
CREATE INDEX idx_delivery_photos_uploaded_at ON delivery_photos(uploaded_at DESC);

-- Audit Logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Auth
CREATE INDEX idx_utilisateurs_auth_v2_pseudo ON utilisateurs_auth_v2(pseudo);
`;

/**
 * ✅ QUERY PATTERNS TO AVOID
 */
export const QUERY_ANTI_PATTERNS = `
❌ ANTI-PATTERN 1: N+1 Queries
Bad:
  const orders = await db.orders.find({...});
  for (const order of orders) {
    const items = await db.orderItems.find({order_id: order.id}); // N queries!
  }

Good:
  const orders = await db.orders.find({...}).include('items');
  // Join in single query

❌ ANTI-PATTERN 2: SELECT *
Bad:
  SELECT * FROM orders WHERE id = 123;

Good:
  SELECT id, client_id, total, status FROM orders WHERE id = 123;
  // Only needed columns

❌ ANTI-PATTERN 3: No Pagination
Bad:
  SELECT * FROM messages WHERE order_id = 123;
  // Returns 100,000 rows!

Good:
  SELECT * FROM messages WHERE order_id = 123
  ORDER BY created_at DESC
  LIMIT 20 OFFSET 0;

❌ ANTI-PATTERN 4: Missing Index
Bad:
  SELECT * FROM orders WHERE status = 'pending' AND created_at > '2026-01-01';
  -- Full table scan without indexes

Good:
  CREATE INDEX idx_orders_status_date ON orders(status, created_at DESC);

❌ ANTI-PATTERN 5: Inefficient Joins
Bad:
  SELECT * FROM orders
  LEFT JOIN order_items ON orders.id = order_items.order_id
  LEFT JOIN products ON order_items.product_id = products.id
  LEFT JOIN vendors ON products.vendor_id = vendors.id
  -- Multiple joins without WHERE clause

Good:
  Add WHERE clause to filter early
  Use indexed joins
`;

/**
 * Query profiling helper
 */
export async function profileQuery(
  name: string,
  queryFn: () => Promise<any>
): Promise<any> {
  const start = performance.now();

  try {
    const result = await queryFn();
    const duration = performance.now() - start;

    if (duration > 500) {
      console.warn(`[SLOW QUERY] ${name}: ${duration.toFixed(2)}ms`);
    } else {
      console.log(`[QUERY] ${name}: ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (err) {
    const duration = performance.now() - start;
    console.error(`[QUERY ERROR] ${name}: ${duration.toFixed(2)}ms`, err);
    throw err;
  }
}

/**
 * Batch query optimization
 * Fetch related data in single query instead of N queries
 */
export async function batchFetch<T, K>(
  items: T[],
  keyFn: (item: T) => K,
  batchFn: (keys: K[]) => Promise<Map<K, any>>
): Promise<(T & { related: any })[]> {
  const keys = items.map(keyFn);
  const related = await batchFn(keys);

  return items.map((item) => ({
    ...item,
    related: related.get(keyFn(item)),
  }));
}

/**
 * Lazy loading helper
 * Load related data on demand
 */
export class LazyLoader<T> {
  private cache = new Map<string, any>();

  constructor(
    private item: T,
    private loaders: Record<string, () => Promise<any>>
  ) {}

  async load(key: string): Promise<any> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const loader = this.loaders[key];
    if (!loader) throw new Error(`No loader for ${key}`);

    const data = await loader();
    this.cache.set(key, data);
    return data;
  }

  getItem(): T {
    return this.item;
  }
}

/**
 * Connection pooling recommendation
 */
export const CONNECTION_POOL_CONFIG = {
  min: 2, // Minimum connections
  max: 20, // Maximum connections
  idleTimeout: 30000, // Close idle connections after 30s
  requestTimeout: 5000, // Timeout for connection request
};

/**
 * Database statistics
 * Run ANALYZE VERBOSE on critical tables
 */
export const DB_STATS_QUERIES = `
-- Analyze query plans
EXPLAIN ANALYZE
SELECT * FROM orders WHERE status = 'pending' LIMIT 10;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Check missing indexes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname != 'pg_catalog'
ORDER BY abs(correlation) DESC;

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname != 'pg_catalog'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
`;
