import { getSupabaseAdmin } from "../lib/supabase.js";

// One-off local/dev convenience: creates two ready-to-use, already-confirmed
// accounts (one per self-serve role) via the Admin API, so signup/email
// confirmation doesn't have to be exercised by hand just to get a test
// session. Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (a real
// project -- there's no local GoTrue, see supabase/migrations/004_auth_profiles.sql).
// Run with: pnpm seed:test-users
const TEST_ACCOUNTS = [
  {
    email: "umkm.test@titiktemu.dev",
    password: "TitikTemu123!",
    role: "umkm",
    full_name: "Budi (UMKM Test Account)",
  },
  {
    email: "operator.test@titiktemu.dev",
    password: "TitikTemu123!",
    role: "operator_tod",
    full_name: "Sari (Operator Test Account)",
  },
] as const;

async function main() {
  const admin = getSupabaseAdmin();

  for (const account of TEST_ACCOUNTS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { role: account.role, full_name: account.full_name },
    });

    if (error) {
      // already exists -- fine for a script meant to be re-run.
      if (error.message.toLowerCase().includes("already been registered")) {
        console.log(`- ${account.email} already exists, skipping`);
        continue;
      }
      throw error;
    }

    console.log(`+ created ${account.email} (role: ${account.role}, id: ${data.user.id})`);
  }

  console.log("\nDone. Test credentials (password is the same for both):");
  for (const account of TEST_ACCOUNTS) {
    console.log(`  ${account.role.padEnd(12)} ${account.email}  /  ${account.password}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
