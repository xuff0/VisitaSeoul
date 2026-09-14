import { db } from "@/lib/db/schema";
import { deviceId } from "@/lib/db/repo";

/**
 * Respaldo completo de lo tuyo.
 *
 * Mientras no haya cuenta con correo, tus datos viven en este navegador y nada más. Si limpiás
 * los datos del sitio o cambiás de teléfono, se van. Por eso el respaldo no es una función
 * escondida en un menú: es la red de seguridad, y está a la vista.
 */
export type Backup = {
  app: "visitaseoul";
  version: 2;
  exportedAt: string;
  places: unknown[];
  overrides: unknown[];
  categories: unknown[];
  flags: unknown[];
  purchases: unknown[];
  sightings: unknown[];
  settings: unknown[];
};

export async function exportBackup(): Promise<Backup> {
  const d = db();
  const [places, overrides, categories, flags, purchases, sightings, settings] = await Promise.all([
    d.places.toArray(),
    d.overrides.toArray(),
    d.categories.toArray(),
    d.flags.toArray(),
    d.purchases.toArray(),
    d.sightings.toArray(),
    d.settings.toArray(),
  ]);
  return {
    app: "visitaseoul",
    version: 2,
    exportedAt: new Date().toISOString(),
    places,
    overrides,
    categories,
    flags,
    purchases,
    sightings,
    settings,
  };
}

export type ImportResult = { added: number; kept: number };

/**
 * Restaura un respaldo sumando, sin pisar lo que ya tenés.
 *
 * Ante dos versiones de la misma fila gana la más reciente por `updatedAt`. Restaurar en el
 * teléfono equivocado no debería borrarte el trabajo de la mañana.
 */
export async function importBackup(raw: unknown): Promise<ImportResult> {
  const data = raw as Partial<Backup> | null;
  if (!data || data.app !== "visitaseoul") {
    throw new Error("Ese archivo no es un respaldo de esta app.");
  }

  const d = db();
  const dev = await deviceId();
  let added = 0;
  let kept = 0;

  const tables = [
    ["places", d.places, "id"],
    ["overrides", d.overrides, "seedId"],
    ["categories", d.categories, "id"],
    ["flags", d.flags, "placeId"],
    ["purchases", d.purchases, "id"],
    ["sightings", d.sightings, "id"],
    ["settings", d.settings, "id"],
  ] as const;

  for (const [key, table, pk] of tables) {
    const rows = (data[key] as Record<string, unknown>[] | undefined) ?? [];
    for (const row of rows) {
      const id = row[pk] as string;
      if (!id) continue;
      const existing = (await (table as { get: (k: string) => Promise<{ updatedAt?: number } | undefined> }).get(
        id,
      )) as { updatedAt?: number } | undefined;
      const incomingAt = Number(row.updatedAt ?? 0);
      if (existing && Number(existing.updatedAt ?? 0) >= incomingAt) {
        kept++;
        continue;
      }
      await (table as { put: (r: unknown) => Promise<unknown> }).put({
        ...row,
        deviceId: row.deviceId ?? dev,
      });
      added++;
    }
  }
  return { added, kept };
}
