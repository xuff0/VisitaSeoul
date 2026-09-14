import { CATEGORY_BY_ID } from "@/lib/data/places";
import { naverWebUrl } from "@/lib/naver";
import type { Place } from "@/lib/types";

/**
 * Exportadores a formatos que abren en otras apps.
 *
 * Un respaldo JSON que sólo entiende esta app no sirve de nada parado en la calle. GeoJSON y CSV
 * entran a Google My Maps, el GPX entra a Organic Maps y a los relojes, y el KML conserva los
 * colores por categoría.
 */

const label = (p: Place) => CATEGORY_BY_ID.get(p.c)?.label ?? p.c;
const color = (p: Place) => CATEGORY_BY_ID.get(p.c)?.color ?? "#868e96";

/** Escapa texto para XML. Sin esto, un "&" en un nombre rompe el archivo entero. */
function xml(s: string | undefined | null): string {
  return String(s ?? "").replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );
}

export function toGeoJSON(places: Place[]): string {
  return JSON.stringify(
    {
      type: "FeatureCollection",
      features: places.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          name: p.n,
          name_ko: p.k,
          category: label(p),
          category_id: p.c,
          district: p.d,
          zone: p.z,
          note: p.t ?? "",
          hours: p.hours ?? "",
          naver: naverWebUrl({ name: p.n, nameKo: p.k }),
          "marker-color": color(p),
        },
      })),
    },
    null,
    2,
  );
}

/** KML con una carpeta por categoría: así Google My Maps las muestra como capas separadas. */
export function toKML(places: Place[]): string {
  const groups = new Map<string, Place[]>();
  for (const p of places) {
    const key = String(p.c);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const styles = [...groups.keys()]
    .map((cat) => {
      const hex = (CATEGORY_BY_ID.get(cat)?.color ?? "#868e96").replace("#", "");
      // KML usa aabbggrr, al revés que el rrggbb de la web.
      const abgr = `ff${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}`;
      return `  <Style id="cat-${xml(cat)}"><IconStyle><color>${abgr}</color><scale>1.1</scale></IconStyle></Style>`;
    })
    .join("\n");

  const folders = [...groups.entries()]
    .map(([cat, list]) => {
      const marks = list
        .map(
          (p) => `      <Placemark>
        <name>${xml(p.n)}</name>
        <description>${xml([p.k, p.d, p.t, p.hours].filter(Boolean).join(" · "))}</description>
        <styleUrl>#cat-${xml(cat)}</styleUrl>
        <Point><coordinates>${p.lng},${p.lat},0</coordinates></Point>
      </Placemark>`,
        )
        .join("\n");
      return `    <Folder>\n      <name>${xml(CATEGORY_BY_ID.get(cat)?.label ?? cat)}</name>\n${marks}\n    </Folder>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Seúl — mis sitios</name>
${styles}
${folders}
  </Document>
</kml>`;
}

export function toGPX(places: Place[]): string {
  const pts = places
    .map(
      (p) => `  <wpt lat="${p.lat}" lon="${p.lng}">
    <name>${xml(p.n)}</name>
    <desc>${xml([p.k, label(p), p.d, p.t].filter(Boolean).join(" · "))}</desc>
    <type>${xml(label(p))}</type>
  </wpt>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="visitaseoul" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Seúl — mis sitios</name></metadata>
${pts}
</gpx>`;
}

/**
 * CSV con BOM. Sin el BOM, Excel en Windows abre el coreano como caracteres rotos, y todo el
 * trabajo de llevar los nombres en hangul se pierde justo donde más se necesita.
 */
export function toCSV(places: Place[]): string {
  const cell = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["nombre", "coreano", "categoria", "barrio", "zona", "lat", "lng", "nota", "horario", "naver"];
  const rows = places.map((p) =>
    [p.n, p.k, label(p), p.d, p.z, p.lat, p.lng, p.t ?? "", p.hours ?? "", naverWebUrl({ name: p.n, nameKo: p.k })]
      .map(cell)
      .join(","),
  );
  return "﻿" + [head.join(","), ...rows].join("\n");
}

export type ExportFormat = "geojson" | "kml" | "gpx" | "csv";

export const EXPORT_FORMATS: { id: ExportFormat; label: string; ext: string; mime: string; hint: string }[] = [
  { id: "geojson", label: "GeoJSON", ext: "geojson", mime: "application/geo+json", hint: "Estándar. Entra en Google My Maps y en QGIS" },
  { id: "kml", label: "KML", ext: "kml", mime: "application/vnd.google-earth.kml+xml", hint: "Carpetas y colores por categoría. Google Earth y My Maps" },
  { id: "gpx", label: "GPX", ext: "gpx", mime: "application/gpx+xml", hint: "Waypoints. Organic Maps, Garmin, relojes" },
  { id: "csv", label: "CSV", ext: "csv", mime: "text/csv;charset=utf-8", hint: "Planilla. Excel y Google Sheets, con el coreano intacto" },
];

export function serialize(format: ExportFormat, places: Place[]): string {
  switch (format) {
    case "geojson": return toGeoJSON(places);
    case "kml": return toKML(places);
    case "gpx": return toGPX(places);
    case "csv": return toCSV(places);
  }
}

/** Dispara la descarga. Devuelve false si el navegador la bloquea, para poder ofrecer copiar. */
export function download(filename: string, mime: string, content: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}
