process.env.SERWIST_SUPPRESS_TURBOPACK_WARNING = "1";

import withSerwistInit from "@serwist/next";

/**
 * Identificador del build. Sirve para invalidar el precache de las rutas: sin él, una versión
 * nueva de la app no reemplazaría el HTML guardado.
 */
const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now());

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // En desarrollo el service worker sólo estorba: cachea el shell y tapa los cambios.
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false,
  /**
   * Las tres rutas se precachean a mano.
   *
   * El manifiesto que arma Serwist trae los assets de Next, pero no el HTML de las páginas, así
   * que sin esto sólo funcionaría sin señal la pantalla que ya hubieras abierto. Bajo tierra eso
   * no alcanza: querés poder pasar del mapa al catálogo de compras aunque hayas entrado directo
   * al mapa.
   */
  additionalPrecacheEntries: [
    { url: "/", revision },
    { url: "/comprar", revision },
    { url: "/viaje", revision },
  ],
});

export default withSerwist({
  reactStrictMode: true,
  typedRoutes: true,
});
