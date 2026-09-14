import { appConfig } from "../config/index.js";

// Test-only helper: signs in as one of the accounts created by
// `pnpm seed:test-users` (src/scripts/seed-test-users.ts) via Supabase's own
// password grant, so route tests can exercise requireAuth/requireRole with a
// real access token instead of a mock. Requires that script to have been run
// against the project SUPABASE_URL/SUPABASE_ANON_KEY point at.
const TEST_CREDENTIALS = {
  umkm: { email: "umkm.test@titiktemu.dev", password: "TitikTemu123!" },
  operator_tod: {
    email: "operator.test@titiktemu.dev",
    password: "TitikTemu123!",
  },
} as const;

function authBaseUrl(): string {
  // .env's SUPABASE_URL is the REST endpoint (".../rest/v1/"); GoTrue lives
  // at the project's bare base URL.
  return appConfig.supabaseUrl.replace(/\/rest\/v1\/?$/, "");
}

export async function getTestAccessToken(
  role: keyof typeof TEST_CREDENTIALS,
): Promise<string> {
  const { email, password } = TEST_CREDENTIALS[role];
  const response = await fetch(
    `${authBaseUrl()}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: appConfig.supabaseAnonKey,
      },
      body: JSON.stringify({ email, password }),
    },
  );
  const body = (await response.json()) as {
    access_token?: string;
    msg?: string;
  };
  if (!body.access_token) {
    throw new Error(
      `Could not sign in as test account '${role}' (${email}) -- run 'pnpm seed:test-users' against this SUPABASE_URL first. Supabase said: ${body.msg ?? response.statusText}`,
    );
  }
  return body.access_token;
}
