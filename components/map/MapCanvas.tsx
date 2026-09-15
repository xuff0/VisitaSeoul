"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { DISTRICTS, HAN_RIVER } from "@/lib/data/geo";
import { LINE_BY_ID, LINE_PATHS, STATIONS } from "@/lib/data/metro";
import { CATEGORY_BY_ID, type Category } from "@/lib/data/places";
import { stationLines } from "@/lib/geo";
import type { Place } from "@/lib/types";

export type BaseId = "claro" | "gris" | "sat" | "vector";
export type PickMode = null | "place" | "me";

export type MapCanvasProps = {
  places: Place[];
  categories: Category[];
  doneIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  me: { lat: number; lng: number; acc?: number | null } | null;
  base: BaseId;
  showMetro: boolean;
  showDistricts: boolean;
  pickMode: PickMode;
  onPick: (lat: number, lng: number) => void;
  /** Tocar el mapa fuera de un punto: sirve para cerrar la ficha breve. */
  onBackgroundClick?: () => void;

  /** Vuelve a encuadrar cuando cambia: se usa al cambiar de filtro, no en cada render. */
  fitKey?: string;
  /**
   * Se rellena con una función para centrar el mapa desde afuera. Es la salida imperativa que
   * necesitan "Acercar en el mapa" y "Centrar mi ubicación", que ocurren por un clic y no por un
   * cambio de estado.
   */
  focusRef?: { current: ((lat: number, lng: number, zoom?: number) => void) | null };
};

const BASES: Record<Exclude<BaseId, "vector">, { url: string; opts: L.TileLayerOptions }> = {
  claro: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    opts: { maxZoom: 19, attribution: "&copy; OpenStreetMap" },
  },
  gris: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    opts: { maxZoom: 19, maxNativeZoom: 16, attribution: "Esri, HERE, Garmin" },
  },
  sat: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    opts: { maxZoom: 19, maxNativeZoom: 18, attribution: "Imágenes: Esri" },
  },
};

