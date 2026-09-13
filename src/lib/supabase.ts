import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { appConfig } from "../config/index.js";

// Service-role client for server-side use only (verifying access tokens,
// reading auth.users-linked data) -- never expose this key to the client.
let supabaseAdmin: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  supabaseAdmin ??= createClient(
    appConfig.supabaseUrl,
    appConfig.supabaseServiceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return supabaseAdmin;
}
