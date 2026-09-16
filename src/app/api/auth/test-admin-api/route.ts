import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createAdminClient();
  const results: any = {};

  try {
    results.admin_auth_exists = !!(admin.auth);
    
    const listUsersResult = await (admin.auth.admin as any).listUsers();
    
    results.listUsers_success = !listUsersResult.error;
    results.listUsers_error = listUsersResult.error?.message || null;
    results.listUsers_data_count = listUsersResult.data?.length || 0;
    
    if (listUsersResult.data && listUsersResult.data.length > 0) {
      results.all_emails = listUsersResult.data.map((u: any) => u.email);
    }
  } catch (err: any) {
    results.error = err.message;
  }

  return NextResponse.json(results);
}
