// First line of defense against prompt injection and off-topic prompts --
// a cheap, deterministic check BEFORE any LLM call. This does not replace
// the LLM-level guard (see gemini-chat.ts's structured `in_scope` output)
// -- it's defense-in-depth: an obviously off-topic or injection-shaped
// message never reaches the model at all, so it can't be talked into
// answering it, and no API quota is spent on it either.

// Common jailbreak/injection phrasings, English + Indonesian. Matches
// loosely on purpose (better to over-block a borderline message than let
// an injection through) -- a genuine in-scope question rarely needs these
// exact phrasings.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all |the )?(previous|prior|above|earlier) (instructions?|prompts?|rules?)/i,
  /disregard (all |the )?(previous|prior|above|earlier)/i,
  /abaikan (semua |seluruh )?(instruksi|perintah|aturan) (sebelumnya|di atas)/i,
  /you are now/i,
  /act as (a |an )?(?!.{0,40}(operator|umkm))/i, // "act as X" unless X mentions our own domain roles
  /pretend (you are|to be)/i,
  /reveal (your |the )?(system prompt|instructions)/i,
  /apa (isi |itu )?system prompt/i,
  /what (is|are) your (system prompt|instructions)/i,
  /\bjailbreak\b/i,
  /\bDAN\b.{0,20}\bmode\b/i, // "DAN mode" jailbreak meme
];

// Keep this list to the site's actual domain -- TOD gentrification risk,
// zones, reallocation, tenant matching, ESG/UMKM tracking. A message with
// none of these (and that isn't a plain greeting) is out of scope.
const IN_SCOPE_KEYWORDS: string[] = [
  "zona", "zone", "grid", "blok", "block",
  "gentrifikasi", "gentrification", "risiko", "risk", "rawan", "kerentanan", "vulnerab",
  "aman", "waspada", "bahaya", "ews",
  "realokasi", "reallocation", "relokasi", "pindah",
  "tenant", "penyewa", "matching", "kandidat", "candidate",
  "umkm", "usaha", "bisnis", "business", "kios", "toko",
  "esg", "kuota", "kepatuhan", "compliance",
  "stasiun", "station", "tod", "mrt", "lrt", "krl",
  "kawasan", "wilayah", "area", "lokasi", "location",
  "alokasi", "allocation", "rekomendasi", "recommendation",
  "dashboard", "laporan", "report", "peta", "map",
  "titiktemu", "matching score", "confidence", "keyakinan",
];

const GREETING_PATTERNS: RegExp[] = [
  /^(hi|hai|halo|hello|hey)\b/i,
  /^(selamat (pagi|siang|sore|malam))\b/i,
  /^(makasih|terima kasih|thanks|thank you)\b/i,
  /^(apa kabar|how are you)\b/i,
];

export type ScopeCheckResult =
  | { allowed: true }
  | { allowed: false; reason: "injection" | "off_topic" | "empty" };

export function checkScope(message: string): ScopeCheckResult {
  const trimmed = message.trim();
  if (!trimmed) return { allowed: false, reason: "empty" };

  const lower = trimmed.toLowerCase();

  if (INJECTION_PATTERNS.some((pattern) => pattern.test(lower))) {
    return { allowed: false, reason: "injection" };
  }

  if (GREETING_PATTERNS.some((pattern) => pattern.test(lower))) {
    return { allowed: true };
  }

  const hasInScopeKeyword = IN_SCOPE_KEYWORDS.some((keyword) => lower.includes(keyword));
  if (!hasInScopeKeyword) {
    return { allowed: false, reason: "off_topic" };
  }

  return { allowed: true };
}

export const REFUSAL_MESSAGES: Record<"injection" | "off_topic" | "empty", string> = {
  injection:
    "Maaf, saya tidak bisa memproses permintaan tersebut. Saya hanya dapat membantu pertanyaan seputar TitikTemu -- zona risiko, gentrifikasi, realokasi, tenant matching, dan ESG.",
  off_topic:
    "Pertanyaan itu di luar cakupan saya. Saya hanya dapat membantu pertanyaan seputar TitikTemu -- zona risiko, gentrifikasi, realokasi, tenant matching, dan ESG. Coba tanyakan mengenai salah satu topik itu.",
  empty: "Silakan ketik pertanyaan Anda.",
};
