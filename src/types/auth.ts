// Mirrors the `user_role` enum from supabase/migrations/001_init.sql.
export type UserRole = "pemda_admin" | "operator_tod" | "umkm" | "public_user";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string | null;
}
