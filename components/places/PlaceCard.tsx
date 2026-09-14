"use client";

import { useState } from "react";
import { LINE_BY_ID } from "@/lib/data/metro";
import { CATEGORY_BY_ID, TAG_BY_ID } from "@/lib/data/places";
import { PRODUCT_BY_ID, type Rates } from "@/lib/data/shopping";
import { formatKm, nearestStation } from "@/lib/geo";
import { arbitrage, formatMultiple } from "@/lib/money";
import {
  formatCoords,
  geoUri,
  googleMapsUrl,
  naverWebUrl,
  nmapPlaceUrl,
  nmapTransitRouteUrl,
  openInNaverApp,
} from "@/lib/naver";
import { copyText, sharePlace } from "@/lib/share";
import type { Place } from "@/lib/types";
import { Badge, Button } from "@/components/ui/primitives";

type Props = {
  place: Place;
  selected: boolean;
  /** Destella al llegar desde el mapa, para que se vea cuál de todas es. */
  flash: boolean;
  fav: boolean;
  done: boolean;
  me: { lat: number; lng: number } | null;
  rates: Rates;
  onSelect: () => void;
  onFocus: () => void;
  onToggleFav: () => void;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
};

export default function PlaceCard(p: Props) {
  const { place } = p;
  const [more, setMore] = useState(false);
  const [flash, setFlash] = useState("");
  const cat = CATEGORY_BY_ID.get(place.c);
  const station = nearestStation(place.lat, place.lng);
  const buys = (place.buy ?? []).map((id) => PRODUCT_BY_ID.get(id)).filter(Boolean);

  const say = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 1600);
  };

  return (
    <li
      data-place-id={place.id}
      className={
        "flex overflow-hidden rounded-xl border bg-panel " +
        (p.selected ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)] " : "border-line ") +
        (p.flash ? "vs-flash" : "")
      }
    >
      <span aria-hidden className="w-[5px] shrink-0" style={{ background: cat?.color ?? "#868e96" }} />
      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-baseline gap-2.5">
          <button
            onClick={p.onSelect}
            className={
              "flex-1 cursor-pointer text-left text-[16.5px] font-semibold tracking-tight " +
              (p.done ? "text-ink-3 line-through" : "")
            }
          >
            {place.n}
          </button>
          <button
            onClick={p.onToggleFav}
            aria-pressed={p.fav}
            aria-label={p.fav ? "Quitar de favoritos" : "Marcar como favorito"}
            className={"cursor-pointer text-[19px] leading-none " + (p.fav ? "text-[#d8a200]" : "text-ink-3")}
          >
            {p.fav ? "★" : "☆"}
          </button>
        </div>

        {place.k && (
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[15px] text-ink-2">
            <span lang="ko">{place.k}</span>
            <button
              className="cursor-pointer text-[12.5px] text-ink-3 underline"
              onClick={async () => say((await copyText(place.k)) ? "Copiado" : "No se pudo copiar")}
            >
              copiar coreano
            </button>
          </p>
        )}

        <p className="mt-1.5 text-[12.5px] text-ink-3">
          <span className="font-semibold" style={{ color: cat?.color }}>
            {cat?.label ?? place.c}
          </span>
          {place.d && ` · ${place.d}`}
          {place.km != null && ` · a ${formatKm(place.km)} de vos`}
          {place.origin !== "seed" && ` · ${place.origin === "mine" ? "agregado por vos" : "editado por vos"}`}
        </p>

        {station ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-2">
            {station.station[4].map((id) => (
              <span
                key={id}
                title={LINE_BY_ID[id]?.es}
                className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11.5px] font-bold text-white"
                style={{ background: LINE_BY_ID[id]?.c ?? "#888" }}
              >
                {LINE_BY_ID[id]?.s}
              </span>
            ))}
            <span lang="ko">{station.station[0]}</span>
            <span>{station.station[1]}</span>
            <span className="text-ink-3">a {formatKm(station.km)}</span>
          </p>
        ) : (
          <p className="mt-1.5 text-[13px] text-ink-3">Sin tren cerca, se llega en bus</p>
        )}

        {(place.tags?.length || place.hours) && (
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {place.hours && <Badge>{place.hours}</Badge>}
            {place.tags?.map((t) => (
              <Badge key={t} tone={t === "cierra13dom" ? "warn" : t === "taxfree" || t === "promo11" ? "good" : "neutral"}>
                {TAG_BY_ID.get(t as never)?.label ?? t}
              </Badge>
            ))}
          </p>
        )}

        {place.t && <p className="mt-1.5 max-w-[62ch] text-[13.5px] text-ink-2">{place.t}</p>}

        {buys.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-[13px] text-ink-2">
              Qué comprar acá ({buys.length})
            </summary>
            <ul className="mt-1.5 flex flex-col gap-1">
              {buys.map((b) => {
                const a = arbitrage(b!, p.rates);
                const best = a.promoMultiple ?? a.multiple;
                return (
                  <li key={b!.id} className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="min-w-0 flex-1 truncate">{b!.name}</span>
                    {best != null && (
                      <span className="shrink-0 font-semibold tabular-nums" style={{ color: best >= 2.5 ? "#1f7a4c" : "#565c68" }}>
                        {formatMultiple(best)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        )}

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
          {p.me && (
            <button
              className="cursor-pointer rounded-lg border border-line bg-[#fafafb] px-2.5 py-1.5 text-[13px]"
              onClick={() =>
                openInNaverApp(
                  nmapTransitRouteUrl(p.me!, { name: place.n, nameKo: place.k, lat: place.lat, lng: place.lng }),
                  naverWebUrl({ name: place.n, nameKo: place.k }),
                )
              }
            >
              Cómo llegar
            </button>
          )}
          <Button className="!px-2.5 !py-1.5 !text-[13px]" onClick={p.onFocus}>
            Acercar
          </Button>
          <Button className="!px-2.5 !py-1.5 !text-[13px]" onClick={async () => say(`${await sharePlace(place)}`)}>
            Compartir
          </Button>
          <Button className="!px-2.5 !py-1.5 !text-[13px]" onClick={() => setMore((v) => !v)} aria-expanded={more}>
            {more ? "Menos" : "Más"}
          </Button>
        </div>

        {more && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line pt-2">
            <a
              className="rounded-lg border border-line bg-[#fafafb] px-2.5 py-1.5 text-[13px] no-underline"
              href={googleMapsUrl(place)}
              target="_blank"
              rel="noopener"
            >
              Google Maps
            </a>
            <a
              className="rounded-lg border border-line bg-[#fafafb] px-2.5 py-1.5 text-[13px] no-underline"
              href={geoUri({ name: place.n, nameKo: place.k, lat: place.lat, lng: place.lng })}
            >
              Abrir en otra app
            </a>
            <Button
              className="!px-2.5 !py-1.5 !text-[13px]"
              onClick={async () => say((await copyText(formatCoords(place))) ? "Coordenadas copiadas" : "No se pudo copiar")}
            >
              Copiar coordenadas
            </Button>
            <Button className="!px-2.5 !py-1.5 !text-[13px]" onClick={p.onToggleDone}>
              {p.done ? "Marcar sin visitar" : "Marcar visitado"}
            </Button>
            <Button className="!px-2.5 !py-1.5 !text-[13px]" onClick={p.onEdit}>
              Editar
            </Button>
            {place.origin === "edited" && (
              <Button className="!px-2.5 !py-1.5 !text-[13px]" onClick={p.onRestore}>
                Restaurar original
              </Button>
            )}
            <Button variant="danger" className="!px-2.5 !py-1.5 !text-[13px]" onClick={p.onDelete}>
              Eliminar
            </Button>
          </div>
        )}

        {flash && <p className="mt-1.5 text-[12.5px] text-ink-3">{flash}</p>}
      </div>
    </li>
  );
}
