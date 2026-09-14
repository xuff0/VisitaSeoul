import Dexie, { type Table } from "dexie";
import type { PlaceInput } from "@/lib/types";

/**
 * Base local. IndexedDB es la fuente de verdad para leer: la pantalla nunca espera a la red,
 * que es la única forma de que la app sirva en el subte de Seúl.
 *
 * Todo lo que se escribe entra también en `outbox`, en la misma transacción, y de ahí lo levanta
 * el motor de sincronización cuando hay señal (lib/sync).
 */

/** Campos de auditoría que necesita la sincronización. Los borrados son lápidas, no ausencias. */
export type Synced = {
  updatedAt: number;
  deletedAt?: number | null;
  /** Desempata cuando dos dispositivos escriben en el mismo milisegundo. */
  deviceId: string;
};

export type PlaceRow = PlaceInput & Synced & { id: string };

/** Sólo los campos que cambiaste de un lugar precargado, no una copia entera. */
export type OverrideRow = Synced & {
  seedId: string;
  patch: Partial<PlaceInput>;
  hidden?: boolean;
};

export type CategoryRow = Synced & {
  id: string;
  label: string;
  color: string;
  icon: string;
};

/** Favorito y visitado de un lugar, sea precargado o tuyo. */
export type FlagRow = Synced & {
  placeId: string;
  fav?: boolean;
  done?: boolean;
};

/** Una compra real, con lo que efectivamente pagaste. Alimenta el contador de franquicia. */
export type PurchaseRow = Synced & {
  id: string;
  /** Producto del catálogo, o null si lo escribiste a mano. */
  itemId?: string | null;
  label: string;
  qty: number;
  krwPaid: number;
  placeId?: string | null;
  /** Si pediste el descuento de IVA en caja por esta compra. */
  taxRefunded?: boolean;
  boughtAt: number;
};

/** Precio visto en la góndola. El catálogo es el punto de partida; esto es el dato fresco. */
export type SightingRow = Synced & {
  id: string;
  itemId: string;
  krw: number;
  placeId?: string | null;
  note?: string;
  seenAt: number;
};

export type SettingsRow = Synced & {
  id: "settings";
  usdKrw: number;
  usdBobOficial: number;
  usdBobParalelo: number;
  bobRate: "oficial" | "paralelo";
  /** Modo "somos dos": duplica el tope de la franquicia a $2.000. */
  travellers: number;
};

/** Una escritura pendiente de subir. */
export type OutboxRow = {
  seq?: number;
  table: SyncTable;
  op: "put" | "delete";
  rowId: string;
  payload: unknown;
  queuedAt: number;
  tries: number;
  lastError?: string;
};

export type SyncTable = "places" | "overrides" | "categories" | "flags" | "purchases" | "sightings" | "settings";

export type MetaRow = { key: string; value: unknown };

export class SeoulDB extends Dexie {
  places!: Table<PlaceRow, string>;
  overrides!: Table<OverrideRow, string>;
  categories!: Table<CategoryRow, string>;
  flags!: Table<FlagRow, string>;
  purchases!: Table<PurchaseRow, string>;
  sightings!: Table<SightingRow, string>;
  settings!: Table<SettingsRow, string>;
  outbox!: Table<OutboxRow, number>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("visitaseoul");
    this.version(1).stores({
      places: "id, updatedAt, c",
      overrides: "seedId, updatedAt",
      categories: "id, updatedAt",
      flags: "placeId, updatedAt",
      purchases: "id, updatedAt, itemId, boughtAt",
      sightings: "id, updatedAt, itemId",
      settings: "id",
      outbox: "++seq, table, queuedAt",
      meta: "key",
    });
  }
}

let instance: SeoulDB | null = null;

/** Dexie sólo existe en el navegador: en el render del servidor no hay IndexedDB. */
export function db(): SeoulDB {
  if (!instance) instance = new SeoulDB();
  return instance;
}
