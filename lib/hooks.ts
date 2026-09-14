"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useSyncExternalStore } from "react";
import { db } from "@/lib/db/schema";
import { allCategories, DEFAULT_SETTINGS, mergePlaces } from "@/lib/db/repo";
import { distanceKm } from "@/lib/geo";
import type { Place } from "@/lib/types";
import type { Rates } from "@/lib/data/shopping";

/**
 * Lectura de la base local.
 *
 * `useLiveQuery` vuelve a correr la consulta sola cuando cambia la tabla, así que después de
 * guardar un lugar no hay que refrescar nada a mano: la lista y el mapa se enteran solos.
 */
export function usePlaces(me: { lat: number; lng: number } | null): Place[] {
  const overrides = useLiveQuery(() => db().overrides.toArray(), [], []);
  const mine = useLiveQuery(() => db().places.toArray(), [], []);

  return useMemo(() => {
    const list = mergePlaces(overrides, mine);
    if (!me) return list;
    return list.map((p) => ({ ...p, km: distanceKm(me.lat, me.lng, p.lat, p.lng) }));
  }, [overrides, mine, me]);
}

export function useFlags() {
  const rows = useLiveQuery(() => db().flags.toArray(), [], []);
  return useMemo(() => {
    const fav = new Set<string>();
    const done = new Set<string>();
    for (const r of rows) {
      if (r.deletedAt) continue;
      if (r.fav) fav.add(r.placeId);
      if (r.done) done.add(r.placeId);
    }
    return { fav, done };
  }, [rows]);
}

export function useCategories() {
  const custom = useLiveQuery(() => db().categories.toArray(), [], []);
  return useMemo(() => allCategories(custom), [custom]);
}

export function useSettings() {
  const row = useLiveQuery(() => db().settings.get("settings"), [], undefined);
  return { ...DEFAULT_SETTINGS, ...(row ?? {}) };
}

export function useRates(): Rates {
  const s = useSettings();
  return { usdKrw: s.usdKrw, usdBobOficial: s.usdBobOficial, usdBobParalelo: s.usdBobParalelo };
}

export function usePurchases() {
  const rows = useLiveQuery(() => db().purchases.toArray(), [], []);
  return useMemo(() => rows.filter((r) => !r.deletedAt).sort((a, b) => b.boughtAt - a.boughtAt), [rows]);
}

export function useSightings() {
  const rows = useLiveQuery(() => db().sightings.toArray(), [], []);
  return useMemo(() => rows.filter((r) => !r.deletedAt), [rows]);
}

export function useOutboxCount(): number {
  return useLiveQuery(() => db().outbox.count(), [], 0);
}

const noop = () => () => {};

/**
 * Evita el desajuste entre el HTML del servidor y el del navegador en lo que depende de IndexedDB.
 *
 * Va con useSyncExternalStore y no con un efecto: devuelve false en el servidor y true en el
 * navegador sin provocar un render en cascada.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
