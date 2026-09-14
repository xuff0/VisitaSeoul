"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import type { BaseId, PickMode } from "@/components/map/MapCanvas";
import { useGeolocation } from "@/components/map/useGeolocation";
import PlaceCard from "@/components/places/PlaceCard";
import PlaceForm from "@/components/places/PlaceForm";
import { Button, Chip, Toggle } from "@/components/ui/primitives";
import { LINE_BY_ID, LINES } from "@/lib/data/metro";
import { deletePlace, restoreSeedPlace, savePlace, toggleFlag } from "@/lib/db/repo";
import { formatKm, nearestStation, parseCoords } from "@/lib/geo";
import { useCategories, useFlags, useMounted, usePlaces, useRates } from "@/lib/hooks";
import { copyText } from "@/lib/share";
import type { Place, PlaceInput } from "@/lib/types";

// Leaflet toca `window` al importarse, así que el mapa no puede renderizarse en el servidor.
const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl border border-line bg-[#e9eaee]" />,
});

const RADII = [0.5, 1, 3] as const;

export default function MapPage() {
  const mounted = useMounted();
  const geo = useGeolocation();
  const me = geo.position;
  const places = usePlaces(me);
  const { fav, done } = useFlags();
  const categories = useCategories();
  const rates = useRates();

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("todas");
  const [zone, setZone] = useState<"todas" | "seul" | "alrededores">("todas");
  const [onlyFav, setOnlyFav] = useState(false);
  const [onlyPending, setOnlyPending] = useState(false);
  const [radius, setRadius] = useState<number | null>(null);
  const [sortByDistance, setSortByDistance] = useState(false);

  const [base, setBase] = useState<BaseId>("claro");
  const [showMetro, setShowMetro] = useState(true);
  const [showDistricts, setShowDistricts] = useState(false);

  const [selected, setSelected] = useState<string | null>(null);
  const [pickMode, setPickMode] = useState<PickMode>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Place | null>(null);
  const [manualCoords, setManualCoords] = useState("");

  const focusRef = useRef<((lat: number, lng: number, zoom?: number) => void) | null>(null);
  const barraRef = useRef<HTMLDivElement>(null);
  /** Ficha que está destellando. Va en estado: puesto a mano en el DOM, el siguiente render lo borra. */
  const [destello, setDestello] = useState<string | null>(null);
  const destelloTimer = useRef<number | undefined>(undefined);

  /**
   * Lleva la vista a la ficha de un sitio y la resalta.
   *
   * Se usa al tocar un punto del mapa. Dos detalles que importan en el teléfono: el desplazamiento
   * descuenta la altura de la barra pegajosa, para que la ficha no quede debajo de los filtros; y
   * si la ficha ya está a la vista no se mueve nada, porque un salto sin motivo desorienta más de
   * lo que ayuda. El destello es el que dice «es ésta»: con más de cien fichas iguales, el borde
   * solo no alcanza.
   */
  function revelarFicha(id: string) {
    const el = document.querySelector<HTMLElement>(`[data-place-id="${CSS.escape(id)}"]`);
    if (!el) return;

    const barra = barraRef.current?.getBoundingClientRect().height ?? 0;
    const caja = el.getBoundingClientRect();
    const yaVisible = caja.top >= barra && caja.bottom <= window.innerHeight;

    if (!yaVisible) {
      const suave = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      window.scrollTo({ top: caja.top + window.scrollY - barra - 10, behavior: suave });
    }

    // Apagar y volver a encender en el cuadro siguiente reinicia la animación cuando tocás dos
    // veces el mismo punto; si no, la clase ya estaría puesta y no pasaría nada.
    window.clearTimeout(destelloTimer.current);
    setDestello(null);
    requestAnimationFrame(() => setDestello(id));
    destelloTimer.current = window.setTimeout(() => setDestello(null), 1600);
  }

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of places) map.set(String(p.c), (map.get(String(p.c)) ?? 0) + 1);
    return map;
  }, [places]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = places.filter((p) => {
      if (cat !== "todas" && String(p.c) !== cat) return false;
      if (zone !== "todas" && p.z !== zone) return false;
      if (onlyFav && !fav.has(p.id)) return false;
      if (onlyPending && done.has(p.id)) return false;
      if (radius != null && (p.km == null || p.km > radius)) return false;
      if (needle) {
        const st = nearestStation(p.lat, p.lng);
        const hay = [p.n, p.k, p.d, p.t, p.hours, st?.station[0], st?.station[1]]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    if (sortByDistance && me) list = [...list].sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
    return list;
  }, [places, q, cat, zone, onlyFav, onlyPending, radius, sortByDistance, me, fav, done]);

  const fitKey = `${cat}|${zone}|${onlyFav}|${onlyPending}|${radius}`;

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
    setPicked(null);
  }

  function openEdit(p: Place) {
    setEditing(p);
    setFormOpen(true);
    setPicked(null);
  }

  async function handleSave(input: PlaceInput, id?: string) {
    const savedId = await savePlace(input, id);
    setFormOpen(false);
    setEditing(null);
    setPicked(null);
    setPickMode(null);
    setSelected(savedId);
    focusRef.current?.(input.lat, input.lng, 15);
  }

  async function handleDelete(p: Place) {
    const what = p.origin === "mine" ? "eliminar" : "ocultar";
    if (!confirm(`¿Querés ${what} “${p.n}”?${p.origin !== "mine" ? " Podés recuperarlo desde Mi viaje." : ""}`)) return;
    await deletePlace(p.id);
    if (selected === p.id) setSelected(null);
  }

  function handleMapPick(lat: number, lng: number) {
    if (pickMode === "me") {
      geo.setManual(lat, lng);
      setPickMode(null);
      return;
    }
    setPicked({ lat, lng });
    setPickMode(null);
  }

  const meStation = me ? nearestStation(me.lat, me.lng) : null;

  return (
    <>
      <div ref={barraRef} className="sticky top-0 z-[1100] border-b border-line bg-paper pt-2 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-[10px] border border-line bg-panel px-2.5 py-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink-3" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, barrio, estación o 한글"
              aria-label="Buscar sitios"
              className="w-full border-0 bg-transparent outline-none"
            />
          </div>
          <Button onClick={openAdd}>Agregar</Button>
        </div>

        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
          <Chip active={cat === "todas"} count={places.length} onClick={() => setCat("todas")}>
            Todos
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c.id}
              active={cat === c.id}
              icon={c.icon}
              count={counts.get(String(c.id)) ?? 0}
              onClick={() => setCat(String(c.id))}
            >
              {c.label}
            </Chip>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <Toggle active={zone === "seul"} onClick={() => setZone((z) => (z === "seul" ? "todas" : "seul"))}>
            Solo Seúl
          </Toggle>
          <Toggle active={zone === "alrededores"} onClick={() => setZone((z) => (z === "alrededores" ? "todas" : "alrededores"))}>
            Solo alrededores
          </Toggle>
          <Toggle active={onlyFav} onClick={() => setOnlyFav((v) => !v)}>
            Favoritos
          </Toggle>
          <Toggle active={onlyPending} onClick={() => setOnlyPending((v) => !v)}>
            Sin visitar
          </Toggle>
          <Toggle active={sortByDistance} onClick={() => (me ? setSortByDistance((v) => !v) : geo.start(() => setSortByDistance(true)))}>
            Cerca de mí
          </Toggle>
          {me &&
            RADII.map((r) => (
              <Toggle key={r} active={radius === r} onClick={() => setRadius((cur) => (cur === r ? null : r))}>
                {r < 1 ? `${r * 1000} m` : `${r} km`}
              </Toggle>
            ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(360px,420px)_1fr] lg:items-start">
        <div id="mapa-top" className="scroll-mt-2 lg:sticky lg:top-[150px]">
          <div className="h-[46vh] min-h-[300px] lg:h-[calc(100vh-250px)]">
            {mounted && (
              <MapCanvas
                places={filtered}
                categories={categories}
                doneIds={done}
                selectedId={selected}
                onSelect={(id) => {
                  setSelected(id);
                  revelarFicha(id);
                }}
                me={me}
                base={base}
                showMetro={showMetro}
                showDistricts={showDistricts}
                pickMode={pickMode}
                onPick={handleMapPick}
                fitKey={fitKey}
                focusRef={focusRef}
              />
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <div className="inline-flex overflow-hidden rounded-full border border-line bg-panel" role="group" aria-label="Fondo del mapa">
              {(
                [
                  ["claro", "Claro"],
                  ["gris", "Gris"],
                  ["sat", "Satélite"],
                  ["vector", "Sin conexión"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={base === id}
                  onClick={() => setBase(id)}
                  className={"cursor-pointer px-2.5 py-1 text-[13px] " + (base === id ? "bg-ink text-white" : "text-ink-2")}
                >
                  {label}
                </button>
              ))}
            </div>
            <Toggle active={!!me} onClick={() => (me ? geo.clear() : geo.start((p) => focusRef.current?.(p.lat, p.lng, 15)))}>
              {geo.status === "buscando" ? "Buscando…" : "Mi ubicación"}
            </Toggle>
            <Toggle active={showMetro} onClick={() => setShowMetro((v) => !v)}>
              Trenes
            </Toggle>
            <Toggle active={showDistricts} onClick={() => setShowDistricts((v) => !v)}>
              Distritos
            </Toggle>
          </div>

          {me && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
              <span>
                {geo.isLive
                  ? `Ubicación en vivo${me.acc ? `, precisión de unos ${Math.round(me.acc)} m` : ""}.`
                  : "Posición marcada a mano."}
              </span>
              {meStation && (
                <span>
                  Estación más cercana: {meStation.station[0]} {meStation.station[1]}, a {formatKm(meStation.km)}.
                </span>
              )}
              <button className="cursor-pointer underline" onClick={() => focusRef.current?.(me.lat, me.lng, 15)}>
                Centrar
              </button>
              <button
                className="cursor-pointer underline"
                onClick={async () => copyText(`${me.lat.toFixed(6)}, ${me.lng.toFixed(6)}`)}
              >
                Copiar mi posición
              </button>
            </p>
          )}

          {geo.error && (
            <div className="mt-2 flex flex-col gap-2 rounded-[10px] border border-[#f0cdc8] bg-[#fdf0ee] p-3 text-[13px] text-[#a12f27]">
              <p className="m-0">{geo.error.message}</p>
              <div className="flex flex-wrap items-center gap-2">
                <button className="cursor-pointer underline" onClick={() => setPickMode("me")}>
                  Marcar mi posición tocando el mapa
                </button>
                <span>o pegá tus coordenadas:</span>
                <input
                  className="w-[170px] rounded-lg border border-line bg-white px-2 py-1 text-[13px] text-ink"
                  inputMode="decimal"
                  value={manualCoords}
                  onChange={(e) => setManualCoords(e.target.value)}
                  placeholder="37.5665, 126.9780"
                />
                <button
                  className="cursor-pointer underline"
                  onClick={() => {
                    const c = parseCoords(manualCoords);
                    if (c) {
                      geo.setManual(c.lat, c.lng);
                      focusRef.current?.(c.lat, c.lng, 15);
                    }
                  }}
                >
                  Usar
                </button>
              </div>
            </div>
          )}

          <p className="mt-1.5 text-[12.5px] text-ink-3">
            {pickMode === "place"
              ? "Tocá el mapa donde queda el sitio."
              : pickMode === "me"
                ? "Tocá el mapa en el punto donde estás."
                : "Tocá un punto para ver el sitio."}
          </p>

          <details className="mt-2 text-[13px]">
            <summary className="cursor-pointer text-ink-2">Líneas de la red</summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {LINES.map((l) => (
                <span key={l.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel py-0.5 pr-2 pl-0.5 text-xs text-ink-2">
                  <span
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11.5px] font-bold text-white"
                    style={{ background: LINE_BY_ID[l.id].c }}
                  >
                    {l.s}
                  </span>
                  {l.es}
                </span>
              ))}
            </div>
          </details>
        </div>

        <div>
          {formOpen && (
            <PlaceForm
              key={editing?.id ?? "nuevo"}
              editing={editing}
              categories={categories}
              picked={picked}
              pickActive={pickMode === "place"}
              onRequestPick={() => setPickMode((m) => (m === "place" ? null : "place"))}
              onSave={handleSave}
              onCancel={() => {
                setFormOpen(false);
                setEditing(null);
                setPickMode(null);
              }}
            />
          )}

          <p className="mt-2 mb-2 text-[13px] text-ink-2">
            {filtered.length} {filtered.length === 1 ? "sitio" : "sitios"}
            {sortByDistance && me ? ", ordenados por distancia" : ""}
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-panel p-5 text-sm text-ink-2">
              Ningún sitio coincide con el filtro. Probá borrar la búsqueda o volver a “Todos”.
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {filtered.map((p) => (
                <PlaceCard
                  key={p.id}
                  place={p}
                  selected={selected === p.id}
                  flash={destello === p.id}
                  fav={fav.has(p.id)}
                  done={done.has(p.id)}
                  me={me}
                  rates={rates}
                  onSelect={() => setSelected(p.id)}
                  onFocus={() => {
                    setSelected(p.id);
                    focusRef.current?.(p.lat, p.lng, 15);
                    document.getElementById("mapa-top")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  onToggleFav={() => toggleFlag(p.id, "fav")}
                  onToggleDone={() => toggleFlag(p.id, "done")}
                  onEdit={() => openEdit(p)}
                  onDelete={() => handleDelete(p)}
                  onRestore={() => restoreSeedPlace(p.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
