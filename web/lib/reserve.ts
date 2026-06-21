/**
 * Posts a reservation email to the Auris backend (public /reserve endpoint on the
 * existing Cloudflare Worker — no API key, CORS-open). Override the URL in any
 * environment with NEXT_PUBLIC_RESERVE_URL.
 */
const RESERVE_URL =
  process.env.NEXT_PUBLIC_RESERVE_URL ??
  "https://auris-backend.aurisapi.workers.dev/reserve";

export async function reserve(email: string): Promise<{ ok: boolean }> {
  const res = await fetch(RESERVE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, source: "web" }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Reservation failed");
  }
  return { ok: true };
}
