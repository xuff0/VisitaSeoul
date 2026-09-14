import type { Product, Rates } from "@/lib/data/shopping";

/** Cuál de los dos tipos de cambio bolivianos usar. La brecha hoy es de ~1%. */
export type BobRate = "oficial" | "paralelo";

export function krwToUsd(krw: number, rates: Rates): number {
  return krw / rates.usdKrw;
}

export function usdToBob(usd: number, rates: Rates, which: BobRate = "oficial"): number {
  return usd * (which === "oficial" ? rates.usdBobOficial : rates.usdBobParalelo);
}

export function bobToUsd(bob: number, rates: Rates, which: BobRate = "oficial"): number {
  return bob / (which === "oficial" ? rates.usdBobOficial : rates.usdBobParalelo);
}

export function krwToBob(krw: number, rates: Rates, which: BobRate = "oficial"): number {
  return usdToBob(krwToUsd(krw, rates), rates, which);
}

const nf = (max: number, min = 0) =>
  new Intl.NumberFormat("es-BO", { minimumFractionDigits: min, maximumFractionDigits: max });

export const formatKrw = (n: number) => `₩${nf(0).format(Math.round(n))}`;
export const formatUsd = (n: number) => `$${nf(n < 10 ? 2 : 0).format(n)}`;
export const formatBob = (n: number) => `Bs ${nf(n < 10 ? 2 : 0).format(n)}`;

/** Punto medio de un rango, o el único extremo que exista. */
function mid(a?: number, b?: number): number | null {
  if (a == null && b == null) return null;
  if (a == null) return b!;
  if (b == null) return a;
  return (a + b) / 2;
}

export type Arbitrage = {
  /** Precio típico en Corea, en won. */
  krw: number | null;
  /** Precio típico en Corea, en dólares. */
  usd: number | null;
  /** Precio típico en Bolivia, en bolivianos. */
  bob: number | null;
  /** El mismo precio boliviano, en dólares, para poder compararlo. */
  bobUsd: number | null;
  /** Cuántas veces más caro está en Bolivia. Es la cifra que ordena el catálogo. */
  multiple: number | null;
  /** Lo mismo, pero aprovechando la promoción (1+1, 10+10). Es donde el arbitraje se dispara. */
  promoMultiple: number | null;
  /** Cuánto te ahorrás por unidad, en dólares. */
  savingUsd: number | null;
};

/**
 * Compara el precio coreano contra el boliviano.
 *
 * Devuelve null en vez de cero cuando falta un dato: un producto que en Bolivia no se consigue no
 * tiene multiplicador "infinito" ni "cero", simplemente no tiene, y la interfaz lo dice con
 * palabras en lugar de inventar un número.
 */
export function arbitrage(p: Product, rates: Rates, which: BobRate = "oficial"): Arbitrage {
  const krw = mid(p.krwMin, p.krwMax);
  const bob = mid(p.bobMin, p.bobMax);
  const usd = krw == null ? null : krwToUsd(krw, rates);
  const bobUsd = bob == null ? null : bobToUsd(bob, rates, which);
  const multiple = usd && bobUsd ? bobUsd / usd : null;
  const promoUsd = p.promoUnitKrw ? krwToUsd(p.promoUnitKrw, rates) : null;
  return {
    krw,
    usd,
    bob,
    bobUsd,
    multiple,
    promoMultiple: promoUsd && bobUsd ? bobUsd / promoUsd : null,
    savingUsd: usd != null && bobUsd != null ? bobUsd - usd : null,
  };
}

/** "2,9x" — con coma decimal, que es como se escribe en Bolivia. */
export function formatMultiple(m: number | null): string {
  return m == null ? "—" : `${nf(1, 1).format(m)}x`;
}
