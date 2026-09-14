import { SEED_PLACES, CATEGORIES, type PlaceSeed } from "@/lib/data/places";
import { DEFAULT_RATES } from "@/lib/data/shopping";
import type { Place, PlaceInput } from "@/lib/types";
import {
  db,
  type CategoryRow,
  type FlagRow,
  type OverrideRow,
  type PlaceRow,
  type PurchaseRow,
  type SettingsRow,
  type SightingRow,
  type SyncTable,
} from "./schema";

const SEED_BY_ID = new Map(SEED_PLACES.map((p) => [p.id, p]));

/** Campos de un lugar que se pueden editar; el resto son metadatos. */
const EDITABLE = ["n", "k", "c", "z", "d", "lat", "lng", "t", "hours", "tags", "buy"] as const;

export const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let cachedDeviceId: string | null = null;

/**
 * Id del dispositivo: desempata conflictos cuando dos aparatos escriben la misma fila en el
 * mismo milisegundo. Se genera una vez y vive en la base local.
 */
export async function deviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  const row = await db().meta.get("deviceId");
  if (row) {
    cachedDeviceId = row.value as string;
    return cachedDeviceId;
  }
  const id = newId();
  await db().meta.put({ key: "deviceId", value: id });
  cachedDeviceId = id;
  return id;
}

/**
 * Escribe una fila y encola la misma escritura para subirla, en una sola transacción.
 *
 * Que las dos cosas entren juntas o no entre ninguna es lo que evita el peor caso: un cambio que
 * ves en pantalla, que sobrevive al cierre de la app, y que nunca llega al servidor.
 */
async function write<T>(table: SyncTable, rowId: string, row: T, op: "put" | "delete" = "put") {
  const d = db();
  await d.transaction("rw", d[table], d.outbox, async () => {
    // @ts-expect-error las tablas comparten forma pero no tipo; el id ya viene resuelto arriba
    await d[table].put(row);
    await d.outbox.add({ table, op, rowId, payload: row, queuedAt: Date.now(), tries: 0 });
  });
}

async function stamp() {
  return { updatedAt: Date.now(), deviceId: await deviceId() };
}

// ---------------------------------------------------------------- lugares

/**
 * Arma la lista final de lugares: semillas, menos las que ocultaste, con tus ediciones aplicadas
 * encima, más las que agregaste vos.
 *
 * Guardar sólo el diff y no una copia entera tiene una consecuencia concreta: si corregimos la
 * dirección de una tienda en una versión nueva de la app, esa corrección te llega igual aunque
 * hayas editado el nombre de ese mismo lugar.
 */
export function mergePlaces(
  overrides: OverrideRow[] = [],
  mine: PlaceRow[] = [],
  seeds: PlaceSeed[] = SEED_PLACES,
): Place[] {
  const byId = new Map(overrides.filter((o) => !o.deletedAt).map((o) => [o.seedId, o]));
  const out: Place[] = [];

  for (const s of seeds) {
    const o = byId.get(s.id);
    if (o?.hidden) continue;
    out.push(
      o ? { ...s, ...o.patch, origin: "edited" as const } : { ...s, origin: "seed" as const },
    );
  }
  for (const p of mine) {
    if (p.deletedAt) continue;
    const { updatedAt: _u, deletedAt: _d, deviceId: _dev, ...rest } = p;
    out.push({ ...rest, origin: "mine" as const } as Place);
  }
  return out;
}

/** Sólo los campos que difieren de la semilla: el resto sigue viniendo del repo. */
function diffFromSeed(seed: PlaceSeed, input: PlaceInput): Partial<PlaceInput> {
  const patch: Record<string, unknown> = {};
  for (const k of EDITABLE) {
    const next = (input as Record<string, unknown>)[k];
    const base = (seed as Record<string, unknown>)[k];
    if (JSON.stringify(next ?? null) !== JSON.stringify(base ?? null)) patch[k] = next;
  }
  return patch as Partial<PlaceInput>;
}

/** Crea un lugar nuevo, o guarda los cambios de uno existente, sea precargado o tuyo. */
export async function savePlace(input: PlaceInput, id?: string): Promise<string> {
  const s = await stamp();

  if (id && SEED_BY_ID.has(id)) {
    const patch = diffFromSeed(SEED_BY_ID.get(id)!, input);
    const row: OverrideRow = { seedId: id, patch, hidden: false, deletedAt: null, ...s };
    await write("overrides", id, row);
    return id;
  }

  const rowId = id ?? newId();
  const row: PlaceRow = { ...input, id: rowId, deletedAt: null, ...s };
  await write("places", rowId, row);
  return rowId;
}

