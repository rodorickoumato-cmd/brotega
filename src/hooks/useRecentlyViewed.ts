"use client";
import { useEffect, useState } from "react";

const KEY = "brotega_recently_viewed";
const MAX = 8;

export function useRecentlyViewed() {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setSlugs(JSON.parse(stored));
    } catch {
      // localStorage non disponible
    }
  }, []);

  const addProduct = (slug: string) => {
    setSlugs((prev) => {
      const filtered = prev.filter((s) => s !== slug);
      const next = [slug, ...filtered].slice(0, MAX);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  };

  const clear = () => {
    setSlugs([]);
    try { localStorage.removeItem(KEY); } catch { /* */ }
  };

  return { slugs, addProduct, clear };
}
