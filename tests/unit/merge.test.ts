import { describe, expect, it } from "vitest";
import { mergePlaces } from "@/lib/db/repo";
import { SEED_PLACES } from "@/lib/data/places";
import type { OverrideRow, PlaceRow } from "@/lib/db/schema";

const seeds = [
  { id: "s-a", n: "Palacio", k: "경복궁", c: "turismo", z: "seul", d: "Jongno", lat: 37.5, lng: 127, t: "Cerrado los martes" },
  { id: "s-b", n: "Mercado", k: "시장", c: "ofertas", z: "seul", d: "Jung-gu", lat: 37.6, lng: 127.1 },
] as const;

const meta = { updatedAt: 1, deviceId: "dev" };

describe("mezcla de semilla, ediciones y lugares propios", () => {
  it("sin nada guardado devuelve la semilla tal cual", () => {
    const out = mergePlaces([], [], seeds as never);
    expect(out).toHaveLength(2);
    expect(out[0].origin).toBe("seed");
  });

  it("aplica sólo los campos editados y deja intacto el resto", () => {
    // Es el punto de guardar el diff: si mañana corregimos la nota de ese lugar, te llega igual,
    // aunque le hayas cambiado el nombre.
    const ov: OverrideRow[] = [{ seedId: "s-a", patch: { n: "Mi palacio" }, ...meta }];
    const out = mergePlaces(ov, [], seeds as never);
    expect(out[0].n).toBe("Mi palacio");
    expect(out[0].t).toBe("Cerrado los martes");
    expect(out[0].k).toBe("경복궁");
    expect(out[0].origin).toBe("edited");
  });

  it("oculta los precargados marcados, sin borrarlos", () => {
    const ov: OverrideRow[] = [{ seedId: "s-a", patch: {}, hidden: true, ...meta }];
    const out = mergePlaces(ov, [], seeds as never);
    expect(out.map((p) => p.id)).toEqual(["s-b"]);
  });

  it("una edición dada de baja deja de aplicarse, y el lugar vuelve al original", () => {
    const ov: OverrideRow[] = [
      { seedId: "s-a", patch: { n: "Mi palacio" }, hidden: true, deletedAt: 2, ...meta },
    ];
    const out = mergePlaces(ov, [], seeds as never);
    expect(out[0].n).toBe("Palacio");
    expect(out[0].origin).toBe("seed");
  });

  it("suma los lugares propios y los marca como tuyos", () => {
    const mine: PlaceRow[] = [
      { id: "u-1", n: "Mi hotel", k: "", c: "otros", z: "seul", d: "Hongdae", lat: 37.55, lng: 126.92, ...meta },
    ];
    const out = mergePlaces([], mine, seeds as never);
    expect(out).toHaveLength(3);
    expect(out[2].origin).toBe("mine");
  });

  it("respeta la lápida de un lugar propio borrado sin señal", () => {
    const mine: PlaceRow[] = [
      { id: "u-1", n: "Mi hotel", k: "", c: "otros", z: "seul", d: "Hongdae", lat: 37.55, lng: 126.92, deletedAt: 5, ...meta },
    ];
    expect(mergePlaces([], mine, seeds as never)).toHaveLength(2);
  });

  it("no filtra los metadatos de sincronización a la interfaz", () => {
    const mine: PlaceRow[] = [
      { id: "u-1", n: "Mi hotel", k: "", c: "otros", z: "seul", d: "Hongdae", lat: 37.55, lng: 126.92, ...meta },
    ];
    const out = mergePlaces([], mine, seeds as never);
    expect(out[2]).not.toHaveProperty("updatedAt");
    expect(out[2]).not.toHaveProperty("deviceId");
  });
});

describe("integridad de la semilla real", () => {
  it("no hay ids repetidos", () => {
    const ids = SEED_PLACES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("todas las coordenadas caen en la región de Seúl", () => {
    for (const p of SEED_PLACES) {
      expect(p.lat, p.n).toBeGreaterThan(36.9);
      expect(p.lat, p.n).toBeLessThan(38.2);
      expect(p.lng, p.n).toBeGreaterThan(126.2);
      expect(p.lng, p.n).toBeLessThan(127.7);
    }
  });

  it("todos tienen nombre coreano, que es lo que encuentra Naver", () => {
    for (const p of SEED_PLACES) expect(p.k, p.n).toBeTruthy();
  });
});
