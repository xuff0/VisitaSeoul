import type { LatLng } from "@/lib/geo";

/**
 * Enlaces a Naver Maps.
 *
 * En Corea, Google Maps no da indicaciones de tránsito ni conoce la mitad de los locales: la
 * navegación real pasa por Naver. Los formatos de abajo están tomados de la documentación de
 * URL Scheme de NAVER Cloud Platform.
 *
 * La web siempre funciona; el esquema `nmap://` sólo si la app está instalada. Por eso toda
 * apertura en app tiene su caída a web, nunca al vacío.
 */

/** Identificador que Naver pide para saber quién lo invoca. */
const APP_NAME = "com.visitaseoul.app";

export type NaverTarget = {
  name: string;
  /** Nombre coreano. Es el que encuentra el local; el nombre en español casi nunca. */
  nameKo?: string;
  lat: number;
  lng: number;
};

/** La consulta que mejor encuentra el lugar: el coreano si existe, si no el nombre. */
export function searchQuery(t: Pick<NaverTarget, "name" | "nameKo">): string {
  return t.nameKo?.trim() ? t.nameKo.trim() : t.name;
}

/** Búsqueda en el mapa web de Naver. Es el enlace que siempre abre, en cualquier dispositivo. */
export function naverWebUrl(t: Pick<NaverTarget, "name" | "nameKo">): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(searchQuery(t))}`;
}

/** Marcador exacto en la app de Naver. */
export function nmapPlaceUrl(t: NaverTarget): string {
  const q = new URLSearchParams({
    lat: String(t.lat),
    lng: String(t.lng),
    name: searchQuery(t),
    appname: APP_NAME,
  });
  return `nmap://place?${q}`;
}

/** Ruta en transporte público, desde donde estés hasta el lugar. */
export function nmapTransitRouteUrl(from: LatLng, to: NaverTarget, fromName = "Mi ubicación"): string {
  const q = new URLSearchParams({
    slat: String(from.lat),
    slng: String(from.lng),
    sname: fromName,
    dlat: String(to.lat),
    dlng: String(to.lng),
    dname: searchQuery(to),
    appname: APP_NAME,
  });
  return `nmap://route/public?${q}`;
}

/**
 * Envoltura `intent://` de Android: si la app de Naver está instalada abre ahí, y si no, el
 * navegador manda a la tienda en vez de quedarse en una página en blanco.
 */
export function androidIntentUrl(nmapUrl: string): string {
  const rest = nmapUrl.replace(/^nmap:\/\//, "");
  return (
    `intent://${rest}#Intent;scheme=nmap;action=android.intent.action.VIEW;` +
    `category=android.intent.category.BROWSABLE;package=com.nhn.android.nmap;end`
  );
}

/** Búsqueda en Naver Shopping: devuelve el precio más bajo vigente entre todos los vendedores. */
export function naverShoppingUrl(queryKo: string): string {
  return `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(queryKo)}`;
}

export function googleMapsUrl(t: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${t.lat},${t.lng}`;
}

/** URI `geo:` estándar, para pegar en cualquier otra app de mapas. */
export function geoUri(t: NaverTarget): string {
  return `geo:${t.lat},${t.lng}?q=${t.lat},${t.lng}(${encodeURIComponent(searchQuery(t))})`;
}

export function formatCoords(t: LatLng): string {
  return `${t.lat.toFixed(6)}, ${t.lng.toFixed(6)}`;
}

type Platform = "android" | "ios" | "other";

export function detectPlatform(ua = typeof navigator === "undefined" ? "" : navigator.userAgent): Platform {
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "other";
}

/**
 * Abre un enlace `nmap://` intentando la app y cayendo a la web si no aparece.
 *
 * En iOS no hay forma de preguntar si una app está instalada, así que se usa el único indicio
 * disponible: si la app abre, la página se oculta. Si al vencer el plazo la página sigue visible,
 * la app no estaba y se abre la web.
 */
export function openInNaverApp(nmapUrl: string, webUrl: string): void {
  const platform = detectPlatform();

  if (platform === "other") {
    window.open(webUrl, "_blank", "noopener");
    return;
  }

  if (platform === "android") {
    window.location.href = androidIntentUrl(nmapUrl);
    return;
  }

  let settled = false;
  const done = () => {
    settled = true;
    document.removeEventListener("visibilitychange", done);
  };
  document.addEventListener("visibilitychange", done);

  const timer = window.setTimeout(() => {
    if (!settled && !document.hidden) window.location.href = webUrl;
    done();
  }, 1500);

  window.location.href = nmapUrl;
  window.addEventListener("pagehide", () => {
    window.clearTimeout(timer);
    done();
  }, { once: true });
}
