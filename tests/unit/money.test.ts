import { describe, expect, it } from "vitest";
import { DEFAULT_RATES, PRODUCT_BY_ID } from "@/lib/data/shopping";
import { arbitrage, bobToUsd, formatMultiple, krwToBob, krwToUsd, usdToBob } from "@/lib/money";

const R = DEFAULT_RATES;

describe("conversión", () => {
  it("aplica la regla mental de la guía: ₩1.000 ≈ $0,74 ≈ Bs 9,1", () => {
    expect(krwToUsd(1000, R)).toBeCloseTo(0.74, 2);
    expect(krwToBob(1000, R)).toBeCloseTo(9.08, 1);
  });

  it("convierte en los dos sentidos sin perder el valor", () => {
    const ida = usdToBob(100, R);
    expect(bobToUsd(ida, R)).toBeCloseTo(100, 6);
  });

  it("usa el paralelo cuando se lo pide", () => {
    expect(usdToBob(100, R, "paralelo")).toBeGreaterThan(usdToBob(100, R, "oficial"));
  });
});

describe("arbitraje contra la tabla de la guía", () => {
  it("reproduce el múltiplo del BOJ Glow Serum (~2,9x)", () => {
    // La guía lo mide en 2,9x: ₩10.000 ($7,4) contra Bs 251–278 ($20–23).
    const a = arbitrage(PRODUCT_BY_ID.get("boj-glow")!, R);
    expect(a.multiple).toBeGreaterThan(2.6);
    expect(a.multiple).toBeLessThan(3.2);
  });

  it("reproduce el arbitraje de las mascarillas en 10+10 (~6x)", () => {
    // Comprás a ~$0,37 la unidad y en Bolivia valen $2–3,7. La guía lo llama 6x.
    const a = arbitrage(PRODUCT_BY_ID.get("mediheal-mask")!, R);
    expect(a.promoMultiple).toBeGreaterThan(5);
    expect(a.promoMultiple).toBeLessThan(8);
    // Sin promo el múltiplo es bastante menor: la promo es la que hace el negocio.
    expect(a.promoMultiple!).toBeGreaterThan(a.multiple!);
  });

  it("reproduce el protector solar en 1+1 (~4x)", () => {
    // La guía: ~$5–6 la unidad en 1+1 contra $21 en Bolivia, o sea 4x.
    const a = arbitrage(PRODUCT_BY_ID.get("boj-sun")!, R);
    expect(a.promoMultiple).toBeGreaterThan(3.5);
    expect(a.promoMultiple).toBeLessThan(4.5);
  });

  it("no inventa un múltiplo cuando el producto no se consigue en Bolivia", () => {
    // La campera de Kolon no tiene precio boliviano: decir "no hay dato" es más honesto que un 0.
    const a = arbitrage(PRODUCT_BY_ID.get("kolon-jacket")!, R);
    expect(a.multiple).toBeNull();
    expect(a.bobUsd).toBeNull();
    expect(formatMultiple(a.multiple)).toBe("—");
  });

  it("no inventa un precio coreano cuando la guía dice sólo «variable»", () => {
    const a = arbitrage(PRODUCT_BY_ID.get("camara-usada")!, R);
    expect(a.krw).toBeNull();
    expect(a.usd).toBeNull();
  });

  it("calcula el ahorro por unidad", () => {
    const a = arbitrage(PRODUCT_BY_ID.get("cosrx-snail")!, R);
    expect(a.savingUsd).toBeGreaterThan(8);
  });

  it("formatea el múltiplo con coma decimal, como se escribe en Bolivia", () => {
    expect(formatMultiple(2.94)).toBe("2,9x");
  });
});
