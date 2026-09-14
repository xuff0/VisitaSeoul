"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Position = { lat: number; lng: number; acc?: number | null };
export type GeoStatus = "idle" | "buscando" | "vivo" | "manual" | "error";

export type GeoError = {
  /** Qué pasó, para poder ofrecer la salida correcta y no un mensaje genérico. */
  kind: "denegado" | "sin-senal" | "timeout" | "no-soportado" | "inseguro";
  message: string;
};

/**
 * Ubicación del usuario.
 *
 * El navegador sólo entrega la posición en páginas https, y el permiso se puede denegar o no
 * llegar nunca bajo tierra. Por eso este hook no se limita a pedirla: distingue cada falla y deja
 * dos salidas manuales —marcar el punto en el mapa o pegar coordenadas— que en el subte de Seúl
 * son la diferencia entre una app que sirve y una que no.
 */
export function useGeolocation() {
  const [position, setPosition] = useState<Position | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [error, setError] = useState<GeoError | null>(null);
  const watchId = useRef<number | null>(null);
  const firstFix = useRef(true);
  const onFirstFix = useRef<((p: Position) => void) | null>(null);

  const stopWatch = useCallback(() => {
    if (watchId.current != null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
  }, []);

  useEffect(() => stopWatch, [stopWatch]);

  const start = useCallback(
    (onFix?: (p: Position) => void) => {
      setError(null);
      onFirstFix.current = onFix ?? null;

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setStatus("error");
        setError({ kind: "no-soportado", message: "Este navegador no entrega la ubicación." });
        return;
      }
      // Sin https el navegador ni siquiera pregunta: falla en silencio, que es peor.
      if (window.isSecureContext === false) {
        setStatus("error");
        setError({
          kind: "inseguro",
          message:
            "El navegador sólo comparte la ubicación en páginas https. Abrí el sitio desde su dirección publicada, o marcá tu posición a mano.",
        });
        return;
      }

      setStatus("buscando");
      firstFix.current = true;
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const next = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            acc: pos.coords.accuracy,
          };
          setPosition(next);
          setStatus("vivo");
          if (firstFix.current) {
            firstFix.current = false;
            onFirstFix.current?.(next);
          }
        },
        (err) => {
          stopWatch();
          setStatus("error");
          if (err.code === err.PERMISSION_DENIED) {
            setError({
              kind: "denegado",
              message:
                "El permiso de ubicación está denegado para esta página. Habilitalo en el candado de la barra de direcciones, o usá una de las dos salidas de abajo.",
            });
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            setError({
              kind: "sin-senal",
              message: "El teléfono no consigue señal de ubicación ahora. Probá al aire libre, o marcá tu punto a mano.",
            });
          } else {
            setError({ kind: "timeout", message: "La ubicación tardó demasiado." });
          }
        },
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
      );
    },
    [stopWatch],
  );

  /** Posición marcada a mano: tocando el mapa o pegando coordenadas de Google Maps. */
  const setManual = useCallback(
    (lat: number, lng: number) => {
      stopWatch();
      setPosition({ lat, lng, acc: null });
      setStatus("manual");
      setError(null);
    },
    [stopWatch],
  );

  const clear = useCallback(() => {
    stopWatch();
    setPosition(null);
    setStatus("idle");
    setError(null);
  }, [stopWatch]);

  return { position, status, error, start, setManual, clear, isLive: status === "vivo" };
}
