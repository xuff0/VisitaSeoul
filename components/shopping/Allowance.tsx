"use client";

import { useMemo, useState } from "react";
import { CUSTOMS, TAX_REFUND, type Rates } from "@/lib/data/shopping";
import type { PurchaseRow } from "@/lib/db/schema";
import { addPurchase, deletePurchase, saveSettings } from "@/lib/db/repo";
import { formatKrw, formatUsd, krwToUsd } from "@/lib/money";
import { Badge, Button, Card, inputClass } from "@/components/ui/primitives";

/**
 * Contador de la franquicia aduanera y del tax refund.
 *
 * La franquicia se calcula sobre lo que realmente pagaste, no sobre los precios de lista: el
 * punto de anotar cada compra es llegar al aeropuerto sabiendo el número, en vez de estimarlo
 * en la fila de aduana.
 */
export default function Allowance({
  purchases,
  rates,
  travellers,
}: {
  purchases: PurchaseRow[];
  rates: Rates;
  travellers: number;
}) {
  const [label, setLabel] = useState("");
  const [krw, setKrw] = useState("");

  const totals = useMemo(() => {
    const krwTotal = purchases.reduce((s, p) => s + (p.krwPaid || 0), 0);
    const refunded = purchases.filter((p) => p.taxRefunded).reduce((s, p) => s + (p.krwPaid || 0), 0);
    return { krwTotal, usdTotal: krwToUsd(krwTotal, rates), refunded };
  }, [purchases, rates]);

  const limit = CUSTOMS.franquiciaUsd * travellers;
  const hardLimit = CUSTOMS.menorCuantiaUsd * travellers;
  const pct = Math.min(100, (totals.usdTotal / limit) * 100);
  const over = totals.usdTotal > limit;
  const wayOver = totals.usdTotal > hardLimit;

  const refundPct = Math.min(100, (totals.refunded / TAX_REFUND.tripMaxKrw) * 100);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 text-base font-semibold">Franquicia de aduana</h2>
          <div className="flex gap-1.5">
            {[1, 2].map((n) => (
              <button
                key={n}
                aria-pressed={travellers === n}
                onClick={() => saveSettings({ travellers: n })}
                className={
                  "cursor-pointer rounded-full border px-2.5 py-1 text-[12.5px] " +
                  (travellers === n ? "border-ink bg-ink text-white" : "border-line text-ink-2")
                }
              >
                {n === 1 ? "Viajo solo" : "Somos dos"}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-2 mb-1 text-[15px]">
          <b className="text-[22px] tabular-nums">{formatUsd(totals.usdTotal)}</b>
          <span className="text-ink-2"> de {formatUsd(limit)}</span>
          <span className="ml-2 text-[13px] text-ink-3">({formatKrw(totals.krwTotal)})</span>
        </p>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e2e4ea]" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${pct}%`, background: wayOver ? "#c8342f" : over ? "#e8590c" : "#1f7a4c" }}
          />
        </div>

        {wayOver ? (
          <p className="mt-2 rounded-[10px] bg-[#fdf0ee] p-2.5 text-[13px] text-[#a12f27]">
            Pasaste los {formatUsd(hardLimit)}: ya es Declaración de Importación a Consumo, trámite formal con
            despachante. Conviene repartir la compra o dejar algo para otro viaje.
          </p>
        ) : over ? (
          <p className="mt-2 rounded-[10px] bg-[#fdf3d6] p-2.5 text-[13px] text-[#8a6300]">
            Pasaste la franquicia. Entre {formatUsd(limit)} y {formatUsd(hardLimit)} se paga por Despacho de
            Importación de Menor Cuantía, sin despachante. Guardá todos los recibos.
          </p>
        ) : (
          <p className="mt-2 text-[13px] text-ink-2">
            Te quedan {formatUsd(limit - totals.usdTotal)} libres de tributos.
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
          <input
            className={inputClass + " !w-auto flex-1"}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Qué compraste"
          />
          <input
            className={inputClass + " !w-[110px]"}
            inputMode="numeric"
            value={krw}
            onChange={(e) => setKrw(e.target.value)}
            placeholder="₩ pagado"
          />
          <Button
            variant="solid"
            onClick={async () => {
              const n = Number(krw.replace(/[^\d]/g, ""));
              if (!n) return;
              await addPurchase({ label: label.trim() || "Compra", qty: 1, krwPaid: n, boughtAt: Date.now() });
              setLabel("");
              setKrw("");
            }}
          >
            Sumar
          </Button>
        </div>

        {purchases.length > 0 && (
          <ul className="mt-2.5 flex list-none flex-col gap-1 p-0">
            {purchases.map((p) => (
              <li key={p.id} className="flex items-baseline gap-2 text-[13px]">
                <span className="min-w-0 flex-1 truncate">
                  {p.label}
                  {p.qty > 1 && <span className="text-ink-3"> ×{p.qty}</span>}
                </span>
                <span className="shrink-0 tabular-nums">{formatKrw(p.krwPaid)}</span>
                <span className="shrink-0 text-ink-3 tabular-nums">{formatUsd(krwToUsd(p.krwPaid, rates))}</span>
                <button
                  className="shrink-0 cursor-pointer text-ink-3 underline"
                  onClick={() => deletePurchase(p.id)}
                  aria-label={`Quitar ${p.label}`}
                >
                  quitar
                </button>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-3 text-[13px]">
          <summary className="cursor-pointer text-ink-2">Las reglas, en corto</summary>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-ink-2">
            {CUSTOMS.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      </Card>

      <Card>
        <h2 className="m-0 text-base font-semibold">Tax refund</h2>
        <p className="mt-1 mb-2 text-[13px] text-ink-2">
          Desde {formatKrw(TAX_REFUND.minKrw)} por recibo. El descuento inmediato en caja tiene tope de{" "}
          {formatKrw(TAX_REFUND.immediateMaxKrw)} por transacción y {formatKrw(TAX_REFUND.tripMaxKrw)} en todo el viaje.
        </p>

        <p className="mt-2 mb-1 text-[15px]">
          <b className="text-[20px] tabular-nums">{formatKrw(totals.refunded)}</b>
          <span className="text-ink-2"> de {formatKrw(TAX_REFUND.tripMaxKrw)} usados</span>
        </p>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e2e4ea]" role="progressbar" aria-valuenow={Math.round(refundPct)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-[#1668b3] transition-[width]" style={{ width: `${refundPct}%` }} />
        </div>
        <p className="mt-2 text-[13px] text-ink-2">
          Devolución estimada:{" "}
          <b>
            {formatKrw(totals.refunded * TAX_REFUND.effectiveRate[0])}–
            {formatKrw(totals.refunded * TAX_REFUND.effectiveRate[1])}
          </b>
        </p>

        {purchases.length > 0 && (
          <div className="mt-2.5 border-t border-line pt-2.5">
            <p className="mt-0 mb-1.5 text-[13px] text-ink-2">Marcá en cuáles pediste el descuento en caja:</p>
            <ul className="flex list-none flex-col gap-1 p-0">
              {purchases.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    id={`tr-${p.id}`}
                    checked={!!p.taxRefunded}
                    onChange={async () => {
                      await deletePurchase(p.id);
                      await addPurchase({
                        itemId: p.itemId,
                        label: p.label,
                        qty: p.qty,
                        krwPaid: p.krwPaid,
                        placeId: p.placeId,
                        taxRefunded: !p.taxRefunded,
                        boughtAt: p.boughtAt,
                      });
                    }}
                  />
                  <label htmlFor={`tr-${p.id}`} className="min-w-0 flex-1 cursor-pointer truncate">
                    {p.label}
                  </label>
                  {p.krwPaid < TAX_REFUND.minKrw && <Badge tone="warn">bajo el mínimo</Badge>}
                  {p.krwPaid > TAX_REFUND.immediateMaxKrw && <Badge tone="warn">voucher, no caja</Badge>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <details className="mt-3 text-[13px]">
          <summary className="cursor-pointer text-ink-2">Las reglas, en corto</summary>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-ink-2">
            {TAX_REFUND.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      </Card>
    </div>
  );
}
