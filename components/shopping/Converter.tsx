"use client";

import { useState } from "react";
import { SOURCE_DATE, type Rates } from "@/lib/data/shopping";
import { saveSettings } from "@/lib/db/repo";
import { bobToUsd, formatBob, formatKrw, formatUsd, krwToUsd, usdToBob, type BobRate } from "@/lib/money";
import { Card, inputClass } from "@/components/ui/primitives";

/**
 * Conversor de las tres monedas del viaje.
 *
 * Funciona en los dos sentidos porque las dos preguntas aparecen: parado en la góndola mirás un
 * precio en won y querés bolivianos; comparando contra lo que cuesta en Santa Cruz tenés
 * bolivianos y querés saber cuántos won podés pagar sin perder el negocio.
 */
export default function Converter({ rates, bobRate }: { rates: Rates; bobRate: BobRate }) {
  const [krw, setKrw] = useState("15000");
  const [bob, setBob] = useState("");
  const [editing, setEditing] = useState(false);

  const krwNum = Number(krw.replace(/[^\d.]/g, "")) || 0;
  const bobNum = Number(bob.replace(/[^\d.]/g, "")) || 0;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 text-base font-semibold">Conversor</h2>
        <button className="cursor-pointer text-[13px] text-ink-2 underline" onClick={() => setEditing((v) => !v)}>
          {editing ? "Listo" : "Ajustar tipos de cambio"}
        </button>
      </div>
      <p className="mt-1 mb-3 text-[13px] text-ink-2">
        Regla mental rápida: ₩1.000 ≈ {formatUsd(krwToUsd(1000, rates))} ≈{" "}
        {formatBob(usdToBob(krwToUsd(1000, rates), rates, bobRate))}.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[13px] text-ink-2">Precio en Corea (₩)</span>
          <input
            className={inputClass}
            inputMode="numeric"
            value={krw}
            onChange={(e) => {
              setKrw(e.target.value);
              setBob("");
            }}
          />
          {krwNum > 0 && (
            <span className="mt-1.5 block text-sm">
              = {formatUsd(krwToUsd(krwNum, rates))} ·{" "}
              <b>{formatBob(usdToBob(krwToUsd(krwNum, rates), rates, bobRate))}</b>
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-[13px] text-ink-2">Precio en Bolivia (Bs)</span>
          <input
            className={inputClass}
            inputMode="numeric"
            value={bob}
            placeholder="259"
            onChange={(e) => setBob(e.target.value)}
          />
          {bobNum > 0 && (
            <span className="mt-1.5 block text-sm">
              = {formatUsd(bobToUsd(bobNum, rates, bobRate))} ·{" "}
              <b>{formatKrw(bobToUsd(bobNum, rates, bobRate) * rates.usdKrw)}</b>
            </span>
          )}
        </label>
      </div>

      {bobNum > 0 && krwNum > 0 && (
        <p className="mt-3 rounded-[10px] bg-[#e6f4ec] p-2.5 text-[13px] text-[#1f7a4c]">
          A ese precio, en Bolivia está{" "}
          <b>{(bobToUsd(bobNum, rates, bobRate) / krwToUsd(krwNum, rates)).toFixed(1)}x</b> más caro. Te ahorrás{" "}
          {formatUsd(bobToUsd(bobNum, rates, bobRate) - krwToUsd(krwNum, rates))} por unidad.
        </p>
      )}

      {editing && (
        <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-3">
          {(
            [
              ["usdKrw", "Won por dólar"],
              ["usdBobOficial", "Bs por dólar (oficial)"],
              ["usdBobParalelo", "Bs por dólar (paralelo)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-1 block text-[13px] text-ink-2">{label}</span>
              <input
                className={inputClass}
                inputMode="decimal"
                defaultValue={rates[key]}
                onBlur={(e) => {
                  const v = Number(e.target.value.replace(",", "."));
                  if (v > 0) saveSettings({ [key]: v });
                }}
              />
            </label>
          ))}
          <div className="sm:col-span-3">
            <span className="mb-1 block text-[13px] text-ink-2">Cuál usar para comparar</span>
            <div className="flex gap-1.5">
              {(["oficial", "paralelo"] as const).map((r) => (
                <button
                  key={r}
                  aria-pressed={bobRate === r}
                  onClick={() => saveSettings({ bobRate: r })}
                  className={
                    "cursor-pointer rounded-full border px-3 py-1 text-[13px] " +
                    (bobRate === r ? "border-ink bg-ink text-white" : "border-line text-ink-2")
                  }
                >
                  {r === "oficial" ? "Oficial" : "Paralelo"}
                </button>
              ))}
            </div>
            <p className="mt-2 mb-0 text-xs text-ink-3">
              Bolivia ya no está en Bs 6,96: tras la flexibilización cambiaria el oficial subió y la brecha con el
              paralelo quedó en ~1%. Precios de la guía al {SOURCE_DATE}.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
