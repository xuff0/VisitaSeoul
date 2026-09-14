import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

/**
 * Service worker.
 *
 * Precachea la aplicación entera —incluida la red de trenes y los 141 lugares, que viajan en el
 * bundle— y guarda además los mosaicos del mapa que ya miraste.
 *
 * Lo que NO hace: descargar Seúl entero por adelantado. La política de uso de los mosaicos de
 * OpenStreetMap no permite la descarga masiva, y además llenaría el teléfono. Se guarda lo que
 * pasó por pantalla, con un tope, que es justo lo que vas a querer volver a ver sin señal.
 */
const TILE_HOSTS = ["tile.openstreetmap.org", "server.arcgisonline.com"];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => TILE_HOSTS.includes(url.hostname),
      handler: new CacheFirst({
        cacheName: "mosaicos-mapa",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 800,
            maxAgeSeconds: 30 * 24 * 60 * 60,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // El defaultCache de Serwist atiende /api/ con NetworkFirst y queda ordenado antes que estas
    // reglas, así que no se puede desplazar desde acá. Se deja como está a propósito: la clave de
    // caché incluye el enlace corto completo, de modo que un acierto sólo puede devolver el punto
    // que ese mismo enlace ya tenía, y únicamente cuando la red falla. Nunca el de otro lugar.
    ...defaultCache,
  ],
});

serwist.addEventListeners();
