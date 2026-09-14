"use client";

import { useEffect } from "react";

/**
 * Registra el service worker.
 *
 * Es lo que hace que la app abra sin señal: bajo tierra, en el subte, o con los datos agotados
 * el último día del viaje.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sin service worker la app sigue funcionando: pierde el modo sin conexión, nada más.
    });
  }, []);
  return null;
}
