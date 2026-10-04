"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { saveAd, unsaveAd } from "../actions";

// MKT-04: one client-side source of truth for "saved", so cards, the detail page and the Saved page
// agree (AC2). Toggles are optimistic and roll back with an error message on failure (AC1).

type Store = {
  isSaved: (adId: string, fallback: boolean) => boolean;
  toggle: (adId: string, current: boolean) => Promise<boolean>;
};

const Ctx = createContext<Store | null>(null);

export function SavedStoreProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const inflight = useRef(new Set<string>());

  const isSaved = useCallback(
    (adId: string, fallback: boolean) => overrides[adId] ?? fallback,
    [overrides],
  );

  const toggle = useCallback(async (adId: string, current: boolean) => {
    if (inflight.current.has(adId)) return current;
    inflight.current.add(adId);
    const next = !current;
    setOverrides((o) => ({ ...o, [adId]: next }));
    try {
      const res = next ? await saveAd({ adId }) : await unsaveAd({ adId });
      if (!res.ok) throw new Error(res.error.message);
      return next;
    } catch (err) {
      setOverrides((o) => ({ ...o, [adId]: current }));
      toast.error(
        err instanceof Error && err.message ? err.message : "Couldn't update your saved ads.",
      );
      return current;
    } finally {
      inflight.current.delete(adId);
    }
  }, []);

  const value = useMemo(() => ({ isSaved, toggle }), [isSaved, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSaved(adId: string, initial: boolean) {
  const store = useContext(Ctx);
  if (!store) throw new Error("useSaved needs SavedStoreProvider");
  const saved = store.isSaved(adId, initial);
  return { saved, toggle: () => store.toggle(adId, saved) };
}
