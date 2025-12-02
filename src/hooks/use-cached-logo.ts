// src/hooks/useCachedLogo.ts
"use client";
import { useEffect, useMemo } from "react";
import { getLogoSrc, prefetchLogo } from "@/lib/logoCache";

/**
 * Returns a URL string for <img src>. The hook:
 *  - canonicalizes the URL (no &time=…)
 *  - returns it synchronously so the <img> can let the browser cache handle things
 *  - optionally pre-warms Cache Storage/HTTP cache in the background
 */
export default function useCachedLogo(
  url?: string,
  options?: {
    /** warm the cache in the background (default: true) */
    prefetch?: boolean;
  },
): string | undefined {
  const { prefetch = true } = options ?? {};

  // Compute canonical URL synchronously for immediate render
  const src = useMemo(() => (url ? getLogoSrc(url) : undefined), [url]);

  // Warm the cache (non-blocking)
  useEffect(() => {
    if (!src || !prefetch) return;
    // Fire-and-forget; deduped by prefetchLogo
    void prefetchLogo(src);
  }, [src, prefetch]);

  return src;
}
