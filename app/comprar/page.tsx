"use client";

import { useMemo, useState } from "react";
import Allowance from "@/components/shopping/Allowance";
import Converter from "@/components/shopping/Converter";
import ProductRow from "@/components/shopping/ProductRow";
import { Card, Chip, inputClass } from "@/components/ui/primitives";
import {
  BUDGET_PLAN,
  ELECTRICITY,
  PRODUCTS,
  SHOPPING_CATEGORIES,
  SOURCE_DATE,
} from "@/lib/data/shopping";
import { arbitrage, formatMultiple, formatUsd } from "@/lib/money";
import { useMounted, usePurchases, useRates, useSettings, useSightings } from "@/lib/hooks";

type Sort = "multiplo" | "precio" | "categoria";

export default function ComprarPage() {
  const mounted = useMounted();
  const rates = useRates();
  const settings = useSettings();
  const purchases = usePurchases();
  const sightings = useSightings();

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("todas");
  const [sort, setSort] = useState<Sort>("multiplo");

  const sightingsByItem = useMemo(() => {
    const map = new Map<string, { krw: number; seenAt: number }[]>();
    for (const s of [...sightings].sort((a, b) => b.seenAt - a.seenAt)) {
      if (!map.has(s.itemId)) map.set(s.itemId, []);
      map.get(s.itemId)!.push({ krw: s.krw, seenAt: s.seenAt });
    }
    return map;
  }, [sightings]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const items = PRODUCTS.filter((p) => {
      if (cat !== "todas" && p.cat !== cat) return false;
      if (!needle) return true;
      return `${p.name} ${p.nameKo} ${p.note ?? ""}`.toLowerCase().includes(needle);
    });

    if (sort === "categoria") return items;
    return [...items].sort((a, b) => {
      const aa = arbitrage(a, rates, settings.bobRate);
      const bb = arbitrage(b, rates, settings.bobRate);
      if (sort === "multiplo") {
        // Los que no se consiguen en Bolivia no tienen múltiplo; van al final, no arriba.
        const am = aa.promoMultiple ?? aa.multiple ?? -1;
        const bm = bb.promoMultiple ?? bb.multiple ?? -1;
        return bm - am;
      }
      return (aa.krw ?? Infinity) - (bb.krw ?? Infinity);
    });
  }, [q, cat, sort, rates, settings.bobRate]);

  const topFive = useMemo(
    () =>
      [...PRODUCTS]
        .map((p) => ({ p, a: arbitrage(p, rates, settings.bobRate) }))
        .filter((x) => (x.a.promoMultiple ?? x.a.multiple) != null)
        .sort((x, y) => (y.a.promoMultiple ?? y.a.multiple)! - (x.a.promoMultiple ?? x.a.multiple)!)
        .slice(0, 5),
    [rates, settings.bobRate],
  );

  return (
    <div className="flex flex-col gap-3">
      <Card className="!bg-ink !text-white">
        <h2 className="m-0 text-base font-semibold">Los mejores arbitrajes</h2>
        <p className="mt-1 mb-2.5 text-[13px] text-[#b9bec8]">
          Lo que más conviene traer, ordenado por cuánto más cuesta en Bolivia.
        </p>
        <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
          {topFive.map(({ p, a }, i) => (
            <li key={p.id} className="flex items-baseline gap-2.5 text-sm">
              <span className="w-4 shrink-0 text-[#8b919c] tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {a.savingUsd != null && (
                <span className="shrink-0 text-[12.5px] text-[#8b919c]">ahorrás {formatUsd(a.savingUsd)}</span>
              )}
              <span className="shrink-0 font-bold text-[#4ade80] tabular-nums">
                {formatMultiple(a.promoMultiple ?? a.multiple)}
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <Converter rates={rates} bobRate={settings.bobRate} />

      {mounted && <Allowance purchases={purchases} rates={rates} travellers={settings.travellers} />}

      <section>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            className={inputClass + " !w-auto min-w-[200px] flex-1"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar producto o 한글"
            aria-label="Buscar productos"
          />
          <div className="inline-flex overflow-hidden rounded-full border border-line bg-panel" role="group" aria-label="Ordenar">
            {(
              [
                ["multiplo", "Mejor arbitraje"],
                ["precio", "Más barato"],
                ["categoria", "Por grupo"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                aria-pressed={sort === id}
                onClick={() => setSort(id)}
                className={"cursor-pointer px-2.5 py-1.5 text-[13px] " + (sort === id ? "bg-ink text-white" : "text-ink-2")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
          <Chip active={cat === "todas"} count={PRODUCTS.length} onClick={() => setCat("todas")}>
            Todos
          </Chip>
          {SHOPPING_CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              active={cat === c.id}
              icon={c.icon}
              count={PRODUCTS.filter((p) => p.cat === c.id).length}
              onClick={() => setCat(c.id)}
            >
              {c.label}
            </Chip>
          ))}
        </div>

        <ul className="mt-3 flex list-none flex-col gap-2 p-0">
          {list.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              rates={rates}
              bobRate={settings.bobRate}
              sightings={sightingsByItem.get(p.id) ?? []}
            />
          ))}
        </ul>
      </section>

      <Card>
        <h2 className="m-0 text-base font-semibold">Plan de compra sugerido</h2>
        <p className="mt-1 mb-2.5 text-[13px] text-ink-2">
          Cómo repartir los {formatUsd(BUDGET_PLAN.reduce((s, b) => s + b.usd, 0))} de la franquicia. En Bolivia eso
          equivale a entre $2.200 y $2.600.
        </p>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {BUDGET_PLAN.map((b) => (
            <li key={b.cat} className="flex flex-wrap items-baseline gap-x-2 text-[13.5px]">
              <b className="w-[70px] shrink-0 tabular-nums">{formatUsd(b.usd)}</b>
              <span className="font-medium">{b.label}</span>
              <span className="text-ink-3">— {b.what}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="m-0 text-base font-semibold">Antes de comprar algo que se enchufa</h2>
        <ul className="mt-1.5 mb-0 flex list-disc flex-col gap-1 pl-5 text-[13.5px] text-ink-2">
          <li>{ELECTRICITY.safe}</li>
          <li>{ELECTRICITY.risk}</li>
          <li>{ELECTRICITY.plug}</li>
        </ul>
      </Card>

      <p className="text-xs text-ink-3">
        Precios verificados al {SOURCE_DATE}. Los de Olive Young cambian todas las semanas por promociones y los de
        Bolivia varían por tienda y por el tipo de cambio. Usá el botón de Naver para confirmar el precio coreano
        vigente, y anotá en la app lo que veas en la góndola.
      </p>
    </div>
  );
}
