"use client";

import { useEffect, useState } from "react";
import { LINE_BY_ID } from "@/lib/data/metro";
import { CATEGORY_BY_ID, TAG_BY_ID } from "@/lib/data/places";
import { PRODUCT_BY_ID, type Rates } from "@/lib/data/shopping";
import { formatKm, nearestStation } from "@/lib/geo";
import { arbitrage, formatKrw, formatMultiple, type BobRate } from "@/lib/money";
import { naverShoppingUrl, naverWebUrl, nmapPlaceUrl, nmapTransitRouteUrl, openInNaverApp } from "@/lib/naver";
import { copyText } from "@/lib/share";
import type { Place } from "@/lib/types";
import { Badge } from "@/components/ui/primitives";

/**
 * Ficha breve sobre el mapa.
 *
 * Reemplaza al globo de Leaflet, que en el teléfono no se llegaba a ver: al tocar un punto la
 * página se desplazaba a la lista y el globo quedaba fuera de pantalla.
 *
 * La diferencia que importa es que el mapa sigue a la vista. Parado en la calle, la pregunta no
 * es sólo «qué es esto» sino «y lo de al lado». Con la lista había que bajar, leer, subir, buscar
 * el otro punto y bajar otra vez; acá se tocan dos puntos seguidos y listo.
 *
 * Lleva los productos con su multiplicador porque es la respuesta que se necesita en la puerta
 * del local: si entrar conviene o no.
 */
