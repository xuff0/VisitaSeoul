import type { SeoulDB, OutboxRow, SyncTable } from "@/lib/db/schema";
import { LOCAL_KEY, toLocal, toRemote } from "./mapping";

/**
 * Motor de sincronización.
 *
 * La app es local-first: IndexedDB es la fuente de lectura y la pantalla nunca espera a la red.
 * Este motor se ocupa de lo otro: vaciar la cola de escrituras cuando hay señal y bajar lo que
 * cambió en otro dispositivo.
 *
 * Depende de una interfaz `Remote` y no de Supabase directamente, para poder probar la lógica
 * —reintentos, resolución de conflictos, lápidas— sin levantar un servidor.
 */
export type Remote = {
  /** Sube filas ya traducidas al esquema remoto. Debe ser idempotente (upsert). */
  upsert(table: SyncTable, rows: Record<string, unknown>[]): Promise<void>;
  /** Baja lo que cambió después del cursor. El cursor lo genera el servidor, no el cliente. */
  fetchSince(
    table: SyncTable,
    cursor: string | null,
    limit: number,
  ): Promise<{ rows: Record<string, unknown>[]; cursor: string | null }>;
};

export const SYNC_TABLES: SyncTable[] = [
  "places", "overrides", "categories", "flags", "purchases", "sightings", "settings",
];

const PAGE = 500;

export type SyncResult = { pushed: number; pulled: number; errors: string[] };

/**
 * Ante dos versiones de la misma fila gana la más reciente. Si empatan al milisegundo —cosa que
 * pasa más de lo que parece cuando dos aparatos sincronizan a la vez— desempata el id del
 * dispositivo, que es arbitrario pero igual en todas partes, y por lo tanto converge.
 */
export function incomingWins(
  incoming: { updatedAt: number; deviceId?: string },
  local: { updatedAt: number; deviceId?: string } | undefined,
): boolean {
  if (!local) return true;
  if (incoming.updatedAt !== local.updatedAt) return incoming.updatedAt > local.updatedAt;
  return (incoming.deviceId ?? "") > (local.deviceId ?? "");
}

/**
 * Junta la cola en una escritura por fila, quedándose con la última.
 *
 * Editar el nombre de un lugar cuatro veces sin señal no tiene por qué costar cuatro viajes al
 * servidor: sólo importa cómo quedó.
 */
export function coalesce(entries: OutboxRow[]): Map<SyncTable, Map<string, OutboxRow>> {
  const byTable = new Map<SyncTable, Map<string, OutboxRow>>();
  for (const e of entries) {
    if (!byTable.has(e.table)) byTable.set(e.table, new Map());
    byTable.get(e.table)!.set(e.rowId, e);
  }
  return byTable;
}

export function createEngine(db: SeoulDB, remote: Remote) {
  let running = false;

  async function cursorFor(table: SyncTable): Promise<string | null> {
    return ((await db.meta.get(`cursor:${table}`))?.value as string) ?? null;
  }

  /** Vacía la cola. Si algo falla, la entrada queda para el próximo intento. */
  async function push(): Promise<{ pushed: number; errors: string[] }> {
    const entries = await db.outbox.orderBy("seq").toArray();
    if (!entries.length) return { pushed: 0, errors: [] };

    const errors: string[] = [];
    let pushed = 0;

    for (const [table, rows] of coalesce(entries)) {
      const payloads = [...rows.values()].map((e) => toRemote(table, e.payload as Record<string, unknown>));
      try {
        await remote.upsert(table, payloads);
        // Sólo se borran las entradas efectivamente subidas: las que llegaron mientras tanto
        // quedan en la cola para la próxima vuelta.
        const seqs = entries.filter((e) => e.table === table && rows.has(e.rowId)).map((e) => e.seq!);
        await db.outbox.bulkDelete(seqs);
        pushed += payloads.length;
      } catch (err) {
        const message = (err as Error)?.message ?? String(err);
        errors.push(`${table}: ${message}`);
        const seqs = entries.filter((e) => e.table === table).map((e) => e.seq!);
        await db.outbox
          .where("seq")
          .anyOf(seqs)
          .modify((e) => {
            e.tries = (e.tries ?? 0) + 1;
            e.lastError = message;
          });
      }
    }
    return { pushed, errors };
  }

  /** Baja lo que cambió desde el último cursor y lo aplica con la regla de más reciente gana. */
  async function pull(): Promise<{ pulled: number; errors: string[] }> {
    const errors: string[] = [];
    let pulled = 0;

    for (const table of SYNC_TABLES) {
      try {
        let cursor = await cursorFor(table);
        for (;;) {
          const { rows, cursor: next } = await remote.fetchSince(table, cursor, PAGE);
          if (!rows.length) break;

          const key = LOCAL_KEY[table];
          const store = db[table];
          for (const raw of rows) {
            const row = toLocal(table, raw) as Record<string, unknown> & {
              updatedAt: number;
              deviceId?: string;
            };
            const id = row[key] as string;
            const local = (await (store as unknown as { get(k: string): Promise<unknown> }).get(id)) as
              | { updatedAt: number; deviceId?: string }
              | undefined;
            if (incomingWins(row, local)) {
              await (store as unknown as { put(r: unknown): Promise<unknown> }).put(row);
              pulled++;
            }
          }

          cursor = next;
          await db.meta.put({ key: `cursor:${table}`, value: cursor });
          if (rows.length < PAGE) break;
        }
      } catch (err) {
        errors.push(`${table}: ${(err as Error)?.message ?? String(err)}`);
      }
    }
    return { pulled, errors };
  }

  /** Una vuelta completa: primero sube lo tuyo, después baja lo demás. */
  async function syncOnce(): Promise<SyncResult> {
    if (running) return { pushed: 0, pulled: 0, errors: [] };
    running = true;
    try {
      const up = await push();
      const down = await pull();
      return { pushed: up.pushed, pulled: down.pulled, errors: [...up.errors, ...down.errors] };
    } finally {
      running = false;
    }
  }

  return { push, pull, syncOnce };
}
