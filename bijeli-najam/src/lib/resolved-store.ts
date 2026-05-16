"use client";

import { useCallback, useEffect, useState } from "react";

export type Resolution = "reported" | "dismissed";

export type ResolvedItem = {
  id: string;
  kind: "flag" | "monitoring";
  resolution: Resolution;
  resolved_at: string;
  title: string;
  meta: string;
  href: string;
};

const KEY = "bijeli-najam:resolved-v1";

function loadFromStorage(): Record<string, ResolvedItem> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, ResolvedItem>) : {};
  } catch {
    return {};
  }
}

function writeToStorage(items: Record<string, ResolvedItem>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("bijeli-najam:resolved-change"));
}

export function useResolved() {
  const [items, setItems] = useState<Record<string, ResolvedItem>>({});

  useEffect(() => {
    setItems(loadFromStorage());
    const reload = () => setItems(loadFromStorage());
    window.addEventListener("storage", reload);
    window.addEventListener("bijeli-najam:resolved-change", reload);
    return () => {
      window.removeEventListener("storage", reload);
      window.removeEventListener("bijeli-najam:resolved-change", reload);
    };
  }, []);

  const resolve = useCallback((item: Omit<ResolvedItem, "resolved_at">) => {
    const next = {
      ...loadFromStorage(),
      [item.id]: { ...item, resolved_at: new Date().toISOString() },
    };
    writeToStorage(next);
  }, []);

  const unresolve = useCallback((id: string) => {
    const cur = loadFromStorage();
    delete cur[id];
    writeToStorage(cur);
  }, []);

  const clearAll = useCallback(() => {
    writeToStorage({});
  }, []);

  return { items, resolve, unresolve, clearAll };
}
