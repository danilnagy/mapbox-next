// lib/logoCache.ts
const CACHE_NAME = "logo-cache-v1";

// In-memory dedupe of concurrent prefetches
const pending = new Map<string, Promise<void>>();

// Normalize URL (remove volatile params etc.)
export function canonicalize(input: string): string {
  try {
    const u = new URL(
      input,
      typeof window !== "undefined" ? window.location.origin : "http://x/",
    );
    u.hash = "";
    // strip any cache-busters
    u.searchParams.delete("time");
    // Keep token/format etc. if you need them
    const q = u.searchParams.toString();
    return `${u.origin}${u.pathname}${q ? `?${q}` : ""}`;
  } catch {
    return input.replace(/([?&])time=\d+/g, "$1").replace(/[?&]$/, "");
  }
}

/**
 * Returns the canonical URL to use as <img src>. Optionally pre-warms the
 * browser’s Cache Storage/HTTP cache so subsequent <img> tags won’t hit network.
 *
 * NOTE: This does not create object URLs; it relies on the browser's native cache.
 */
export function getLogoSrc(url: string): string {
  return canonicalize(url);
}

/**
 * Prefetch (warm) the logo into Cache Storage + HTTP cache.
 * Safe to call multiple times; in-flight requests are deduped.
 */
export async function prefetchLogo(url: string): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;

  const canonical = canonicalize(url);

  // Already warming/fetched?
  const inflight = pending.get(canonical);
  if (inflight) return inflight;

  const p = (async () => {
    const cache = await caches.open(CACHE_NAME);

    // If present in Cache Storage, we're done (browser will also consult HTTP cache)
    const cached = await cache.match(canonical);
    if (cached) return;

    // Request with cache awareness; this will consult the HTTP cache as well.
    const resp = await fetch(canonical, { cache: "force-cache", mode: "cors" });
    if (!resp.ok) return;

    // Store a clone so future `cache.match` hits without network
    await cache.put(canonical, resp.clone());
  })()
    .catch(() => {})
    .finally(() => pending.delete(canonical));

  pending.set(canonical, p);
  return p;
}