export default function PlaceSheet({
  place,
  me,
  rates,
  bobRate,
  onClose,
  onVerFicha,
}: {
  place: Place;
  me: { lat: number; lng: number } | null;
  rates: Rates;
  bobRate: BobRate;
  onClose: () => void;
  onVerFicha: () => void;
}) {
  const [aviso, setAviso] = useState("");
  const cat = CATEGORY_BY_ID.get(place.c);
  const estacion = nearestStation(place.lat, place.lng);

  // Los productos del lugar, del que más conviene al que menos: lo primero que se lee es lo que
  // más plata ahorra.
  const productos = (place.buy ?? [])
    .map((id) => PRODUCT_BY_ID.get(id))
    .filter((p) => p != null)
    .map((p) => ({ p, a: arbitrage(p, rates, bobRate) }))
    .sort((x, y) => (y.a.promoMultiple ?? y.a.multiple ?? 0) - (x.a.promoMultiple ?? x.a.multiple ?? 0))
    .slice(0, 4);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const decir = (m: string) => {
    setAviso(m);
    setTimeout(() => setAviso(""), 1600);
  };

  return (
    <div
      data-hoja="1"
      role="dialog"
      aria-label={place.n}
      className="fixed inset-x-0 bottom-0 z-[1200] max-h-[62vh] overflow-y-auto rounded-t-2xl border-t border-line bg-panel shadow-[0_-6px_24px_rgb(0_0_0/0.18)] lg:absolute lg:inset-x-2 lg:bottom-2 lg:max-h-[60%] lg:rounded-2xl lg:border lg:shadow-[0_4px_20px_rgb(0_0_0/0.18)]"
    >
      <div className="flex items-start gap-2 border-b border-line px-3.5 pt-2.5 pb-2.5">
        <span
          aria-hidden
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[13px]"
          style={{ background: cat?.color ?? "#868e96" }}
        >
          {cat?.icon ?? "📍"}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-[16.5px] leading-tight font-semibold">{place.n}</h2>
          {place.k && (
            <p className="mt-0.5 mb-0 flex flex-wrap items-center gap-2 text-[14px] text-ink-2">
              <span lang="ko">{place.k}</span>
              <button
                className="cursor-pointer text-[12.5px] text-ink-3 underline"
                onClick={async () => decir((await copyText(place.k)) ? "Copiado" : "No se pudo copiar")}
              >
                copiar
              </button>
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="-mt-0.5 -mr-1 cursor-pointer rounded-lg px-2 py-1 text-[19px] leading-none text-ink-3"
        >
          ×
        </button>
      </div>

      <div className="px-3.5 py-2.5">
        <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-3">
          <span className="font-semibold" style={{ color: cat?.color }}>
            {cat?.label ?? place.c}
          </span>
          {place.d && <span>· {place.d}</span>}
          {place.km != null && <span>· a {formatKm(place.km)} de vos</span>}
        </p>

        {estacion && (
          <p className="mt-1.5 mb-0 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-2">
            {estacion.station[4].map((id) => (
              <span
                key={id}
                title={LINE_BY_ID[id]?.es}
                className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11.5px] font-bold text-white"
                style={{ background: LINE_BY_ID[id]?.c ?? "#888" }}
              >
                {LINE_BY_ID[id]?.s}
              </span>
            ))}
            <span lang="ko">{estacion.station[0]}</span>
            <span>{estacion.station[1]}</span>
            <span className="text-ink-3">a {formatKm(estacion.km)}</span>
          </p>
        )}

        {(place.tags?.length || place.hours) && (
          <p className="mt-2 mb-0 flex flex-wrap items-center gap-1.5">
            {place.hours && <Badge>{place.hours}</Badge>}
            {place.tags?.map((t) => (
              <Badge key={t} tone={t === "cierra13dom" ? "warn" : t === "taxfree" || t === "promo11" ? "good" : "neutral"}>
                {TAG_BY_ID.get(t as never)?.label ?? t}
              </Badge>
            ))}
          </p>
        )}

        {productos.length > 0 && (
          <div className="mt-2.5 rounded-xl bg-[#f5f6f8] p-2.5">
            <h3 className="m-0 mb-1.5 text-[12.5px] font-semibold text-ink-2">Qué comprar acá</h3>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {productos.map(({ p, a }) => {
                const mejor = a.promoMultiple ?? a.multiple;
                return (
                  <li key={p.id}>
                    <a
                      href={naverShoppingUrl(p.nameKo)}
                      target="_blank"
                      rel="noopener"
                      className="flex items-baseline gap-2 text-[13.5px] no-underline"
                    >
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      {a.krw != null && <span className="shrink-0 text-[12px] text-ink-3">{formatKrw(a.krw)}</span>}
                      {mejor != null && (
                        <span
                          className="shrink-0 font-bold tabular-nums"
                          style={{ color: mejor >= 3 ? "#1f7a4c" : mejor >= 2 ? "#8a6300" : "#565c68" }}
                        >
                          {formatMultiple(mejor)}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1.5 mb-0 text-[11.5px] text-ink-3">
              Tocá un producto para ver el precio vigente en Naver.
            </p>
          </div>
        )}

        {place.t && <p className="mt-2 mb-0 line-clamp-3 text-[13px] text-ink-2">{place.t}</p>}

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <button
            className="cursor-pointer rounded-lg bg-naver px-2.5 py-1.5 text-[13px] font-semibold text-white"
            onClick={() =>
              openInNaverApp(
                nmapPlaceUrl({ name: place.n, nameKo: place.k, lat: place.lat, lng: place.lng }),
                naverWebUrl({ name: place.n, nameKo: place.k }),
              )
            }
          >
            Naver Maps
          </button>
          {me && (
            <button
              className="cursor-pointer rounded-lg border border-line bg-[#fafafb] px-2.5 py-1.5 text-[13px]"
              onClick={() =>
                openInNaverApp(
                  nmapTransitRouteUrl(me, { name: place.n, nameKo: place.k, lat: place.lat, lng: place.lng }),
                  naverWebUrl({ name: place.n, nameKo: place.k }),
                )
              }
            >
              Cómo llegar
            </button>
          )}
          <button
            className="cursor-pointer rounded-lg border border-line bg-[#fafafb] px-2.5 py-1.5 text-[13px]"
            onClick={onVerFicha}
          >
            Ver ficha completa
          </button>
        </div>

        {aviso && <p className="mt-1.5 mb-0 text-[12.5px] text-ink-3">{aviso}</p>}
      </div>
    </div>
  );
}
