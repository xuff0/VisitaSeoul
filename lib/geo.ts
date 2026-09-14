import { STATIONS, LINE_BY_ID, type Station } from "@/lib/data/metro";

export type LatLng = { lat: number; lng: number };

/** Caja que cuenta como "Seúl" para clasificar un punto nuevo entre ciudad y alrededores. */
const SEOUL_BOX = { latMin: 37.42, latMax: 37.7, lngMin: 126.76, lngMax: 127.19 };

export function isInSeoul(lat: number, lng: number): boolean {
  return (
    lat > SEOUL_BOX.latMin && lat < SEOUL_BOX.latMax &&
    lng > SEOUL_BOX.lngMin && lng < SEOUL_BOX.lngMax
  );
}

/** Distancia en kilómetros por la fórmula del haversine. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export type NearestStation = { station: Station; km: number };

/**
 * Estación de tren más cercana a un punto.
 *
 * El descarte por caja antes del haversine no es un adorno: son 644 estaciones por cada uno de los
 * 134 lugares en cada render, y comparar dos restas es mucho más barato que calcular un seno.
 */
export function nearestStation(lat: number, lng: number): NearestStation | null {
  let best: Station | null = null;
  let bestKm = Infinity;
  for (const s of STATIONS) {
    if (Math.abs(s[2] - lat) + Math.abs(s[3] - lng) > 0.06) continue;
    const km = distanceKm(lat, lng, s[2], s[3]);
    if (km < bestKm) {
      bestKm = km;
      best = s;
    }
  }
  return best ? { station: best, km: bestKm } : null;
}

/** Nombres en español de las líneas que sirven una estación, para leer de un vistazo. */
export function stationLines(s: Station): string {
  return s[4].map((id) => LINE_BY_ID[id]?.es ?? "").filter(Boolean).join(", ");
}

/**
 * Saca coordenadas de lo que sea que hayas pegado: un enlace de Google Maps, un par suelto de
 * números, una URL con parámetros. Portado del archivo original, que ya había aprendido los
 * formatos raros a fuerza de usarlo.
 */
export function parseCoords(input: string): LatLng | null {
  const s = (input ?? "").trim();
  if (!s) return null;

  // .../@37.5665,126.9780,17z — el formato de la barra de direcciones
  let m = s.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (m) return { lat: +m[1], lng: +m[2] };

  // !3d37.5665!4d126.9780 — el que aparece en los enlaces de una ficha de lugar
  m = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m) return { lat: +m[1], lng: +m[2] };

  // ?q=37.5665,126.9780 y sus primos
  m = s.match(/[?&](?:q|query|ll|center|daddr|destination)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i);
  if (m) return { lat: +m[1], lng: +m[2] };

  // Un par suelto: "37.5665, 126.9780". Si cae en el rango de Corea se acepta derecho; si no,
  // se acepta igual mientras sea un par de coordenadas válido del mundo.
  m = s.match(/(-?\d{1,2}\.\d{3,})\s*[,\s]\s*(-?\d{1,3}\.\d{3,})/);
  if (m) {
    const lat = +m[1];
    const lng = +m[2];
    if (lat >= 32 && lat <= 40 && lng >= 123 && lng <= 133) return { lat, lng };
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  return null;
}

/** Rescata el nombre del lugar de un enlace /maps/place/... para no hacerte teclearlo. */
export function nameFromUrl(url: string): string {
  const m = (url ?? "").match(/\/maps\/place\/([^/@?]+)/);
  if (!m) return "";
  try {
    return decodeURIComponent(m[1].replace(/\+/g, " "));
  } catch {
    return "";
  }
}
