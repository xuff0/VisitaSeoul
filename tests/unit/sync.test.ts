import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SeoulDB, type SyncTable } from "@/lib/db/schema";
import { coalesce, createEngine, incomingWins, type Remote } from "@/lib/sync/engine";
import { toLocal, toRemote } from "@/lib/sync/mapping";

/** Servidor de mentira: guarda en memoria y deja espiar y romper a voluntad. */
function fakeRemote() {
  const store = new Map<SyncTable, Map<string, Record<string, unknown>>>();
  const calls: { table: SyncTable; count: number }[] = [];
  let failNext: string | null = null;
  let clock = 0;

  const remote: Remote = {
    async upsert(table, rows) {
      if (failNext) {
        const msg = failNext;
        failNext = null;
        throw new Error(msg);
      }
      calls.push({ table, count: rows.length });
      if (!store.has(table)) store.set(table, new Map());
      for (const r of rows) {
        const key = String(r.id ?? r.seed_id ?? r.place_id ?? "settings");
        store.get(table)!.set(key, { ...r, synced_at: new Date(++clock * 1000).toISOString() });
      }
    },
    async fetchSince(table, cursor, limit) {
      const rows = [...(store.get(table)?.values() ?? [])]
        .filter((r) => !cursor || (r.synced_at as string) > cursor)
        .sort((a, b) => String(a.synced_at).localeCompare(String(b.synced_at)))
        .slice(0, limit);
      return { rows, cursor: (rows.at(-1)?.synced_at as string) ?? cursor };
    },
  };

  return {
    remote,
    calls,
    store,
    breakOnce: (msg: string) => { failNext = msg; },
    seed(table: SyncTable, row: Record<string, unknown>) {
      if (!store.has(table)) store.set(table, new Map());
      store.get(table)!.set(String(row.id ?? row.seed_id ?? row.place_id), {
        ...row,
        synced_at: new Date(++clock * 1000).toISOString(),
      });
    },
  };
}

const place = (over: Record<string, unknown> = {}) => ({
  id: "u-1", n: "Mi hotel", k: "", c: "otros", z: "seul", d: "Hongdae",
  lat: 37.55, lng: 126.92, updatedAt: 1000, deviceId: "dev-a", deletedAt: null, ...over,
});

let db: SeoulDB;
beforeEach(async () => {
  db = new SeoulDB();
  await db.delete();
  await db.open();
});

describe("resolución de conflictos", () => {
  it("gana la escritura más reciente", () => {
    expect(incomingWins({ updatedAt: 20 }, { updatedAt: 10 })).toBe(true);
    expect(incomingWins({ updatedAt: 10 }, { updatedAt: 20 })).toBe(false);
  });

  it("si no hay nada local, lo que baja entra", () => {
    expect(incomingWins({ updatedAt: 1 }, undefined)).toBe(true);
  });

  it("al empatar desempata el id de dispositivo, para que todos converjan igual", () => {
    // Es arbitrario, pero es el mismo criterio en todos los aparatos: no quedan divergiendo.
    expect(incomingWins({ updatedAt: 5, deviceId: "b" }, { updatedAt: 5, deviceId: "a" })).toBe(true);
    expect(incomingWins({ updatedAt: 5, deviceId: "a" }, { updatedAt: 5, deviceId: "b" })).toBe(false);
  });
});

describe("agrupación de la cola", () => {
  it("cuatro ediciones de la misma fila viajan como una sola", () => {
    const grouped = coalesce([
      { table: "places", op: "put", rowId: "a", payload: { v: 1 }, queuedAt: 1, tries: 0, seq: 1 },
      { table: "places", op: "put", rowId: "a", payload: { v: 2 }, queuedAt: 2, tries: 0, seq: 2 },
      { table: "places", op: "put", rowId: "b", payload: { v: 9 }, queuedAt: 3, tries: 0, seq: 3 },
      { table: "flags", op: "put", rowId: "a", payload: { v: 1 }, queuedAt: 4, tries: 0, seq: 4 },
    ]);
    expect(grouped.get("places")!.size).toBe(2);
    // Y viaja la última versión, no la primera.
    expect(grouped.get("places")!.get("a")!.payload).toEqual({ v: 2 });
    expect(grouped.get("flags")!.size).toBe(1);
  });
});

