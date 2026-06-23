/**
 * Posts a reservation email to the Auris backend (public /reserve endpoint on the
 * existing Cloudflare Worker — no API key, CORS-open). Override the URL in any
 * environment with NEXT_PUBLIC_RESERVE_URL.
 */
const RESERVE_URL =
  process.env.NEXT_PUBLIC_RESERVE_URL ??
  "https://auris-backend.aurisapi.workers.dev/reserve";

const RESERVE_COUNT_URL =
  process.env.NEXT_PUBLIC_RESERVE_COUNT_URL ??
  "https://auris-backend.aurisapi.workers.dev/reserve/count";

export async function reserve(
  email: string,
): Promise<{ ok: boolean; alreadyReserved: boolean }> {
  const res = await fetch(RESERVE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, source: "web" }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Reservation failed");
  }
  const data = (await res.json().catch(() => ({}))) as {
    alreadyReserved?: boolean;
  };
  return { ok: true, alreadyReserved: Boolean(data.alreadyReserved) };
}

/**
 * Reads the public waitlist size from the backend (GET /reserve/count, 60s edge
 * cached). Fails soft to 0 so a network hiccup can never break the UI.
 */
export async function reserveCount(): Promise<number> {
  try {
    const res = await fetch(RESERVE_COUNT_URL);
    if (!res.ok) return 0;
    const data = (await res.json()) as { count?: number };
    return typeof data.count === "number" ? data.count : 0;
  } catch {
    return 0;
  }
}