/**
 * Elimina un lugar. Los precargados se ocultan (son datos del repo, no se pueden borrar de
 * verdad) y los tuyos quedan como lápida, porque un borrado hecho sin señal también tiene que
 * poder sincronizar.
 */
export async function deletePlace(id: string): Promise<void> {
  const s = await stamp();
  if (SEED_BY_ID.has(id)) {
    await write("overrides", id, { seedId: id, patch: {}, hidden: true, deletedAt: null, ...s });
    return;
  }
  const existing = await db().places.get(id);
  if (!existing) return;
  await write("places", id, { ...existing, deletedAt: Date.now(), ...s });
}

/** Devuelve un lugar precargado a como vino: descarta tus ediciones y lo vuelve a mostrar. */
export async function restoreSeedPlace(seedId: string): Promise<void> {
  const s = await stamp();
  await write("overrides", seedId, { seedId, patch: {}, hidden: false, deletedAt: Date.now(), ...s });
}

// ---------------------------------------------------------------- marcas

export async function toggleFlag(placeId: string, key: "fav" | "done"): Promise<void> {
  const current = await db().flags.get(placeId);
  const next: FlagRow = { ...current, placeId, [key]: !current?.[key], ...(await stamp()) };
  await write("flags", placeId, next);
}

// ---------------------------------------------------------------- categorías

export async function saveCategory(c: Omit<CategoryRow, keyof Awaited<ReturnType<typeof stamp>> | "deletedAt">) {
  const row: CategoryRow = { ...c, deletedAt: null, ...(await stamp()) };
  await write("categories", c.id, row);
  return c.id;
}

/** Borra una categoría tuya y manda sus lugares a "Otros", para que no desaparezcan del mapa. */
export async function deleteCategory(id: string): Promise<void> {
  const d = db();
  const affected = await d.places.filter((p) => p.c === id).toArray();
  for (const p of affected) await savePlace({ ...p, c: "otros" }, p.id);

  const overrides = await d.overrides.toArray();
  for (const o of overrides) {
    if (o.patch?.c === id && !o.deletedAt) {
      const seed = SEED_BY_ID.get(o.seedId);
      if (seed) await savePlace({ ...seed, ...o.patch, c: "otros" } as PlaceInput, o.seedId);
    }
  }

  const existing = await d.categories.get(id);
  if (existing) await write("categories", id, { ...existing, deletedAt: Date.now(), ...(await stamp()) });
}

export function allCategories(custom: CategoryRow[] = []) {
  const live = custom.filter((c) => !c.deletedAt);
  const overridden = new Set(live.map((c) => c.id));
  return [...CATEGORIES.filter((c) => !overridden.has(c.id)), ...live];
}

// ---------------------------------------------------------------- compras

export async function addPurchase(p: Omit<PurchaseRow, "id" | "updatedAt" | "deviceId" | "deletedAt">) {
  const row: PurchaseRow = { ...p, id: newId(), deletedAt: null, ...(await stamp()) };
  await write("purchases", row.id, row);
  return row.id;
}

export async function deletePurchase(id: string) {
  const existing = await db().purchases.get(id);
  if (existing) await write("purchases", id, { ...existing, deletedAt: Date.now(), ...(await stamp()) });
}

export async function addSighting(s: Omit<SightingRow, "id" | "updatedAt" | "deviceId" | "deletedAt">) {
  const row: SightingRow = { ...s, id: newId(), deletedAt: null, ...(await stamp()) };
  await write("sightings", row.id, row);
  return row.id;
}

// ---------------------------------------------------------------- ajustes

export const DEFAULT_SETTINGS: Omit<SettingsRow, "updatedAt" | "deviceId"> = {
  id: "settings",
  usdKrw: DEFAULT_RATES.usdKrw,
  usdBobOficial: DEFAULT_RATES.usdBobOficial,
  usdBobParalelo: DEFAULT_RATES.usdBobParalelo,
  bobRate: "oficial",
  travellers: 1,
};

export async function saveSettings(patch: Partial<SettingsRow>): Promise<void> {
  const current = (await db().settings.get("settings")) ?? DEFAULT_SETTINGS;
  const row: SettingsRow = { ...current, ...patch, id: "settings", ...(await stamp()) };
  await write("settings", "settings", row);
}
