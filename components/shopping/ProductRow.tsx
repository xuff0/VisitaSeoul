"use client";

import { useState } from "react";
import { SEED_PLACES } from "@/lib/data/places";
import type { Product, Rates } from "@/lib/data/shopping";
import { addPurchase, addSighting } from "@/lib/db/repo";
import { arbitrage, formatBob, formatKrw, formatMultiple, formatUsd, type BobRate } from "@/lib/money";
import { naverShoppingUrl } from "@/lib/naver";
import { copyText } from "@/lib/share";
import { Badge, Button, inputClass } from "@/components/ui/primitives";

/** Lugares de la semilla que declaran vender este producto. Es el puente con el mapa. */
function placesFor(productId: string) {
  return SEED_PLACES.filter((p) => p.buy?.includes(productId));
}

export default function ProductRow({
  product,
  rates,
  bobRate,
  sightings,
}: {
  product: Product;
  rates: Rates;
  bobRate: BobRate;
  sightings: { krw: number; seenAt: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState("");
  const [qty, setQty] = useState("1");
  const [flash, setFlash] = useState("");
  const a = arbitrage(product, rates, bobRate);
  const best = a.promoMultiple ?? a.multiple;
  const where = placesFor(product.id);

  const say = (m: string) => {
    setFlash(m);
    setTimeout(() => setFlash(""), 1800);
  };

  const priceKr =
    product.krwMin == null
      ? "variable"
      : product.krwMin === product.krwMax
        ? formatKrw(product.krwMin)
        : `${formatKrw(product.krwMin)}–${formatKrw(product.krwMax!)}`;

  const priceBo =
    product.bobMin == null
      ? null
      : product.bobMin === product.bobMax
        ? formatBob(product.bobMin)
        : `${formatBob(product.bobMin)}–${formatBob(product.bobMax!)}`;

  return (
    <li className="rounded-xl border border-line bg-panel p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-[15.5px] font-semibold">{product.name}</h3>
          <p className="mt-0.5 mb-0 flex flex-wrap items-center gap-2 text-[14px] text-ink-2">
            <span lang="ko">{product.nameKo}</span>
            <button
              className="cursor-pointer text-[12.5px] text-ink-3 underline"
              onClick={async () => say((await copyText(product.nameKo)) ? "Copiado" : "No se pudo copiar")}
            >
              copiar
            </button>
          </p>
        </div>
        <div className="shrink-0 text-right">
          {best != null ? (
            <>
              <div
                className="text-[19px] leading-none font-bold tabular-nums"
                style={{ color: best >= 3 ? "#1f7a4c" : best >= 2 ? "#8a6300" : "#565c68" }}
              >
                {formatMultiple(best)}
              </div>
              <div className="mt-0.5 text-[11.5px] text-ink-3">
                {a.promoMultiple ? `con ${product.promo}` : "más caro allá"}
              </div>
            </>
          ) : (
            <div className="text-[12px] text-ink-3">
              {product.bobMin == null ? "No se consigue\nen Bolivia" : "Sin comparación"}
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 mb-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <span>
          Corea: <b>{priceKr}</b>
          {a.usd != null && <span className="text-ink-3"> ({formatUsd(a.usd)})</span>}
        </span>
        {priceBo && (
          <span>
            Bolivia: <b>{priceBo}</b>
            {a.bobUsd != null && <span className="text-ink-3"> ({formatUsd(a.bobUsd)})</span>}
          </span>
        )}
        <Badge tone={product.confKr === "verificado" ? "good" : "neutral"}>
          ₩ {product.confKr}
        </Badge>
        {product.confBo && (
          <Badge tone={product.confBo === "verificado" ? "good" : "neutral"}>Bs {product.confBo}</Badge>
        )}
        {product.promo && <Badge tone="good">{product.promo}</Badge>}
        {product.volt === "riesgo" && <Badge tone="bad">Voltaje: riesgo en La Paz</Badge>}
        {product.volt === "revisar" && <Badge tone="warn">Revisá que diga 100–240V</Badge>}
        {product.volt === "ok" && <Badge tone="good">Voltaje sin problema</Badge>}
      </p>

      {product.note && <p className="mt-1.5 mb-0 max-w-[70ch] text-[13.5px] text-ink-2">{product.note}</p>}

      {sightings.length > 0 && (
        <p className="mt-1.5 mb-0 text-[13px] text-[#1f7a4c]">
          Precio que anotaste en tienda: <b>{formatKrw(sightings[0].krw)}</b>
          {sightings.length > 1 && <span className="text-ink-3"> ({sightings.length} registros)</span>}
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <a
          className="rounded-lg bg-naver px-2.5 py-1.5 text-[13px] font-semibold text-white no-underline"
          href={naverShoppingUrl(product.nameKo)}
          target="_blank"
          rel="noopener"
        >
          Precio en Naver
        </a>
        <Button className="!px-2.5 !py-1.5 !text-[13px]" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Cerrar" : "Anotar precio o compra"}
        </Button>
        {where.length > 0 && (
          <span className="self-center text-[12.5px] text-ink-3">
            Se consigue en: {where.slice(0, 3).map((p) => p.n).join(", ")}
            {where.length > 3 && ` y ${where.length - 3} más`}
          </span>
        )}
      </div>

      {open && (
        <div className="mt-2.5 grid gap-2 border-t border-line pt-2.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[13px] text-ink-2">Precio que ves en la góndola (₩)</label>
            <div className="flex gap-1.5">
              <input className={inputClass} inputMode="numeric" value={seen} onChange={(e) => setSeen(e.target.value)} placeholder="13900" />
              <Button
                onClick={async () => {
                  const krw = Number(seen.replace(/[^\d]/g, ""));
                  if (!krw) return;
                  await addSighting({ itemId: product.id, krw, seenAt: Date.now() });
                  setSeen("");
                  say("Precio anotado");
                }}
              >
                Anotar
              </Button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[13px] text-ink-2">Lo compré — cuántas unidades</label>
            <div className="flex gap-1.5">
              <input className={inputClass} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
              <Button
                onClick={async () => {
                  const n = Number(qty) || 1;
                  const unit = Number(seen.replace(/[^\d]/g, "")) || product.promoUnitKrw || a.krw;
                  if (!unit) {
                    say("Escribí primero cuánto pagaste");
                    return;
                  }
                  await addPurchase({
                    itemId: product.id,
                    label: product.name,
                    qty: n,
                    krwPaid: unit * n,
                    boughtAt: Date.now(),
                  });
                  say(`Sumado a la franquicia: ${formatKrw(unit * n)}`);
                }}
              >
                Sumar
              </Button>
            </div>
            <p className="mt-1 mb-0 text-xs text-ink-3">Usa el precio que anotaste; si no, el de la guía.</p>
          </div>
        </div>
      )}

      {flash && <p className="mt-1.5 mb-0 text-[12.5px] text-ink-3">{flash}</p>}
    </li>
  );
}