describe("subida", () => {
  it("vacía la cola y sube las filas", async () => {
    const f = fakeRemote();
    const engine = createEngine(db, f.remote);
    await db.places.put(place() as never);
    await db.outbox.add({ table: "places", op: "put", rowId: "u-1", payload: place(), queuedAt: 1, tries: 0 });

    const r = await engine.push();
    expect(r.pushed).toBe(1);
    expect(r.errors).toEqual([]);
    expect(await db.outbox.count()).toBe(0);
    expect(f.store.get("places")!.get("u-1")!.n).toBe("Mi hotel");
  });

  it("si el servidor falla, la cola no se pierde y queda el motivo anotado", async () => {
    const f = fakeRemote();
    const engine = createEngine(db, f.remote);
    await db.outbox.add({ table: "places", op: "put", rowId: "u-1", payload: place(), queuedAt: 1, tries: 0 });
    f.breakOnce("sin conexión");

    const r = await engine.push();
    expect(r.pushed).toBe(0);
    expect(r.errors[0]).toContain("sin conexión");

    // Lo importante: el cambio sigue en la cola para el próximo intento.
    const pending = await db.outbox.toArray();
    expect(pending).toHaveLength(1);
    expect(pending[0].tries).toBe(1);
    expect(pending[0].lastError).toContain("sin conexión");

    // Y al siguiente intento sube.
    expect((await engine.push()).pushed).toBe(1);
    expect(await db.outbox.count()).toBe(0);
  });

  it("un borrado hecho sin señal sube como lápida, no desaparece", async () => {
    const f = fakeRemote();
    const engine = createEngine(db, f.remote);
    const dead = place({ deletedAt: 5000 });
    await db.outbox.add({ table: "places", op: "put", rowId: "u-1", payload: dead, queuedAt: 1, tries: 0 });
    await engine.push();
    expect(f.store.get("places")!.get("u-1")!.deleted_at).toBe(new Date(5000).toISOString());
  });
});

describe("bajada", () => {
  it("trae lo que otro dispositivo escribió", async () => {
    const f = fakeRemote();
    const engine = createEngine(db, f.remote);
    f.seed("places", toRemote("places", place({ id: "u-9", n: "Desde el otro teléfono" })));

    const r = await engine.pull();
    expect(r.pulled).toBe(1);
    expect((await db.places.get("u-9"))!.n).toBe("Desde el otro teléfono");
  });

  it("no pisa un cambio local más nuevo", async () => {
    const f = fakeRemote();
    const engine = createEngine(db, f.remote);
    await db.places.put(place({ n: "Lo edité recién", updatedAt: 9000 }) as never);
    f.seed("places", toRemote("places", place({ n: "Versión vieja del servidor", updatedAt: 1000 })));

    await engine.pull();
    expect((await db.places.get("u-1"))!.n).toBe("Lo edité recién");
  });

  it("sí pisa cuando lo del servidor es más nuevo", async () => {
    const f = fakeRemote();
    const engine = createEngine(db, f.remote);
    await db.places.put(place({ n: "Viejo local", updatedAt: 1000 }) as never);
    f.seed("places", toRemote("places", place({ n: "Nuevo del servidor", updatedAt: 9000 })));

    await engine.pull();
    expect((await db.places.get("u-1"))!.n).toBe("Nuevo del servidor");
  });

  it("avanza el cursor y no vuelve a traer lo mismo", async () => {
    const f = fakeRemote();
    const engine = createEngine(db, f.remote);
    f.seed("places", toRemote("places", place({ id: "u-9" })));

    expect((await engine.pull()).pulled).toBe(1);
    expect((await db.meta.get("cursor:places"))?.value).toBeTruthy();
    // Segunda vuelta sin cambios nuevos: no baja nada.
    expect((await engine.pull()).pulled).toBe(0);
  });

  it("un error en una tabla no frena a las demás", async () => {
    const f = fakeRemote();
    const rota: Remote = {
      ...f.remote,
      fetchSince: vi.fn(async (table, cursor, limit) => {
        if (table === "places") throw new Error("tabla caída");
        return f.remote.fetchSince(table, cursor, limit);
      }),
    };
    const engine = createEngine(db, rota);
    f.seed("flags", { place_id: "s-a", fav: true, done: false, updated_at: new Date(1000).toISOString(), deleted_at: null, device_id: "x" });

    const r = await engine.pull();
    expect(r.errors[0]).toContain("tabla caída");
    expect(r.pulled).toBe(1);
    expect((await db.flags.get("s-a"))!.fav).toBe(true);
  });
});

describe("ida y vuelta del mapeo", () => {
  it("un lugar sobrevive al viaje al servidor y de regreso", async () => {
    const original = place({ t: "Una nota", hours: "10:00–22:00", tags: ["taxfree"], buy: ["boj-sun"] });
    const round = toLocal("places", toRemote("places", original));
    expect(round).toMatchObject({
      id: "u-1", n: "Mi hotel", lat: 37.55, lng: 126.92,
      t: "Una nota", hours: "10:00–22:00", tags: ["taxfree"], buy: ["boj-sun"],
      updatedAt: 1000, deviceId: "dev-a",
    });
  });

  it("una compra conserva los montos y las fechas", () => {
    const p = { id: "c1", itemId: "boj-sun", label: "Protector", qty: 2, krwPaid: 15000,
                placeId: "s-x", taxRefunded: true, boughtAt: 1700000000000,
                updatedAt: 1700000000001, deviceId: "d", deletedAt: null };
    expect(toLocal("purchases", toRemote("purchases", p))).toMatchObject(p);
  });

  it("las lápidas viajan como fecha, no se pierden en la traducción", () => {
    const round = toLocal("places", toRemote("places", place({ deletedAt: 4242 })));
    expect(round.deletedAt).toBe(4242);
  });
});
