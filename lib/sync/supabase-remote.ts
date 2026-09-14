import type { SupabaseClient } from "@supabase/supabase-js";
import type { SyncTable } from "@/lib/db/schema";
import { CONFLICT_KEYS, REMOTE_TABLE } from "./mapping";
import type { Remote } from "./engine";

/**
 * Implementación de `Remote` contra Supabase.
 *
 * El `owner` se agrega acá y no en el mapeo porque es una cuestión de transporte: en la base lo
 * pone por defecto `auth.uid()`, y el RLS lo verifica igual con `with check`. Mandarlo explícito
 * hace que el upsert funcione también al actualizar una fila existente.
 */
export function supabaseRemote(sb: SupabaseClient, owner: string): Remote {
  return {
    async upsert(table: SyncTable, rows) {
      if (!rows.length) return;
      const { error } = await sb
        .from(REMOTE_TABLE[table])
        .upsert(
          rows.map((r) => ({ ...r, owner })),
          { onConflict: CONFLICT_KEYS[table] },
        );
      if (error) throw new Error(error.message);
    },

    async fetchSince(table: SyncTable, cursor, limit) {
      // Se pagina por synced_at, que lo pone el servidor: el updated_at del cliente puede venir
      // de un teléfono con la hora mal y dejaría filas invisibles para siempre.
      let q = sb
        .from(REMOTE_TABLE[table])
        .select("*")
        .order("synced_at", { ascending: true })
        .limit(limit);
      if (cursor) q = q.gt("synced_at", cursor);

      const { data, error } = await q;
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as Record<string, unknown>[];
      const last = rows.at(-1)?.synced_at as string | undefined;
      return { rows, cursor: last ?? cursor };
    },
  };
}
