import type { SyncTable } from "@/lib/db/schema";

/**
 * Traducción entre las filas locales (camelCase, como las usa la app) y las de Postgres
 * (snake_case, como manda la convención de SQL).
 *
 * Los mapas son explícitos por tabla y no una conversión automática de nombres: una tabla nueva
 * con un campo mal traducido debe romper al compilar, no perder datos en silencio a mitad de un
 * viaje.
 */

/** Nombre de cada tabla local en Postgres. */
export const REMOTE_TABLE: Record<SyncTable, string> = {
  places: "places",
  overrides: "place_overrides",
  categories: "categories",
  flags: "flags",
  purchases: "purchases",
  sightings: "price_sightings",
  settings: "settings",
};

/** Claves primarias remotas. Las compuestas son las que llevan el dueño adelante. */
export const CONFLICT_KEYS: Record<SyncTable, string> = {
  places: "id",
  overrides: "owner,seed_id",
  categories: "id",
  flags: "owner,place_id",
  purchases: "id",
  sightings: "id",
  settings: "owner",
};

/** Clave primaria local, para poder guardar lo que baja. */
export const LOCAL_KEY: Record<SyncTable, string> = {
  places: "id",
  overrides: "seedId",
  categories: "id",
  flags: "placeId",
  purchases: "id",
  sightings: "id",
  settings: "id",
};

const iso = (ms: number | null | undefined) => (ms == null ? null : new Date(ms).toISOString());
const ms = (s: string | null | undefined) => (s == null ? null : new Date(s).getTime());

type Row = Record<string, unknown>;

/** Campos de auditoría, iguales en todas las tablas. */
const auditUp = (r: Row) => ({
  updated_at: iso(r.updatedAt as number),
  deleted_at: iso(r.deletedAt as number | null),
  device_id: (r.deviceId as string) ?? "",
});

const auditDown = (r: Row) => ({
  updatedAt: ms(r.updated_at as string) ?? 0,
  deletedAt: ms(r.deleted_at as string | null),
  deviceId: (r.device_id as string) ?? "",
});

const MAPPERS: Record<SyncTable, { up: (r: Row) => Row; down: (r: Row) => Row }> = {
  places: {
    up: (r) => ({
      id: r.id, n: r.n, k: r.k ?? "", c: r.c, z: r.z, d: r.d ?? "",
      lat: r.lat, lng: r.lng, t: r.t ?? null, hours: r.hours ?? null,
      tags: r.tags ?? [], buy: r.buy ?? [], ...auditUp(r),
    }),
    down: (r) => ({
      id: r.id, n: r.n, k: r.k ?? "", c: r.c, z: r.z, d: r.d ?? "",
      lat: r.lat, lng: r.lng, t: r.t ?? undefined, hours: r.hours ?? undefined,
      tags: r.tags ?? [], buy: r.buy ?? [], ...auditDown(r),
    }),
  },
  overrides: {
    up: (r) => ({ seed_id: r.seedId, patch: r.patch ?? {}, hidden: r.hidden ?? false, ...auditUp(r) }),
    down: (r) => ({ seedId: r.seed_id, patch: r.patch ?? {}, hidden: r.hidden ?? false, ...auditDown(r) }),
  },
  categories: {
    up: (r) => ({ id: r.id, label: r.label, color: r.color, icon: r.icon ?? "📍", ...auditUp(r) }),
    down: (r) => ({ id: r.id, label: r.label, color: r.color, icon: r.icon ?? "📍", ...auditDown(r) }),
  },
  flags: {
    up: (r) => ({ place_id: r.placeId, fav: r.fav ?? false, done: r.done ?? false, ...auditUp(r) }),
    down: (r) => ({ placeId: r.place_id, fav: r.fav ?? false, done: r.done ?? false, ...auditDown(r) }),
  },
  purchases: {
    up: (r) => ({
      id: r.id, item_id: r.itemId ?? null, label: r.label, qty: r.qty ?? 1,
      krw_paid: r.krwPaid, place_id: r.placeId ?? null,
      tax_refunded: r.taxRefunded ?? false, bought_at: iso(r.boughtAt as number), ...auditUp(r),
    }),
    down: (r) => ({
      id: r.id, itemId: r.item_id ?? null, label: r.label, qty: r.qty ?? 1,
      krwPaid: Number(r.krw_paid), placeId: r.place_id ?? null,
      taxRefunded: r.tax_refunded ?? false, boughtAt: ms(r.bought_at as string) ?? 0, ...auditDown(r),
    }),
  },
  sightings: {
    up: (r) => ({
      id: r.id, item_id: r.itemId, krw: r.krw, place_id: r.placeId ?? null,
      note: r.note ?? null, seen_at: iso(r.seenAt as number), ...auditUp(r),
    }),
    down: (r) => ({
      id: r.id, itemId: r.item_id, krw: Number(r.krw), placeId: r.place_id ?? null,
      note: r.note ?? undefined, seenAt: ms(r.seen_at as string) ?? 0, ...auditDown(r),
    }),
  },
  settings: {
    up: (r) => ({
      usd_krw: r.usdKrw, usd_bob_oficial: r.usdBobOficial, usd_bob_paralelo: r.usdBobParalelo,
      bob_rate: r.bobRate, travellers: r.travellers,
      updated_at: iso(r.updatedAt as number), device_id: (r.deviceId as string) ?? "",
    }),
    down: (r) => ({
      id: "settings", usdKrw: Number(r.usd_krw), usdBobOficial: Number(r.usd_bob_oficial),
      usdBobParalelo: Number(r.usd_bob_paralelo), bobRate: r.bob_rate, travellers: r.travellers,
      updatedAt: ms(r.updated_at as string) ?? 0, deviceId: (r.device_id as string) ?? "",
    }),
  },
};

export const toRemote = (table: SyncTable, row: Row): Row => MAPPERS[table].up(row);
export const toLocal = (table: SyncTable, row: Row): Row => MAPPERS[table].down(row);