export default function MapCanvas(props: MapCanvasProps) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const baseLayer = useRef<L.TileLayer | null>(null);
  const vectorGroup = useRef<L.LayerGroup | null>(null);
  const metroGroup = useRef<L.LayerGroup | null>(null);
  const stationGroup = useRef<L.LayerGroup | null>(null);
  const districtGroup = useRef<L.LayerGroup | null>(null);
  const pinGroup = useRef<L.LayerGroup | null>(null);
  const pins = useRef<Map<string, L.Marker>>(new Map());
  const meMarker = useRef<L.CircleMarker | null>(null);
  const meCircle = useRef<L.Circle | null>(null);
  /** Se lee dentro de los manejadores de Leaflet, que se registran una sola vez. */
  const latest = useRef(props);
  latest.current = props;

  // --- creación del mapa, una sola vez ------------------------------------
  useEffect(() => {
    if (!holder.current || map.current) return;

    const m = L.map(holder.current, { zoomControl: false, preferCanvas: true }).setView(
      [37.5565, 126.995],
      11,
    );
    L.control.zoom({ position: "bottomright" }).addTo(m);

    // Orden de apilado: la geometría de fondo abajo, los trenes en el medio, tu posición arriba.
    m.createPane("basegeo").style.zIndex = "250";
    m.getPane("basegeo")!.style.pointerEvents = "none";
    m.createPane("metro").style.zIndex = "350";
    m.createPane("me").style.zIndex = "650";
    // Tu posición se dibuja por encima de todo, pero no debe recibir toques.
    //
    // El mapa usa preferCanvas, así que el punto azul y su círculo de precisión van a un canvas
    // que ocupa el mapa entero. Ese canvas está sobre el panel de marcadores, de modo que sin
    // esta línea se come cada toque sobre un punto: Leaflet no encuentra figura donde tocaste,
    // dispara un clic de mapa, y la ficha no se abre. Encender la ubicación dejaba el mapa mudo.
    m.getPane("me")!.style.pointerEvents = "none";

    vectorGroup.current = L.layerGroup();
    for (const g of DISTRICTS) {
      for (const ring of g.r) {
        L.polygon(ring, {
          pane: "basegeo",
          color: "#c9ccd4",
          weight: 1,
          fillColor: "#f6f6f8",
          fillOpacity: 1,
        }).addTo(vectorGroup.current);
      }
    }
    L.polyline(HAN_RIVER, {
      pane: "basegeo",
      color: "#bcd6ea",
      weight: 14,
      opacity: 1,
      lineJoin: "round",
      lineCap: "round",
    }).addTo(vectorGroup.current);

    metroGroup.current = L.layerGroup();
    for (const p of LINE_PATHS) {
      const col = LINE_BY_ID[p.id]?.c ?? "#888";
      for (const seg of p.segs) {
        L.polyline(seg, {
          pane: "metro",
          color: col,
          weight: 2.6,
          opacity: 0.62,
          lineJoin: "round",
          lineCap: "round",
          interactive: false,
        }).addTo(metroGroup.current);
      }
    }

    stationGroup.current = L.layerGroup();
    for (const s of STATIONS) {
      const col = LINE_BY_ID[s[4][0]]?.c ?? "#888";
      L.circleMarker([s[2], s[3]], {
        pane: "metro",
        radius: 3.2,
        color: col,
        weight: 1.6,
        fillColor: "#ffffff",
        fillOpacity: 1,
      })
        .bindTooltip(`${s[0]} ${s[1]} · ${stationLines(s)}`, { direction: "top" })
        .addTo(stationGroup.current);
    }

    districtGroup.current = L.layerGroup();
    for (const g of DISTRICTS) {
      for (const ring of g.r) {
        L.polygon(ring, {
          pane: "basegeo",
          color: "#7b8494",
          weight: 1,
          opacity: 0.55,
          fill: false,
          dashArray: "4 3",
        }).addTo(districtGroup.current);
      }
      L.marker(g.c, {
        pane: "basegeo",
        icon: L.divIcon({ className: "gu-label", html: g.e, iconSize: [70, 14] }),
        interactive: false,
      }).addTo(districtGroup.current);
    }

    pinGroup.current = L.layerGroup().addTo(m);

    m.on("click", (e: L.LeafletMouseEvent) => {
      const { pickMode, onPick, onBackgroundClick } = latest.current;
      if (pickMode) {
        onPick(e.latlng.lat, e.latlng.lng);
        return;
      }
      // Leaflet no propaga el clic de un marcador al mapa, así que acá sólo llega el fondo.
      onBackgroundClick?.();
    });
    // Las estaciones sólo aparecen de cerca: a nivel ciudad son 644 puntos de ruido.
    m.on("zoomend", () => syncStations(m));

    map.current = m;
    if (latest.current.focusRef) {
      latest.current.focusRef.current = (lat, lng, zoom) =>
        m.setView([lat, lng], zoom ?? Math.max(m.getZoom(), 15));
    }
    setTimeout(() => m.invalidateSize(), 200);

    // El mapa se rompe si el contenedor cambia de tamaño sin avisarle: al rotar el teléfono,
    // al abrir el formulario, al pasar de una pestaña a otra.
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(holder.current!);

    return () => {
      ro.disconnect();
      if (latest.current.focusRef) latest.current.focusRef.current = null;
      m.remove();
      map.current = null;
    };
  }, []);

  function syncStations(m: L.Map) {
    const g = stationGroup.current;
    if (!g) return;
    const wanted = latest.current.showMetro && m.getZoom() >= 13;
    if (wanted && !m.hasLayer(g)) g.addTo(m);
    if (!wanted && m.hasLayer(g)) m.removeLayer(g);
  }

  // --- capa base -----------------------------------------------------------
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    if (baseLayer.current) {
      m.removeLayer(baseLayer.current);
      baseLayer.current = null;
    }
    if (vectorGroup.current && m.hasLayer(vectorGroup.current)) m.removeLayer(vectorGroup.current);

    if (props.base === "vector") {
      vectorGroup.current?.addTo(m);
      return;
    }

    const cfg = BASES[props.base];
    const layer = L.tileLayer(cfg.url, cfg.opts);
    // Si los mosaicos no llegan —sin señal, o servidor caído— se dibuja Seúl con la geometría
    // que viaja dentro de la app. El mapa nunca queda en blanco.
    let failures = 0;
    layer.on("tileerror", () => {
      if (++failures > 8 && vectorGroup.current && !m.hasLayer(vectorGroup.current)) {
        vectorGroup.current.addTo(m);
      }
    });
    layer.addTo(m);
    layer.bringToBack();
    baseLayer.current = layer;
  }, [props.base]);

  // --- capas de trenes y distritos ----------------------------------------
  useEffect(() => {
    const m = map.current;
    if (!m || !metroGroup.current) return;
    if (props.showMetro) metroGroup.current.addTo(m);
    else if (m.hasLayer(metroGroup.current)) m.removeLayer(metroGroup.current);
    syncStations(m);
  }, [props.showMetro]);

  useEffect(() => {
    const m = map.current;
    const g = districtGroup.current;
    if (!m || !g) return;
    if (props.showDistricts && !m.hasLayer(g)) g.addTo(m);
    if (!props.showDistricts && m.hasLayer(g)) m.removeLayer(g);
  }, [props.showDistricts]);

  // --- marcadores ----------------------------------------------------------
  useEffect(() => {
    const m = map.current;
    const group = pinGroup.current;
    if (!m || !group) return;

    group.clearLayers();
    pins.current.clear();

    for (const p of props.places) {
      const cat = CATEGORY_BY_ID.get(p.c) ?? props.categories.find((c) => c.id === p.c);
      const done = props.doneIds.has(p.id);
      const selected = props.selectedId === p.id;
      const size = selected ? 30 : 24;

      const marker = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: `vs-pin${done ? " is-done" : ""}${selected ? " is-selected" : ""}`,
          html: `<span style="background:${cat?.color ?? "#868e96"}">${cat?.icon ?? "📍"}</span>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
        title: p.n,
      });

      marker.on("click", () => latest.current.onSelect(p.id));
      marker.addTo(group);
      pins.current.set(p.id, marker);
    }
  }, [props.places, props.categories, props.doneIds, props.selectedId]);

  // --- encuadre al cambiar de filtro --------------------------------------
  useEffect(() => {
    const m = map.current;
    if (!m || !props.places.length) return;
    m.fitBounds(L.latLngBounds(props.places.map((p) => [p.lat, p.lng] as [number, number])), {
      padding: [30, 30],
      maxZoom: 14,
    });
  }, [props.fitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- selección -----------------------------------------------------------
  useEffect(() => {
    const m = map.current;
    if (!m || !props.selectedId) return;
    const p = props.places.find((x) => x.id === props.selectedId);
    if (!p) return;

    // La zona realmente visible del mapa es la que la ficha breve no tapa. Se mide en el momento,
    // que es cuando el dato existe y es exacto: la hoja va fija abajo en el teléfono y dentro de
    // la columna del mapa en pantallas anchas, así que cuánto tapa depende del desplazamiento.
    const tamaño = m.getSize();
    const hoja = document.querySelector<HTMLElement>("[data-hoja]");
    const rectMapa = m.getContainer().getBoundingClientRect();
    const tapa = hoja ? Math.max(0, rectMapa.bottom - hoja.getBoundingClientRect().top) : 0;
    const altoVisible = Math.max(120, tamaño.y - tapa);
    const punto = m.latLngToContainerPoint([p.lat, p.lng]);
    const margen = 28;
    const tapado =
      punto.y > altoVisible - margen || punto.y < margen || punto.x < margen || punto.x > tamaño.x - margen;

    if (tapado) {
      // Se corre el mapa lo justo para dejar el punto en el centro de lo que se ve.
      m.panBy(punto.subtract(L.point(tamaño.x / 2, altoVisible / 2)), { animate: true });
    }
  }, [props.selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- tu posición ---------------------------------------------------------
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const me = props.me;

    if (!me) {
      if (meMarker.current) m.removeLayer(meMarker.current);
      if (meCircle.current) m.removeLayer(meCircle.current);
      meMarker.current = null;
      meCircle.current = null;
      return;
    }

    if (!meMarker.current) {
      meCircle.current = L.circle([me.lat, me.lng], {
        pane: "me",
        radius: me.acc ?? 0,
        color: "#1f6feb",
        weight: 1,
        opacity: 0.35,
        fillColor: "#1f6feb",
        fillOpacity: 0.1,
        interactive: false,
      }).addTo(m);
      meMarker.current = L.circleMarker([me.lat, me.lng], {
        pane: "me",
        radius: 7,
        color: "#ffffff",
        weight: 3,
        fillColor: "#1f6feb",
        fillOpacity: 1,
        // Explícito además del pointerEvents del panel: nada depende de tocar tu propio punto,
        // y su rótulo sólo tapaba lo que sí importa tocar.
        interactive: false,
      }).addTo(m);
    } else {
      meMarker.current.setLatLng([me.lat, me.lng]);
      meCircle.current?.setLatLng([me.lat, me.lng]).setRadius(me.acc ?? 0);
    }
  }, [props.me]);

  // --- cursor de "tocá el mapa" -------------------------------------------
  useEffect(() => {
    const el = map.current?.getContainer();
    if (el) el.style.cursor = props.pickMode ? "crosshair" : "";
  }, [props.pickMode]);

  return <div ref={holder} className="h-full w-full rounded-xl border border-line" />;
}
